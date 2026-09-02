import { type Column, StatusBadge } from "@/components/ui";
import { TransactionAmount } from "@/features/dashboard/transactions/components/TransactionAmount";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { formatDisplayDateTime } from "@/features/dashboard/transactions/paColumns";
import { parseFormattedTimestamp } from "@/features/dashboard/transactions/financial/generateTimeline";
import {
  DISPUTE_PHASE_META,
  DISPUTE_STATUS_META,
} from "@/features/dashboard/transactions/status/disputeStatus";
import type { DisputeRow } from "@/features/dashboard/dispute-management/types";

// Reuses DISPUTE_STATUS_META as-is, same chip labels/colors as the disputed
// rows already shown in the Transactions table, so a dispute looks
// identical wherever it appears.
function statusMeta(status: DisputeRow["status"]) {
  return DISPUTE_STATUS_META[status];
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

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/** Time-remaining countdown for a dispute's own response deadline (status-
 * vocabulary spec §27): a plain date once the deadline is more than 7 days
 * out, "N days left" inside 7 days, switching to "N hours left" inside 24h,
 * "Overdue" once it's passed. `nowMs` is captured once by the caller (see
 * DisputeManagementFeature's own lazy useState(() => Date.now()) initializer,
 * CLAUDE.md's no-Date.now()-during-render rule) rather than read fresh here. */
export function formatRespondByCountdown(value: string | undefined, nowMs: number): string {
  if (!value) return "N/A";
  const deadline = parseFormattedTimestamp(value);
  if (!deadline) return "N/A";
  const diff = deadline - nowMs;
  if (diff <= 0) return "Overdue";
  if (diff < ONE_DAY_MS) {
    const hours = Math.max(1, Math.round(diff / ONE_HOUR_MS));
    return `${hours} hour${hours === 1 ? "" : "s"} left`;
  }
  if (diff < 7 * ONE_DAY_MS) {
    const days = Math.max(1, Math.round(diff / ONE_DAY_MS));
    return `${days} day${days === 1 ? "" : "s"} left`;
  }
  return formatDisplayDateTime(value) ?? "N/A";
}

function DeadlineCell({ value, nowMs }: { value?: string; nowMs: number }) {
  return (
    <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
      {formatRespondByCountdown(value, nowMs)}
    </span>
  );
}

function PhaseCell({ phase }: { phase?: DisputeRow["disputePhase"] }) {
  if (!phase) {
    return <span className="text-[12px] text-muted-foreground">{"–"}</span>;
  }
  return (
    <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
      {DISPUTE_PHASE_META[phase].label}
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
  { key: "disputePhase", label: "Phase" },
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
    case "disputePhase":
      return {
        key: "disputePhase",
        header: "Phase",
        minWidth: 130,
        render: (row) => <PhaseCell phase={row.disputePhase} />,
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
  /** A fixed point in time (see DisputeManagementFeature's own lazy
   * useState(() => Date.now()) initializer), only required when
   * showRespondBy is true, drives the "N days/hours left" countdown. */
  nowMs?: number;
}

export function buildDisputeColumns({
  columnOrder = DISPUTE_COLUMN_ORDER,
  hiddenColumns,
  showRespondBy = false,
  nowMs,
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
      render: (row) => <DeadlineCell value={row.respondBy} nowMs={nowMs ?? 0} />,
    });
  }

  return cols;
}
