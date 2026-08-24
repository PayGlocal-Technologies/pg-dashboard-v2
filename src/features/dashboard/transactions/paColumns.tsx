"use client";

import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { TransactionCustomerCell } from "@/features/dashboard/transactions/components/TransactionCustomerCell";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { TransactionAmount } from "@/features/dashboard/transactions/components/TransactionAmount";
import { TransactionId } from "@/features/dashboard/transactions/components/TransactionId";
import {
  getRefundedAmount,
  isDisputeActive,
} from "@/features/dashboard/transactions/financial/deriveFinancials";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

// ── Status mapping: raw API value → display meta ──────────────────────────────
type StatusMeta = {
  label: string;
  variant: BadgeVariant;
  trailIcon?: BadgeTrailIcon;
  /** Extra context shown on hover rather than inline in the badge itself,
   * e.g. a dispute's response deadline, see StatusBadgeWithTooltip. */
  tooltip?: string;
};

export const PA_STATUS_META: Record<string, StatusMeta> = {
  SUCCESS: { label: "Success", variant: "success", trailIcon: "check" },
  SENT_FOR_CAPTURE: { label: "Sent for capture", variant: "success", trailIcon: "check" },
  AUTHORIZED: { label: "Authorized", variant: "warning" },
  REVERSED: { label: "Reversed", variant: "success", trailIcon: "check" },
  INPROGRESS: { label: "In progress", variant: "warning" },
  IN_PROGRESS: { label: "In progress", variant: "warning" },
  CAPTURE_STARTED: { label: "Capture started", variant: "warning" },
  SENT_FOR_REFUND: { label: "Sent for refund", variant: "refund" },
  REFUND_STARTED: { label: "Refund started", variant: "refund" },
  // Used for a refund CHILD event's own status badge (see
  // linkedChildRecords.ts), same label/variant getDisplayStatus already
  // uses for a fully-refunded parent, kept consistent rather than a second
  // "refunded" vocabulary.
  REFUNDED: { label: "Refunded", variant: "refund" },
  REFUND_FAILED: { label: "Refund failed", variant: "danger", trailIcon: "x" },
  AUTH_REVERSAL_STARTED: { label: "Auth reversal", variant: "warning" },
  ISSUER_DECLINE: { label: "Issuer decline", variant: "danger", trailIcon: "x" },
  GENERAL_DECLINE: { label: "General decline", variant: "danger", trailIcon: "x" },
  CUSTOMER_CANCELLED: { label: "Cancelled", variant: "danger", trailIcon: "x" },
  AUTHENTICATION_TIMEOUT: { label: "Auth timeout", variant: "danger", trailIcon: "x" },
  SYSTEM_ERROR: { label: "System error", variant: "danger", trailIcon: "x" },
  REQUEST_ERROR: { label: "Request error", variant: "danger", trailIcon: "x" },
  CONFIG_ERROR: { label: "Config error", variant: "danger", trailIcon: "x" },
  SYSTEM_DECLINED: { label: "System declined", variant: "danger", trailIcon: "x" },
  ABANDONED: { label: "Abandoned", variant: "danger", trailIcon: "x" },
  AUTHENTICATION_FAILED: { label: "Auth failed", variant: "danger", trailIcon: "x" },
  ALTPAY_DECLINE: { label: "Altpay decline", variant: "danger", trailIcon: "x" },
  MARKED_AS_FRAUD: { label: "Marked as fraud", variant: "danger", trailIcon: "x" },
  STEP_UP: { label: "Step up", variant: "warning" },
  // variant: "warning"/"success"/"danger" here (not "orange") deliberately
  // reuse the same three variants every other status in this table already
  // uses, keeping the chip UI consistent instead of introducing a new color.
  // DISPUTED and NEEDS_ACTION are two raw values for the same merchant-
  // facing state ("needs the merchant to accept/contest or upload
  // documents"), both display identically as "Action required" rather than
  // two different-sounding labels for the same thing.
  DISPUTED: { label: "Action required", variant: "warning", tooltip: "Respond within 6 days" },
  NEEDS_ACTION: { label: "Action required", variant: "warning" },
  UNDER_REVIEW: { label: "Under review", variant: "warning", trailIcon: "clock" },
  // Only reached once PayGlocal has reviewed submitted evidence and found
  // it inadequate, distinct from the initial "Action required" state.
  INSUFFICIENT_DOCUMENTS: {
    label: "Insufficient documents",
    variant: "danger",
    trailIcon: "alert",
  },
  WON: { label: "Won", variant: "success", trailIcon: "check" },
  LOST: { label: "Lost", variant: "danger", trailIcon: "x" },
};

