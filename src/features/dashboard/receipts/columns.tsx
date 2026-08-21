"use client";

import {
  Button,
  type Column,
  IconButton,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableCell } from "@/components/common/CopyableCell";
import { formatReceiptAmount, formatReceiptMonth } from "@/features/dashboard/receipts/utils";
import { RECEIPT_MONTH_HINT, RECEIPT_PRODUCT_LABEL } from "@/features/dashboard/receipts/constants";
import type { Receipt } from "@/features/dashboard/receipts/types";

/**
 * The Month column's heading, with its info tip.
 *
 * The tip explains what a receipt's period actually means — that one row covers a
 * whole month of payments, not a single one — which is a property of the column
 * rather than of any row, so it belongs on the header and appears once.
 *
 * It never changes the table's layout: the glyph is inline in the header cell
 * (which sizes to content within the column's own minWidth, and the widest body
 * cell is the wider of the two anyway), and the tip itself renders in a portal
 * over the page rather than in the flow.
 *
 * The trigger is a real Button rather than a bare span, so the tip is reachable
 * and openable by keyboard instead of hover only. Deliberately Button and not
 * IconButton, which is otherwise the right component for an icon-only control:
 * IconButton sets `title` from its aria-label, and a native title bubble would
 * pop up alongside the Flux tooltip saying the same thing twice. It's sized to
 * 16px so it sits inside the header row's existing height (py-2.5 at compact
 * density) rather than growing it.
 */
function MonthHeader() {
  return (
    <span className="inline-flex items-center gap-1">
      Month
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="What does the month cover?"
              className="h-4 w-4 min-h-0 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <Icon name="info" className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px]">{RECEIPT_MONTH_HINT}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

/**
 * The row's download control.
 *
 * Icon only — the action is unambiguous in a table of receipts, and a labelled
 * button repeated down every row would compete with the data. What it downloads
 * lives in the accessible name instead, which names the product and the month
 * because that pair *is* the receipt (see Receipt's own note): one document for
 * the whole month, never one per transaction inside it. IconButton mirrors that
 * name into a native `title`, so the same sentence is available on hover without
 * a second tooltip being wired up.
 *
 * Rendered through DataTable's `rowAction` slot rather than as a column, see
 * RECEIPT_COLUMNS below.
 */
export function ReceiptDownloadAction({
  row,
  onDownload,
}: {
  row: Receipt;
  onDownload: (row: Receipt) => void;
}) {
  return (
    <IconButton
      aria-label={`Download the ${RECEIPT_PRODUCT_LABEL[row.product]} receipt for ${formatReceiptMonth(row.periodMonth)}`}
      variant="outline"
      size="xs"
      rounded="md"
      onClick={() => onDownload(row)}
    >
      <Icon name="download" className="h-3.5 w-3.5" />
    </IconButton>
  );
}

/**
 * The table's columns — identical in all three tabs.
 *
 * A constant rather than a `build…()` function like its siblings, because there
 * is nothing to build from: no column varies by tab, and the Product type cell
 * reads the product off the row it is drawing. Keeping it a value also gives
 * DataTable a stable `columns` identity across renders.
 *
 * Order is fixed: Invoice number identifies the receipt and leads, Invoice ID and
 * Amount follow it, then the period it covers and the product it belongs to. The
 * download action is deliberately *not* among them — it rides `rowAction`, so it
 * floats pinned to the right edge over the row, takes no column width, never
 * reorders with the data, and stays reachable while the data columns scroll
 * under it.
 *
 * Widths, typography (text-[13px] body, muted secondary text) and alignment
 * mirror buildSkuColumns and buildMcaLinkColumns, so every table in the product
 * reads as one system.
 */
export const RECEIPT_COLUMNS: Column<Receipt>[] = [
  {
    key: "invoiceNumber",
    header: "Invoice number",
    minWidth: 200,
    // Compact density puts overflow-hidden on every cell, which would clip the
    // hover-revealed copy button; cancelled here the same way the MCA table
    // cancels it for its Country cell.
    cellClassName: "overflow-visible",
    render: (row) => <CopyableCell value={row.invoiceNumber} label="Invoice number" monospace />,
  },
  {
    key: "invoiceId",
    header: "Invoice ID",
    minWidth: 165,
    cellClassName: "overflow-visible",
    render: (row) => <CopyableCell value={row.invoiceId} label="Invoice ID" monospace />,
  },
  {
    key: "amount",
    header: "Amount",
    minWidth: 160,
    align: "right",
    render: (row) => (
      <div className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
        <span className="text-[13px] font-semibold tabular-nums text-foreground">
          {formatReceiptAmount(row)}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
      </div>
    ),
  },
  {
    key: "periodMonth",
    header: <MonthHeader />,
    minWidth: 165,
    // The header's info-tip trigger sits proud of the text; compact density
    // would clip its focus ring without this.
    cellClassName: "overflow-visible",
    render: (row) => (
      <span className="text-[13px] whitespace-nowrap text-foreground">
        {formatReceiptMonth(row.periodMonth)}
      </span>
    ),
  },
  {
    key: "product",
    header: "Product type",
    minWidth: 210,
    // Every row in a tab belongs to the same product, so this reads as a label
    // rather than a state: one quiet `muted` chip throughout, not a colour per
    // product. Colour-coding a value that never varies within the view would
    // imply a distinction the column can't actually draw — compare
    // buildSkuColumns, which does vary its variant because Goods and Services
    // rows sit in the same list.
    render: (row) => (
      <StatusBadge variant="muted" label={RECEIPT_PRODUCT_LABEL[row.product]} size="sm" />
    ),
  },
];

/**
 * The columns, with an optional leading Merchant ID column.
 *
 * The receipts list merges rows across every one of the merchant's MIDs (see
 * ReceiptsTable), so a multi-MID merchant with no MID selected needs to see
 * which account each receipt belongs to — mirrors pg-dashboard's
 * `showMerchantId` gate. Single-MID (or a selected MID) hides it: the column
 * would repeat one value down every row.
 */
export function buildReceiptColumns(showMerchantId: boolean): Column<Receipt>[] {
  if (!showMerchantId) return RECEIPT_COLUMNS;
  const merchantIdColumn: Column<Receipt> = {
    key: "merchantId",
    header: "Merchant ID",
    minWidth: 150,
    cellClassName: "overflow-visible",
    render: (row) => <CopyableCell value={row.merchantId ?? ""} label="Merchant ID" monospace />,
  };
  return [merchantIdColumn, ...RECEIPT_COLUMNS];
}
