import { type Column } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CopyableCell } from "@/components/common/CopyableCell";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

// Every reorderable/hideable data column lives here, keyed so
// TransactionColumnsMenu (reused as-is from the transactions feature) can
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
export function settlementColumnDefs(showMerchantId: boolean): { key: string; label: string }[] {
  return [
    { key: "amount", label: "Amount" },
    { key: "transactionCount", label: "Transactions" },
    ...(showMerchantId ? [{ key: "merchantId", label: "Merchant ID" }] : []),
    { key: "date", label: "Date" },
  ];
}

export function settlementColumnOrder(showMerchantId: boolean): string[] {
  return settlementColumnDefs(showMerchantId).map((d) => d.key);
}

function buildColumn(key: string): Column<SettlementRow> | null {
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
    case "amount":
      return {
        key: "amount",
        header: "Amount",
        minWidth: 140,
        align: "right",
        cellClassName: "pl-5",
        render: (row) => (
          <span className="whitespace-nowrap font-semibold text-foreground tabular-nums">
            {formatCurrency(row.amount, row.currency)}
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
  /** Whether the account has more than one PACB MID — see settlementColumnDefs. */
  showMerchantId?: boolean;
}

export function buildSettlementColumns({
  columnOrder,
  hiddenColumns,
  showMerchantId = false,
}: BuildSettlementColumnsOptions = {}): Column<SettlementRow>[] {
  const cols: Column<SettlementRow>[] = [];
  const order = columnOrder ?? settlementColumnOrder(showMerchantId);

  for (const key of order) {
    if (key === "merchantId" && !showMerchantId) continue;
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