/** Every raw status that represents some stage of a dispute, these all
 * bucket under "disputed" (see getStatusBucket) rather than following their
 * badge variant's usual bucket, WON/LOST use "success"/"danger" variants for
 * their badge color but must still surface under the Disputes tab, not
 * alongside ordinary payment successes/failures. */
const DISPUTE_STATUS_KEYS = [
  "DISPUTED",
  "UNDER_REVIEW",
  "NEEDS_ACTION",
  "INSUFFICIENT_DOCUMENTS",
  "WON",
  "LOST",
];

export function getStatusMeta(raw?: string): StatusMeta {
  if (!raw) return { label: "Unknown", variant: "muted" };
  const key = raw.toUpperCase().replace(/ /g, "_");
  return PA_STATUS_META[key] ?? { label: raw.replace(/_/g, " ").toLowerCase(), variant: "muted" };
}

// ── Coarse status buckets, drive both the segmented control filter and the
// Amount column's sign/color, derived from PA_STATUS_META's own variants so
// the two mappings can never drift apart. ──────────────────────────────────
export type TransactionStatusBucket = "success" | "refunded" | "failed" | "pending" | "disputed";

const BUCKET_BY_VARIANT: Partial<Record<BadgeVariant, TransactionStatusBucket>> = {
  success: "success",
  refund: "refunded",
  danger: "failed",
  warning: "pending",
};

export function getStatusBucket(raw?: string): TransactionStatusBucket {
  const key = raw?.toUpperCase().replace(/ /g, "_");
  if (key && DISPUTE_STATUS_KEYS.includes(key)) return "disputed";
  const { variant } = getStatusMeta(raw);
  return BUCKET_BY_VARIANT[variant] ?? "pending";
}

// ── Transaction-level display status ────────────────────────────────────────
// getStatusMeta/getStatusBucket above answer "what does this one raw status
// string mean". They're still correct and still used as-is for any
// transaction with no refund/dispute history (including real, not-yet-
// migrated API data, which has no refunds[]/disputes[] at all). The
// functions below answer the actual question the transaction list/detail
// page need answered: "what should this transaction's ONE status badge say,
// given everything that has happened to it" (see the Unified Transaction ID
// & Financial Event Logic model, refunds/disputes are child events on this
// same PaTransaction, never separate rows). Every consumer of a
// transaction's primary status (the table's status column, the drawer, the
// full detail page) must go through getDisplayStatus, not getStatusMeta
// directly, so there is one place this logic lives.

/** The transaction's own bucket (see getStatusBucket) for a WON/LOST
 * dispute's raw status re-uses that same bucket mapping (WON's variant is
 * "success", LOST's is "danger" but both fall under "disputed" via
 * DISPUTE_STATUS_KEYS), kept in sync automatically since it's the same
 * function, not a second copy of the mapping. */
export function getDisplayStatusBucket(transaction: PaTransaction): TransactionStatusBucket {
  const rawBucket = getStatusBucket(transaction.externalStatus);
  if (rawBucket === "failed" || rawBucket === "pending") return rawBucket;

  const dispute = transaction.disputes?.[0];
  if (isDisputeActive(dispute)) return "disputed";
  if (dispute) return getStatusBucket(dispute.status);

  const refundedAmount = getRefundedAmount(transaction.refunds ?? []);
  if (refundedAmount > 0) return "refunded";

  return rawBucket;
}

/** The single badge {label, variant, trailIcon} shown for a transaction,
 * combining its refund state with its most recent dispute (if any). A
 * transaction with neither behaves exactly as getStatusMeta always did, this
 * is additive, not a replacement, for the common case. */
