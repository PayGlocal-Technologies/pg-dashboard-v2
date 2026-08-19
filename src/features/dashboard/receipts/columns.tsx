"use client";

import {
  Button,
  type Column,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableCell } from "@/components/common/CopyableCell";
import { CountryCell } from "@/features/dashboard/mca-transactions/columns";
import { formatReceiptAmount, formatReceiptMonth } from "@/features/dashboard/receipts/utils";
import { RECEIPT_MONTH_HINT, RECEIPT_PRODUCT_LABEL } from "@/features/dashboard/receipts/constants";
import type { Receipt, ReceiptProduct } from "@/features/dashboard/receipts/types";

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

// ── Column definitions ───────────────────────────────────────────────────────
// Widths, typography (text-[13px] body, muted secondary text) and alignment
// conventions mirror buildSkuColumns and buildMcaLinkColumns, so every table in
// the product reads as one system.
//
// Order is fixed: Invoice number identifies the receipt and leads, Invoice ID and
// Amount follow it, and the Download action closes the row with Product type
// immediately before it. Country sits between Amount and Month, and only on the
// MCA tab — an MCA merchant holds a separate local receiving account per country,
// so a month produces one receipt per account and the country is what tells them
// apart. It's built by spreading a one-or-zero-length array (the same shape
// buildSkuColumns uses for its optional MID column) rather than rendering a
// column of dashes, so the other two tabs have no Country column at all instead
// of an empty one.
export function buildReceiptColumns(
  product: ReceiptProduct,
  onDownload: (row: Receipt) => void
): Column<Receipt>[] {
  return [
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
    ...(product === "MCA"
      ? [
          {
            key: "remitterCountry",
            header: "Country",
            minWidth: 170,
            // min-w-max inside CountryCell is what grows this column, so its
            // content must never be clipped by compact density's overflow-hidden.
            cellClassName: "overflow-visible",
            render: (row: Receipt) => <CountryCell iso2={row.remitterCountry} />,
          } satisfies Column<Receipt>,
        ]
      : []),
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
    {
      key: "download",
      header: "Download",
      minWidth: 145,
      render: (row) => (
        // A real column, not DataTable's `rowAction` slot: that slot only fades
        // in on row hover, and a receipt's download has to be visible and
        // tappable without one.
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="download" className="h-3 w-3" />}
          onClick={() => onDownload(row)}
          className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
        >
          Download
        </Button>
      ),
    },
  ];
}
