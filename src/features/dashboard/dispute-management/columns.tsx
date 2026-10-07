import { Badge, type Column, StatusBadge } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { PaymentMethodLogo } from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { cn, formatCurrency } from "@/lib/utils";
import { formatDisplayDateTime } from "@/features/dashboard/pa-transactions/paColumns";
import { parseFormattedTimestamp } from "@/features/dashboard/pa-transactions/financial/generateTimeline";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { formatFee } from "@/features/dashboard/pa-transactions/status/disputeStages";
import { DISPUTE_STATUS_META } from "@/features/dashboard/pa-transactions/status/disputeStatus";
import type { DisputeResolution, DisputeRow } from "@/features/dashboard/dispute-management/types";

// Reuses DISPUTE_STATUS_META as-is, same chip labels/colors as the disputed
// rows already shown in the Transactions table, so a dispute looks
// identical wherever it appears.
const RESOLUTION_LABEL: Record<DisputeResolution, string> = {
  NO_RESPONSE: "No response",
  CONTESTED: "Contested",
  CUSTOMER_DROPPED: "Customer dropped",
  ACCEPTED: "Accepted",
  WITHDRAWN: "Withdrawn",
};

/** When a row has no explicit resolution, the most likely one for its status. */
const DEFAULT_RESOLUTION: Partial<Record<DisputeRow["status"], DisputeResolution>> = {
  CLEARED: "CONTESTED",
  CHARGED_BACK: "CONTESTED",
  ACCEPTED: "ACCEPTED",
  EXPIRED: "NO_RESPONSE",
};

/**
 * DISPUTE_STATUS_META's chip, with a closed dispute's "Won" / "Lost" label
 * extended by how it got there: "Lost · No response", "Won · Contested",
 * "Won · Customer dropped". Colour and icon stay the status's own. Open
 * disputes keep their plain status label.
 */
function statusMeta(row: DisputeRow) {
  const meta = DISPUTE_STATUS_META[row.status];
  const resolution = row.resolution ?? DEFAULT_RESOLUTION[row.status];
  if (!resolution) return meta;
  // The chip says just Won or Lost; how it got there, and any fee charged,
  // is the tooltip.
  const why =
    resolution === "WITHDRAWN"
      ? "You withdrew at arbitration. The amount was returned to the customer."
      : (meta.tooltip ?? "");
  const fee = row.appliedFee
    ? ` ${row.appliedFee.kind === "ARBITRATION" ? "Arbitration" : "Withdrawal"} fee of ${formatFee(row.appliedFee)} charged.`
    : "";
  return {
    ...meta,
    tooltip: `${meta.label} · ${RESOLUTION_LABEL[resolution]}. ${why}${fee}`.trim(),
  };
}

// Same type treatment as the Transactions table: the amount in bold, every
// supporting value (reason, email, method digits, dates) in regular-weight
// muted 13px, so the two tables read identically.
const MUTED_CELL = "whitespace-nowrap text-[13px] text-muted-foreground";

function DateTimeCell({ value }: { value?: string }) {
  const formatted = formatDisplayDateTime(value);
  return <span className={cn(MUTED_CELL, "tabular-nums")}>{formatted ?? "N/A"}</span>;
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
  const label = formatRespondByCountdown(value, nowMs);
  // Same size and weight as every other cell; a deadline inside a day (or
  // past) is marked by colour only.
  const urgent = label === "Overdue" || label.endsWith("hours left") || label.endsWith("hour left");
  return (
    <span className={cn(MUTED_CELL, "tabular-nums", urgent && "text-red-600 dark:text-red-400")}>
      {label}
    </span>
  );
}

/** The Transactions table's Customer Email flag: the currency's country
 *  (INR → India, USD → US, EUR → EU). */
function flagIso2(currency?: string): string | undefined {
  const c = (currency?.trim() || "INR").toUpperCase();
  if (c.length !== 3) return undefined;
  return c === "EUR" ? "EU" : c.slice(0, 2);
}

/** Payment method as the Transactions table shows it: the logo, then the
 *  card's last four (or the method's name) in muted monospace. */
