import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CopyableCell } from "@/components/common/CopyableCell";
import { SettlementUtrCell } from "@/features/dashboard/settlement-reports/components/SettlementUtrCell";
import type {
  SettlementRow,
  SettlementStatus,
} from "@/features/dashboard/settlement-reports/types";

/** "stl_a1b2c3d4" -> "stl_....c3d4", first 4 / last 4 characters. */
function truncateId(value: string): string {
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}....${value.slice(-4)}`;
}

export const SETTLEMENT_STATUS_META: Record<
  SettlementStatus,
  { label: string; variant: BadgeVariant; trailIcon: BadgeTrailIcon }
> = {
  settled: { label: "Settled", variant: "success", trailIcon: "check" },
  processing: { label: "Processing", variant: "warning", trailIcon: "clock" },
  // MCA (PACB) only, see the SettlementStatus doc comment in types.ts.
  sent_for_settlement: { label: "Sent for Settlement", variant: "warning", trailIcon: "clock" },
  mca_settled: { label: "Settled", variant: "info", trailIcon: "arrow-right" },
  firc: { label: "FIRC", variant: "success", trailIcon: "check" },
};

/** Whether a settlement has actually reached its terminal, funds-arrived
 * state, "settled" for Payments, "firc" for MCA (its own "mca_settled" is
 * only halfway there, money has moved to the bank but not to the merchant
 * yet), see the SettlementStatus doc comment in types.ts. */
export function isSettlementComplete(status: SettlementStatus): boolean {
  return status === "settled" || status === "firc";
}

// Every reorderable/hideable data column lives here, keyed so
// TransactionColumnsMenu (reused as-is from the transactions feature) can
// toggle visibility and reorder independently of the trailing rowAction
// space, which isn't a real column.
export const SETTLEMENT_COLUMN_DEFS: { key: string; label: string }[] = [
  { key: "amount", label: "Amount" },
  { key: "transactionCount", label: "Transactions" },
  { key: "utrNumber", label: "UTR Number" },
  { key: "id", label: "Settlement ID" },
  { key: "status", label: "Status" },
  { key: "date", label: "Date" },
];

export const SETTLEMENT_COLUMN_ORDER: string[] = SETTLEMENT_COLUMN_DEFS.map((d) => d.key);

function buildColumn(key: string): Column<SettlementRow> | null {
  switch (key) {
    case "id":
      return {
        key: "id",
        header: "Settlement ID",
        minWidth: 150,
        cellClassName: "pl-5",
        render: (row) => (
          <CopyableCell
            value={truncateId(row.id)}
            copyValue={row.id}
            label="Settlement ID"
            monospace
            className="text-primary/80 transition-colors hover:text-primary"
          />
        ),
      };
    case "amount":
      return {
        key: "amount",
        header: "Amount",
        minWidth: 140,
        align: "right",
        render: (row) => (
          <span className="whitespace-nowrap font-semibold text-foreground tabular-nums">
            {formatCurrency(row.amount, row.currency)}
          </span>
        ),
      };
    case "status":
      return {
        key: "status",
        header: "Status",
        minWidth: 120,
        render: (row) => {
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
    case "utrNumber":
      return {
        key: "utrNumber",
        header: "UTR Number",
        minWidth: 170,
        render: (row) => <SettlementUtrCell row={row} />,
      };
    case "date":
      return {
        key: "date",
        header: "Date",
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
}

export function buildSettlementColumns({
  columnOrder = SETTLEMENT_COLUMN_ORDER,
  hiddenColumns,
}: BuildSettlementColumnsOptions = {}): Column<SettlementRow>[] {
  const cols: Column<SettlementRow>[] = [];

  for (const key of columnOrder) {
    if (hiddenColumns?.has(key)) continue;
    const col = buildColumn(key);
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