export function getDisplayStatus(transaction: PaTransaction): StatusMeta {
  const rawBucket = getStatusBucket(transaction.externalStatus);
  // Refund/dispute overlays only ever apply on top of an underlying
  // successful payment, a failed or still-pending payment's own status is
  // always the most important thing to show, unchanged.
  if (rawBucket === "failed" || rawBucket === "pending") {
    return getStatusMeta(transaction.externalStatus);
  }

  const originalAmount = parseFloat(transaction.totalAmount ?? "0");
  const refundedAmount = getRefundedAmount(transaction.refunds ?? []);
  const isFullyRefunded = refundedAmount > 0 && refundedAmount >= originalAmount;
  const isPartiallyRefunded = refundedAmount > 0 && !isFullyRefunded;
  const refundPrefix = isFullyRefunded
    ? "Refunded"
    : isPartiallyRefunded
      ? "Partially refunded"
      : undefined;

  const dispute = transaction.disputes?.[0];

  if (isDisputeActive(dispute)) {
    // getStatusMeta(dispute.status) reuses the exact existing labels for
    // DISPUTED/NEEDS_ACTION/UNDER_REVIEW/INSUFFICIENT_DOCUMENTS ("Action
    // required", "Under review", "Insufficient documents"), the dispute's
    // own event status, not the transaction's externalStatus. Any extra
    // context (e.g. DISPUTED's response deadline) travels via .tooltip,
    // shown on hover rather than inline in the badge.
    const disputeMeta = getStatusMeta(dispute!.status);
    return {
      label: refundPrefix ? `${refundPrefix} · ${disputeMeta.label}` : disputeMeta.label,
      variant: "warning",
      trailIcon: disputeMeta.trailIcon,
      tooltip: disputeMeta.tooltip,
    };
  }

  if (dispute) {
    // Resolved (WON/LOST), keeps its own existing label/variant regardless
    // of any independent refund state, see getDisplayStatus's own doc
    // comment above for why this doesn't get combined with refund text.
    return getStatusMeta(dispute.status);
  }

  if (refundPrefix) {
    return { label: refundPrefix, variant: "refund" };
  }

  return getStatusMeta(transaction.externalStatus);
}

/** Raw externalStatus codes belonging to each coarse bucket, used to build
 * the `externalStatus` array sent to the search API when a segmented-control
 * tab (other than "All") is selected. Dispute statuses are excluded from the
 * variant-derived success/failed lists (WON/LOST would otherwise double up
 * there) since they're already listed under "disputed" below. */
export const STATUS_BUCKET_RAW_VALUES: Record<
  Exclude<TransactionStatusBucket, "pending">,
  string[]
> = {
  success: Object.entries(PA_STATUS_META)
    .filter(([key, meta]) => meta.variant === "success" && !DISPUTE_STATUS_KEYS.includes(key))
    .map(([key]) => key),
  refunded: Object.entries(PA_STATUS_META)
    .filter(([, meta]) => meta.variant === "refund")
    .map(([key]) => key),
  failed: Object.entries(PA_STATUS_META)
    .filter(([key, meta]) => meta.variant === "danger" && !DISPUTE_STATUS_KEYS.includes(key))
    .map(([key]) => key),
  disputed: DISPUTE_STATUS_KEYS,
};

// ── Date & Time cell, reformats the API's "DD/MM/YYYY, HH:MM:SS" string into
// a single-line "D MMM 'YY, hh:mm AM/PM" display, same font/color as every
// other column. ────────────────────────────────────────────────────────────
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDisplayDateTime(value?: string): string | null {
  if (!value) return null;
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  const [day, month, year] = (datePart ?? "").split("/").map(Number);
  if (!day || !month || !year) return null;
  const [hours = 0, minutes = 0] = (timePart ?? "").split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const hh = String(hour12).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `${day} ${MONTH_ABBR[month - 1]} '${yy}, ${hh}:${mm} ${period}`;
}

function DateTimeCell({ value }: { value?: string }) {
  const formatted = formatDisplayDateTime(value);
  return (
    <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
      {formatted ?? "N/A"}
    </span>
  );
}

