import { type Column, StatusBadge } from "@/components/ui";
import { TransactionAmount } from "@/features/dashboard/transactions/components/TransactionAmount";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { PA_STATUS_META, formatDisplayDateTime } from "@/features/dashboard/transactions/paColumns";
import type { DisputeRow } from "@/features/dashboard/dispute-management/types";

// Reuses PA_STATUS_META's DISPUTED/NEEDS_ACTION/UNDER_REVIEW/WON/LOST entries
// as-is, same chip labels/colors as the disputed rows already shown in the
// Transactions table, so a dispute looks identical wherever it appears.
function statusMeta(status: DisputeRow["status"]) {
  return PA_STATUS_META[status]!;
}

// Same single-line "D MMM 'YY, hh:mm AM/PM" format and font/color
// (text-[12px] font-medium text-foreground) as every column in the
// Transactions table, so the two tables read identically.
function DateTimeCell({ value }: { value?: string }) {
  const formatted = formatDisplayDateTime(value);
  return (
    <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
      {formatted ?? "N/A"}
    </span>
  );
}

// Every reorderable/hideable data column, keyed so TransactionColumnsMenu
// (reused as-is from the transactions feature) can toggle visibility and
// reorder independently. "respondBy" is appended separately in
// buildDisputeColumns, only when the active segment needs it.
export const DISPUTE_COLUMN_DEFS: { key: string; label: string }[] = [
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Reason" },
  { key: "paymentMethod", label: "Payment method" },
  { key: "customerEmail", label: "Customer email" },
  { key: "disputedOn", label: "Disputed on" },
];

export const DISPUTE_COLUMN_ORDER: string[] = DISPUTE_COLUMN_DEFS.map((d) => d.key);

function buildColumn(key: string): Column<DisputeRow> | null {
  switch (key) {
    case "amount":
      return {
        key: "amount",
        header: "Amount",
        minWidth: 135,
        // Left-aligned (not "right") and padded to match the toolbar above
        // it, same fix as the Transactions table's Amount column.
        cellClassName: "pl-5",
        render: (row) => <TransactionAmount amount={row.amount} currency={row.currency} />,
      };
    case "status":
      return {
        key: "status",
        header: "Status",
        minWidth: 155,
        render: (row) => {
          const { label, variant, trailIcon } = statusMeta(row.status);
          return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
        },
      };
    case "reason":
      return {
        key: "reason",
        header: "Reason",
        minWidth: 160,
        render: (row) => (
          <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
            {row.reason}
          </span>
        ),
      };
    case "paymentMethod":
      return {
        key: "paymentMethod",
        header: "Payment method",
        minWidth: 145,
        render: (row) => <TransactionPaymentMethod row={row} />,
      };
    case "customerEmail":
      return {
        key: "customerEmail",
        header: "Customer email",
        minWidth: 190,
        render: (row) => (
          <span className="whitespace-nowrap text-[12px] font-medium text-foreground lowercase">
            {row.email}
          </span>
        ),
      };
    case "disputedOn":
      return {
        key: "disputedOn",
        header: "Disputed on",
        minWidth: 130,
        render: (row) => <DateTimeCell value={row.disputedOn} />,
      };
    default:
      return null;
  }
}

interface BuildDisputeColumnsOptions {
  columnOrder?: string[];
  hiddenColumns?: Set<string>;
  /** "Respond by" only makes sense while a dispute still needs a merchant
   * response, so it's added conditionally rather than living in the regular
   * reorderable column set. */
  showRespondBy?: boolean;
}

export function buildDisputeColumns({
  columnOrder = DISPUTE_COLUMN_ORDER,
  hiddenColumns,
  showRespondBy = false,
}: BuildDisputeColumnsOptions = {}): Column<DisputeRow>[] {
  const cols: Column<DisputeRow>[] = [];

  for (const key of columnOrder) {
    if (hiddenColumns?.has(key)) continue;
    const col = buildColumn(key);
    if (col) cols.push(col);
  }

  if (showRespondBy) {
    cols.push({
      key: "respondBy",
      header: "Respond by",
      minWidth: 130,
      render: (row) => <DateTimeCell value={row.respondBy} />,
    });
  }

  return cols;
}
