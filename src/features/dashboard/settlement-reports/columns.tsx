import {
  Button,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatDayMonth, formatWeekdayName } from "@/lib/utils/format";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CopyableCell } from "@/components/common/CopyableCell";
import { mockPaSettlementView } from "@/features/dashboard/settlement-reports/mock-data";
import { SettlementBreakupRow } from "@/features/dashboard/settlement-reports/components/SettlementStatCards";
import type {
  SettlementRow,
  SettlementStatus,
} from "@/features/dashboard/settlement-reports/types";

/** Processing reads as in flight, Settled as done: the same chip vocabulary
 *  as the transactions tables. */
export const SETTLEMENT_STATUS_META: Record<
  SettlementStatus,
  { label: string; variant: "warning" | "success"; trailIcon: "clock" | "check" }
> = {
  PROCESSING: { label: "Processing", variant: "warning", trailIcon: "clock" },
  SETTLED: { label: "Settled", variant: "success", trailIcon: "check" },
};

const dash = <span className="text-[13px] text-muted-foreground">—</span>;

/**
 * The info icon beside a settlement's amount: hover or focus it for the
 * breakup (gross, deductions, net), as on the previous-settled card. MOCK:
 * the breakup comes from mockPaSettlementView, so it shows only on rows that
 * carry a settlement id (the Payments design's mock rows).
 */
