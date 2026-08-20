"use client";

import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { TransactionCustomerCell } from "@/features/dashboard/transactions/components/TransactionCustomerCell";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { TransactionAmount } from "@/features/dashboard/transactions/components/TransactionAmount";
import { TransactionId } from "@/features/dashboard/transactions/components/TransactionId";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

// ── Status mapping: raw API value → display meta ──────────────────────────────
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

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
  DISPUTED: { label: "Dispute, respond within 6 days", variant: "warning" },
  UNDER_REVIEW: { label: "Under review", variant: "warning", trailIcon: "clock" },
  NEEDS_ACTION: { label: "Needs action", variant: "warning" },
  WON: { label: "Won", variant: "success", trailIcon: "check" },
  LOST: { label: "Lost", variant: "danger", trailIcon: "x" },
};

/** Every raw status that represents some stage of a dispute, these all
 * bucket under "disputed" (see getStatusBucket) rather than following their
 * badge variant's usual bucket, WON/LOST use "success"/"danger" variants for
 * their badge color but must still surface under the Disputes tab, not
 * alongside ordinary payment successes/failures. */
const DISPUTE_STATUS_KEYS = ["DISPUTED", "UNDER_REVIEW", "NEEDS_ACTION", "WON", "LOST"];

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

/** Raw externalStatus codes belonging to each coarse bucket, used to build
 * the `externalStatus` array sent to the search API when a segmented-control
 * tab (other than "All") is selected. Dispute statuses are excluded from the
 * variant-derived success/failed lists (WON/LOST would otherwise double up
 * there) since they're already listed under "disputed" below. */
export const STATUS_BUCKET_RAW_VALUES: Record<Exclude<TransactionStatusBucket, "pending">, string[]> = {
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
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  return <span className="whitespace-nowrap text-[12px] font-medium text-foreground">{formatted ?? "N/A"}</span>;
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
        render: (row) => <TransactionAmount amount={parseFloat(row.totalAmount ?? "0")} currency={row.txnCurrency ?? "INR"} />,
      };
    case "status":
      return {
        key: "status",
        header: "Status",
        minWidth: 155,
        render: (row) => {
          const { label, variant, trailIcon } = getStatusMeta(row.externalStatus);
          return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
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
          <span className="whitespace-nowrap text-[12px] font-medium text-foreground">{row.merchantId ?? "N/A"}</span>
        ),
      });
    }
  }

  return cols;
}
