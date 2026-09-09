import { type Column } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CopyableCell } from "@/components/common/CopyableCell";
import { RowClick } from "@/components/common/table/RowClick";
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
 * Wraps a cell so the whole row opens the details drawer, matching the MCA
 * transactions table where the row itself is the target rather than a button
 * revealed on hover. See RowClick for why the wrapper is needed at all (the
 * cell's padding belongs to DataTable's own <td>).
 */
function buildColumn(
  key: string,
  onOpenDetails: (row: SettlementRow) => void
): Column<SettlementRow> | null {
  const clickable = (row: SettlementRow, content: React.ReactNode, align?: "left" | "right") => (
    <RowClick onClick={() => onOpenDetails(row)} align={align}>
      {content}
    </RowClick>
  );

  switch (key) {
    case "merchantId":
      return {
        key: "merchantId",
        header: "Merchant ID",
        minWidth: 170,
        // The copy control inside stops its own propagation, so copying an id
        // does not also open the drawer.
        render: (row) =>
          clickable(
            row,
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
            )
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
        render: (row) =>
          clickable(
            row,
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
        render: (row) =>
          clickable(
            row,
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
        // No cellClassName padding override here: RowClick below re-creates the
        // cell's own px-3 from the inside so the whole cell is clickable, and a
        // wider pl-5 would leave a dead strip on the left of the first column.
        render: (row) =>
          clickable(
            row,
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
  /** Opens the settlement's drawer. The whole row is the target. */
  onOpenDetails: (row: SettlementRow) => void;
  columnOrder?: string[];
  hiddenColumns?: string[];
  /** Whether the account has more than one PACB MID — see settlementColumnDefs. */
  showMerchantId?: boolean;
}

export function buildSettlementColumns({
  onOpenDetails,
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
    const col = buildColumn(key, onOpenDetails);
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
