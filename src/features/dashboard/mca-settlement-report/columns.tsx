import { type Column } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CopyableCell } from "@/components/common/CopyableCell";
import type { SettlementRow } from "@/features/dashboard/mca-settlement-report/types";

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
export const SETTLEMENT_LOCKED_COLUMN = "date";

export function settlementColumnDefs(showMerchantId: boolean): { key: string; label: string }[] {
  return [
    // The date leads and stays put: it IS the settlement's identity now that
    // settlements have no id, so a row with it hidden or buried mid-table
    // cannot be read. Pinned via SETTLEMENT_LOCKED_COLUMN, which the caller
    // hands to ReorderColumnsPopover as fixedKeys.
    { key: "date", label: "Date" },
    { key: "amount", label: "Amount" },
    { key: "transactionCount", label: "Transactions" },
    ...(showMerchantId ? [{ key: "merchantId", label: "Merchant ID" }] : []),
  ];
}

export function settlementColumnOrder(showMerchantId: boolean): string[] {
  return settlementColumnDefs(showMerchantId).map((d) => d.key);
}

/**
 * Plain cells. Opening the drawer is the ROW's job, not a cell's: the table is
 * given `onRowClick`, which puts the handler on the `<tr>` itself, so the whole
 * row — cell padding and the gaps between columns included — is the target. No
 * per-cell wrapper, and nothing here has to know what a click does.
 */
function buildColumn(key: string): Column<SettlementRow> | null {
  switch (key) {
    case "merchantId":
      return {
        key: "merchantId",
        header: "Merchant ID",
        minWidth: 170,
        // The copy control inside is a <button>, which DataTable's row click
        // skips by default, so copying an id does not also open the drawer.
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
        // Left-aligned with the currency code beside the figure, matching the
        // MCA transactions table exactly. The code is not redundant even though
        // every settlement is INR: it is what tells the merchant these are
        // rupees, after a table of USD/EUR/CAD remittances led them here.
        // Locale stays the default en-IN, so a crore-scale figure keeps its
        // lakh grouping rather than switching to the transactions' en-US.
        align: "left",
        render: (row) => (
          <span className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[13px] font-semibold text-foreground tabular-nums">
              {formatCurrency(row.amount, row.currency)}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
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
  hiddenColumns?: string[];
  /** Whether the account has more than one PACB MID — see settlementColumnDefs. */
  showMerchantId?: boolean;
}

export function buildSettlementColumns({
  columnOrder,
  hiddenColumns,
  showMerchantId = false,
}: BuildSettlementColumnsOptions): Column<SettlementRow>[] {
  const cols: Column<SettlementRow>[] = [];
  const order = columnOrder ?? settlementColumnOrder(showMerchantId);

  for (const key of order) {
    if (key === "merchantId" && !showMerchantId) continue;
    // The locked column is never hideable, whatever a stale persisted set says.
    if (key !== SETTLEMENT_LOCKED_COLUMN && hiddenColumns?.includes(key)) continue;
    const col = buildColumn(key);
    if (col) cols.push(col);
  }

  // Blank trailing column, reserving room at the right edge so the hover-
  // revealed Download action never overlaps the last column's text.
  cols.push({
    key: "rowActionSpace",
    header: "",
    minWidth: 140,
    render: () => null,
  });

  return cols;
}