function PaymentMethodCellView({ row }: { row: DisputeRow }) {
  const last4 = row.maskedCardNumber?.replace(/x/gi, "").trim();
  const instrument = row.paymentInstrument?.toUpperCase() ?? "";
  const text = last4
    ? `••• ${last4}`
    : instrument.includes("UPI")
      ? "UPI"
      : instrument.startsWith("NETBANKING")
        ? "Net Banking"
        : "•••••••";
  return (
    <div className="flex items-center gap-1.5">
      <PaymentMethodLogo row={row} />
      <span className="whitespace-nowrap font-mono text-[13px] text-muted-foreground">{text}</span>
    </div>
  );
}

const DISPUTE_ESCALATION_PHASE_LABEL: Record<NonNullable<DisputeRow["disputePhase"]>, string> = {
  DISPUTE: "Dispute",
  PRE_ARBITRATION: "Pre-arbitration",
  ARBITRATION: "Arbitration",
};

/**
 * The escalation round as a chip, so how far a dispute has gone reads at a
 * glance: Dispute (first round) plain, Pre-arbitration amber with one
 * up-chevron, Arbitration red with two (the last round, where losing carries
 * a fee). Colour always comes with the label and chevrons, never alone.
 */
const PHASE_CHIP: Record<
  NonNullable<DisputeRow["disputePhase"]>,
  { variant: "secondary" | "warning" | "error"; icon?: IconName }
> = {
  DISPUTE: { variant: "secondary" },
  PRE_ARBITRATION: { variant: "warning", icon: "chevron-up" },
  ARBITRATION: { variant: "error", icon: "chevrons-up" },
};

function PhaseCell({ phase }: { phase?: DisputeRow["disputePhase"] }) {
  if (!phase) {
    return <span className="text-[12px] text-muted-foreground">{"–"}</span>;
  }
  const { variant, icon } = PHASE_CHIP[phase];
  return (
    <Badge
      variant={variant}
      size="sm"
      // Same height, radius and type size as the Status chip beside it.
      className="gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium"
    >
      {DISPUTE_ESCALATION_PHASE_LABEL[phase]}
      {icon && <Icon name={icon} size={12} aria-hidden />}
    </Badge>
  );
}

// Every reorderable/hideable data column, keyed so ColumnManager
// (reused as-is from the transactions feature) can toggle visibility and
// reorder independently. "respondBy" is appended separately in
// buildDisputeColumns, only when the active segment needs it. Status stays
// the one 8-term vocabulary/chip (see the dispute-workflow PDF's own much
// finer set of screens). Stage is the escalation round (Dispute,
// Pre-arbitration, Arbitration, as in the Disputes workflow PDF): one column,
// not a second step-level "stage" alongside it, which read as a duplicate.
export const DISPUTE_COLUMN_DEFS: { key: string; label: string }[] = [
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "disputePhase", label: "Stage" },
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
        render: (row) => (
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              {formatCurrency(row.amount, row.currency)}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
          </div>
        ),
      };
    case "status":
      return {
        key: "status",
        header: "Status",
        // Fits the longest chip, "Won · Customer dropped", on one line.
        minWidth: 200,
        render: (row) => {
          const { label, variant, trailIcon, tooltip } = statusMeta(row);
          return (
            <StatusBadgeWithTooltip
              variant={variant}
              label={label}
              trailIcon={trailIcon}
              tooltip={tooltip}
              size="sm"
            />
          );
        },
      };
    case "disputePhase":
      return {
        key: "disputePhase",
        header: "Stage",
        minWidth: 130,
        render: (row) => <PhaseCell phase={row.disputePhase} />,
      };
    case "reason":
      return {
        key: "reason",
        header: "Reason",
        minWidth: 160,
        render: (row) => <span className={MUTED_CELL}>{row.reason}</span>,
      };
    case "paymentMethod":
      return {
        key: "paymentMethod",
        header: "Payment method",
        minWidth: 145,
        render: (row) => <PaymentMethodCellView row={row} />,
      };
    case "customerEmail":
      return {
        key: "customerEmail",
        header: "Customer email",
        minWidth: 190,
        render: (row) => {
          const iso2 = flagIso2(row.currency);
          return (
            <span className="flex items-center gap-2 whitespace-nowrap">
              {iso2 && <CountryFlag iso2={iso2} alt="" />}
              <span className="text-[13px] lowercase text-muted-foreground">
                {row.email || "—"}
              </span>
            </span>
          );
        },
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