function AmountBreakup({ row }: { row: SettlementRow }) {
  const view = row.settlementId ? mockPaSettlementView(row) : null;
  if (!view) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Settlement breakup"
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
        >
          <Icon name="info" size={12} />
        </Button>
      </TooltipTrigger>
      {/* The same popup as the Previous settled card's Settlement breakup. */}
      <TooltipContent side="bottom" align="start" className="w-56 space-y-1.5 p-3">
        <SettlementBreakupRow
          label="Gross amount"
          value={formatCurrency(view.grossAmount, "INR")}
        />
        <SettlementBreakupRow label="Tax" value={`−${formatCurrency(view.gst, "INR")}`} />
        <SettlementBreakupRow label="Fee" value={`−${formatCurrency(view.platformFee, "INR")}`} />
        <div className="border-t border-border pt-1.5">
          <SettlementBreakupRow
            label="Net amount"
            value={formatCurrency(row.amount, "INR")}
            emphasis
          />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * A Processing payout's UTR: the bank issues it only once the money goes out,
 * so it reads "Not generated yet", with the settlement date on the info icon.
 * Shared by the table and the settlement details.
 */
export function UtrNotGenerated({ settlementDate }: { settlementDate: string }) {
  const when = `${formatWeekdayName(settlementDate)}, ${formatDayMonth(settlementDate)}`;
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
      Not generated yet
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label={`UTR is generated with the next settlement on ${when}`}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
          >
            <Icon name="info" size={12} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-56 text-xs">
          Generated with the next settlement on {when}.
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

// Every reorderable/hideable data column lives here, keyed so
// ColumnManager can
// toggle visibility and reorder independently of the trailing rowAction
// space, which isn't a real column.
/**
 * No "Settlement ID" column: settlements are keyed by date, so an id column
 * would have repeated the Date column beside it. No "Status" or "UTR Number"
 * either — the settlement APIs carry neither, and a settlement only appears in
 * the list once it has happened, so there is no state to distinguish.
 *
 * Merchant ID takes the freed slot, and only for an account that actually has
 * more than one PACB MID. For everyone else it is one value repeated down the
 * page, which is why it is dropped outright rather than merely hidden: a hidden
 * column still shows up in the columns menu, inviting someone to turn on a
 * useless one.
 */
export function settlementColumnDefs(
  showMerchantId: boolean,
  /** The Payments "Settlements" design: adds Settlement ID, Status and UTR
   *  Number (mock-only for now, see SettlementRow.settlementId). */
  withPayoutDetails = false
): { key: string; label: string }[] {
  // Payments: amount and its state first, then how to trace it (UTR), what
  // it covers, its own ID, and when.
  if (withPayoutDetails) {
    return [
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
      { key: "utr", label: "UTR Number" },
      { key: "transactionCount", label: "Transactions" },
      ...(showMerchantId ? [{ key: "merchantId", label: "Merchant ID" }] : []),
      { key: "settlementId", label: "Settlement ID" },
      { key: "date", label: "Date & Time" },
    ];
  }
  return [
    { key: "amount", label: "Amount" },
    { key: "transactionCount", label: "Transactions" },
    ...(showMerchantId ? [{ key: "merchantId", label: "Merchant ID" }] : []),
    { key: "date", label: "Date" },
  ];
}

export function settlementColumnOrder(
  showMerchantId: boolean,
  withPayoutDetails = false
): string[] {
  return settlementColumnDefs(showMerchantId, withPayoutDetails).map((d) => d.key);
}

function buildColumn(key: string, withPayoutDetails = false): Column<SettlementRow> | null {
  switch (key) {
    case "merchantId":
      return {
        key: "merchantId",
        header: "Merchant ID",
        minWidth: 170,
        render: (row) =>
          row.merchantId ? (
            <CopyableCell
              value={row.merchantId}
              copyValue={row.merchantId}
              label="Merchant ID"
              monospace
              className="text-primary/80 transition-colors hover:text-primary"
            />
          ) : (
            <span className="text-[13px] text-muted-foreground">—</span>
          ),
      };
    case "settlementId":
      return {
        key: "settlementId",
        header: "Settlement ID",
        minWidth: 150,
        render: (row) =>
          row.settlementId ? (
            <CopyableCell
              value={row.settlementId}
              copyValue={row.settlementId}
              label="Settlement ID"
              monospace
              className="text-[13px]"
            />
          ) : (
            dash
          ),
      };
    case "status":
      return {
        key: "status",
        header: "Status",
        minWidth: 130,
        render: (row) => {
          if (!row.status) return dash;
          const meta = SETTLEMENT_STATUS_META[row.status];
          return (
            <StatusBadge
              variant={meta.variant}
              label={meta.label}
              trailIcon={meta.trailIcon}
              size="sm"
            />
          );
        },
      };
    case "utr": {
      return {
        key: "utr",
        header: "UTR Number",
        minWidth: 170,
        render: (row) => {
          const utr = row.utrNumbers?.[0];
          // A payout gets its UTR from the bank once it has gone out.
          if (!utr) {
            return row.status === "PROCESSING" ? <UtrNotGenerated settlementDate={row.id} /> : dash;
          }
          return (
            <CopyableCell
              value={utr}
              copyValue={utr}
              label="UTR"
              monospace
              className="text-[13px]"
            />
          );
        },
      };
    }
    case "amount":
      return {
        key: "amount",
        header: "Amount",
        minWidth: 140,
        // Leads the Payments row, left-aligned like the Transactions table.
        align: withPayoutDetails ? "left" : "right",
        cellClassName: "pl-5",
        render: (row) => (
          <span className="inline-flex items-center gap-1.5">
            {/* Amount then its currency code, as the Transactions table. */}
            <span className="flex items-baseline gap-1.5">
              <span className="whitespace-nowrap text-[13px] font-semibold text-foreground tabular-nums">
                {formatCurrency(row.amount, row.currency)}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
            </span>
            <AmountBreakup row={row} />
          </span>
        ),
      };
    case "transactionCount":
      return {
        key: "transactionCount",
        header: "Transactions",
        minWidth: 110,
        render: (row) => (
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">
            {row.transactionCount.toLocaleString("en-IN")} txns
          </span>
        ),
      };
    case "date":
      return {
        key: "date",
        header: withPayoutDetails ? "Date & Time" : "Date",
        minWidth: 150,
        render: (row) => (
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">
            {formatDate(row.date)}
          </span>
        ),
      };
    default:
      return null;
  }
}

interface BuildSettlementColumnsOptions {
  columnOrder?: string[];
  hiddenColumns?: Set<string>;
  /** Whether the account has more than one PACB MID — see settlementColumnDefs. */
  showMerchantId?: boolean;
  /** See settlementColumnDefs. */
  withPayoutDetails?: boolean;
}

export function buildSettlementColumns({
  columnOrder,
  hiddenColumns,
  showMerchantId = false,
  withPayoutDetails = false,
}: BuildSettlementColumnsOptions = {}): Column<SettlementRow>[] {
  const cols: Column<SettlementRow>[] = [];
  const order = columnOrder ?? settlementColumnOrder(showMerchantId, withPayoutDetails);

  for (const key of order) {
    if (key === "merchantId" && !showMerchantId) continue;
    if (!withPayoutDetails && (key === "settlementId" || key === "status" || key === "utr")) {
      continue;
    }
    if (hiddenColumns?.has(key)) continue;
    const col = buildColumn(key, withPayoutDetails);
    if (col) cols.push(col);
  }

  // Blank trailing column, reserves room at the right edge so the hover-
  // revealed "View details" action never overlaps the Date column's text.
  cols.push({
    key: "rowActionSpace",
    header: "",
    minWidth: 140,
    render: () => null,
  });

  return cols;
}
