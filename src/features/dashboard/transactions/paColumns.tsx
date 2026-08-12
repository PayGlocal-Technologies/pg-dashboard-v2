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
};

export function getStatusMeta(raw?: string): StatusMeta {
  if (!raw) return { label: "Unknown", variant: "muted" };
  const key = raw.toUpperCase().replace(/ /g, "_");
  return PA_STATUS_META[key] ?? { label: raw.replace(/_/g, " ").toLowerCase(), variant: "muted" };
}

// ── Coarse status buckets, drive both the segmented control filter and the
// Amount column's sign/color, derived from PA_STATUS_META's own variants so
// the two mappings can never drift apart. ──────────────────────────────────
export type TransactionStatusBucket = "success" | "refunded" | "failed" | "pending";

const BUCKET_BY_VARIANT: Partial<Record<BadgeVariant, TransactionStatusBucket>> = {
  success: "success",
  refund: "refunded",
  danger: "failed",
  warning: "pending",
};

export function getStatusBucket(raw?: string): TransactionStatusBucket {
  const { variant } = getStatusMeta(raw);
  return BUCKET_BY_VARIANT[variant] ?? "pending";
}

/** Raw externalStatus codes belonging to each coarse bucket, used to build
 * the `externalStatus` array sent to the search API when a segmented-control
 * tab (other than "All") is selected. */
export const STATUS_BUCKET_RAW_VALUES: Record<Exclude<TransactionStatusBucket, "pending">, string[]> = {
  success: Object.entries(PA_STATUS_META)
    .filter(([, meta]) => meta.variant === "success")
    .map(([key]) => key),
  refunded: Object.entries(PA_STATUS_META)
    .filter(([, meta]) => meta.variant === "refund")
    .map(([key]) => key),
  failed: Object.entries(PA_STATUS_META)
    .filter(([, meta]) => meta.variant === "danger")
    .map(([key]) => key),
};

// ── Date & Time cell, splits the API's single formatted string into the
// two-line date/time layout. ─────────────────────────────────────────────────
function DateTimeCell({ value }: { value?: string }) {
  if (!value) return <span className="text-[13px] text-muted-foreground">—</span>;
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  return (
    <div className="whitespace-nowrap">
      <p className="text-[13px] text-muted-foreground">{datePart}</p>
      {timePart && <p className="text-[11px] text-muted-foreground/80">{timePart}</p>}
    </div>
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
  { key: "paymentMethod", label: "Payment Method" },
  { key: "transactionId", label: "Transaction ID" },
  { key: "customer", label: "Customer" },
  { key: "status", label: "Status" },
  { key: "dateTime", label: "Date & Time" },
];

export const PA_TRANSACTION_COLUMN_ORDER: string[] = PA_TRANSACTION_COLUMN_DEFS.map((d) => d.key);

function buildColumn(key: string): Column<PaTransaction> | null {
  switch (key) {
    case "customer":
      return {
        key: "customer",
        header: "Customer",
        minWidth: 200,
        render: (row) => <TransactionCustomerCell name={customerName(row)} email={row.encEmailId} />,
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
        align: "right",
        render: (row) => (
          <TransactionAmount
            amount={parseFloat(row.totalAmount ?? "0")}
            currency={row.txnCurrency ?? "INR"}
            bucket={getStatusBucket(row.externalStatus)}
          />
        ),
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
        minWidth: 130,
        render: (row) => <DateTimeCell value={row.formattedCreationDateTime} />,
      };
    case "transactionId":
      return {
        key: "transactionId",
        header: "Transaction ID",
        minWidth: 170,
        render: (row) => <TransactionId id={row.gid ?? "—"} />,
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

    // Merchant ID is partner-only and always sits right after Customer, not
    // part of the general reorder/visibility set.
    if (key === "customer" && isPartnerUser) {
      cols.push({
        key: "merchantId",
        header: "Merchant ID",
        minWidth: 145,
        render: (row) => (
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">{row.merchantId ?? "—"}</span>
        ),
      });
    }
  }

  return cols;
}