export function customerName(row: PaTransaction): string {
  return [row.firstName ?? row.billToFirstName, row.lastName ?? row.billToLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

// ── Column definitions ────────────────────────────────────────────────────────
// Every reorderable/hideable data column lives here, keyed so
// TransactionColumnsMenu can toggle visibility and reorder independently of
// Merchant ID (partner-only, fixed position) and Actions (a rowAction, not a
// real column).
export const PA_TRANSACTION_COLUMN_DEFS: { key: string; label: string }[] = [
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "customerName", label: "Customer Name" },
  { key: "customerEmail", label: "Customer Email" },
  { key: "transactionId", label: "Transaction ID" },
  { key: "dateTime", label: "Date & Time" },
];

export const PA_TRANSACTION_COLUMN_ORDER: string[] = PA_TRANSACTION_COLUMN_DEFS.map((d) => d.key);

function buildColumn(key: string): Column<PaTransaction> | null {
  switch (key) {
    case "customerName":
      return {
        key: "customerName",
        header: "Customer Name",
        minWidth: 180,
        render: (row) => <TransactionCustomerCell name={customerName(row)} />,
      };
    case "customerEmail":
      return {
        key: "customerEmail",
        header: "Customer Email",
        minWidth: 190,
        render: (row) => (
          <span className="whitespace-nowrap text-[12px] font-medium text-foreground lowercase">
            {row.encEmailId ?? "N/A"}
          </span>
        ),
      };
    case "paymentMethod":
      return {
        key: "paymentMethod",
        header: "Payment Method",
        minWidth: 145,
        render: (row) => <TransactionPaymentMethod row={row} />,
      };
    case "amount":
      return {
        key: "amount",
        header: "Amount",
        minWidth: 135,
        // Left-aligned (not "right") so every row's amount starts at the same
        // x position regardless of how many digits it has, a right-aligned
        // column made shorter amounts look raggedly indented next to longer
        // ones instead of forming a clean left edge.
        // Aligns the table's first column with the toolbar/tabs above it,
        // which sit inside a `pl-5` wrapper (see PaTransactionTable), the
        // DataTable itself has no equivalent padding of its own.
        cellClassName: "pl-5",
        render: (row) => (
          <TransactionAmount
            amount={parseFloat(row.totalAmount ?? "0")}
            currency={row.txnCurrency ?? "INR"}
          />
        ),
      };
    case "status":
      return {
        key: "status",
        header: "Status",
        minWidth: 155,
        render: (row) => {
          const { label, variant, trailIcon, tooltip } = getDisplayStatus(row);
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
    case "dateTime":
      return {
        key: "dateTime",
        header: "Date & Time",
        minWidth: 150,
        render: (row) => <DateTimeCell value={row.formattedCreationDateTime} />,
      };
    case "transactionId":
      return {
        key: "transactionId",
        header: "Transaction ID",
        minWidth: 170,
        render: (row) => <TransactionId id={row.gid ?? "N/A"} />,
      };
    default:
      return null;
  }
}

interface BuildPaColumnsOptions {
  isPartnerUser: boolean;
  columnOrder?: string[];
  hiddenColumns?: Set<string>;
}

export function buildPaColumns({
  isPartnerUser,
  columnOrder = PA_TRANSACTION_COLUMN_ORDER,
  hiddenColumns,
}: BuildPaColumnsOptions): Column<PaTransaction>[] {
  const cols: Column<PaTransaction>[] = [];

  for (const key of columnOrder) {
    if (hiddenColumns?.has(key)) continue;
    const col = buildColumn(key);
    if (col) cols.push(col);

    // Merchant ID is partner-only and always sits right after the customer
    // info columns, not part of the general reorder/visibility set.
    if (key === "customerEmail" && isPartnerUser) {
      cols.push({
        key: "merchantId",
        header: "Merchant ID",
        minWidth: 145,
        render: (row) => (
          <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
            {row.merchantId ?? "N/A"}
          </span>
        ),
      });
    }
  }

  return cols;
}
