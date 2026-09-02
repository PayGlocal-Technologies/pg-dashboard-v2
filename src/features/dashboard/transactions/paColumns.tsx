"use client";

import { type Column, StatusBadge } from "@/components/ui";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { TransactionCustomerCell } from "@/features/dashboard/transactions/components/TransactionCustomerCell";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { TransactionAmount } from "@/features/dashboard/transactions/components/TransactionAmount";
import { TransactionId } from "@/features/dashboard/transactions/components/TransactionId";
import { getRefundedAmount } from "@/features/dashboard/transactions/financial/deriveFinancials";
import { derivePaymentBucket } from "@/features/dashboard/transactions/status/paymentBucket";
import {
  deriveTransactionStatusChip,
  TRANSACTION_STATUS_META,
  type TransactionStatusKey,
} from "@/features/dashboard/transactions/status/transactionStatus";
import { REFUND_STATUS_META } from "@/features/dashboard/transactions/status/refundStatus";
import { DISPUTE_STATUS_META } from "@/features/dashboard/transactions/status/disputeStatus";
import type { StatusMeta } from "@/features/dashboard/transactions/status/types";
import type {
  DisputeEventStatus,
  RefundEventStatus,
} from "@/features/dashboard/transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

export type { StatusMeta };

/** Looks up a raw status string against one of the 3 status vocabularies
 * (see status/transactionStatus.ts, refundStatus.ts, disputeStatus.ts),
 * falling back to a generic muted chip for anything genuinely unrecognized
 * rather than ever inventing a new chip term (status-vocabulary spec rule
 * #7: "nothing outside these lists renders as a status"). */
function lookupStatusMeta(raw: string | undefined, meta: Record<string, StatusMeta>): StatusMeta {
  if (!raw) return { label: "Unknown", variant: "muted" };
  const key = raw.toUpperCase().replace(/ /g, "_");
  return meta[key] ?? { label: raw.replace(/_/g, " ").toLowerCase(), variant: "muted" };
}

// ── Coarse status buckets, drive both the segmented control filter and the
// Amount column's sign/color. ───────────────────────────────────────────────
export type TransactionStatusBucket = "success" | "refunded" | "failed" | "pending" | "disputed";

const BUCKET_BY_STATUS_KEY: Record<TransactionStatusKey, TransactionStatusBucket> = {
  IN_FLIGHT: "pending",
  FAILED: "failed",
  EXPIRED: "failed",
  SUCCESS: "success",
  REFUND_IN_PROGRESS: "refunded",
  REFUNDED: "refunded",
  DISPUTED: "disputed",
  DISPUTE_CLEARED: "disputed",
  CHARGED_BACK: "disputed",
  REFUNDED_AND_DISPUTED: "disputed",
  REFUNDED_AND_CHARGED_BACK: "disputed",
};

/** The transaction's own bucket, driven by the exact same precedence as its
 * chip (see getDisplayStatus below) so the two can never disagree, a
 * transaction with a completed refund AND a dispute that later cleared
 * shows "Refunded" (per the status-vocabulary spec's own worked example:
 * "once the dispute is cleared, it is no longer affecting the money
 * outcome"), so it now lives under the Refunded segment, not Disputes. */
export function getDisplayStatusBucket(transaction: PaTransaction): TransactionStatusBucket {
  return BUCKET_BY_STATUS_KEY[deriveStatusKey(transaction)];
}

function deriveStatusKey(transaction: PaTransaction): TransactionStatusKey {
  return deriveTransactionStatusChip({
    paymentBucket: derivePaymentBucket(transaction.externalStatus),
    originalAmount: parseFloat(transaction.totalAmount ?? "0"),
    refundedAmount: getRefundedAmount(transaction.refunds ?? []),
    hasProcessingRefund: (transaction.refunds ?? []).some((r) => r.status === "PROCESSING"),
    disputeEvents: transaction.disputes ?? [],
  });
}

/** The single badge {label, variant, trailIcon} shown for a row in the
 * Transactions table. A plain transaction is routed through the
 * transaction-status precedence (status/transactionStatus.ts); a refund or
 * dispute pseudo-row (see linkedChildRecords.ts's `linkedRecordType`) is
 * routed through ITS OWN vocabulary instead, a term from one vocabulary
 * never appears for another kind of row (status-vocabulary spec rule #1). */
export function getDisplayStatus(transaction: PaTransaction): StatusMeta {
  if (transaction.linkedRecordType === "refund") {
    return lookupStatusMeta(transaction.externalStatus, REFUND_STATUS_META);
  }
  if (transaction.linkedRecordType === "dispute") {
    return lookupStatusMeta(transaction.externalStatus, DISPUTE_STATUS_META);
  }
  return TRANSACTION_STATUS_META[deriveStatusKey(transaction)];
}

/** A dispute's own status badge (e.g. on the Dispute Management table/
 * Dispute Detail page), never the combined transaction chip. */
export function getDisputeStatusMeta(status: DisputeEventStatus): StatusMeta {
  return DISPUTE_STATUS_META[status];
}

/** A refund's own status badge (e.g. on the Refund Detail page). */
export function getRefundStatusMeta(status: RefundEventStatus): StatusMeta {
  return REFUND_STATUS_META[status];
}

/** Raw externalStatus codes belonging to each coarse bucket, used to build
 * the `externalStatus` array sent to the search API when a segmented-control
 * tab (other than "All") is selected. "refunded"/"disputed" list the child
 * event's OWN vocabulary (best-effort for a real API, the mock fallback path
 * in PaTransactionTable filters by the actual derived bucket/flattened rows
 * instead, see getDisplayStatusBucket/flattenRefundRows/flattenDisputeRows). */
export const STATUS_BUCKET_RAW_VALUES: Record<
  Exclude<TransactionStatusBucket, "pending">,
  string[]
> = {
  success: ["SUCCESS", "REVERSED"],
  refunded: ["PROCESSING", "COMPLETED", "FAILED"],
  failed: [
    "ISSUER_DECLINE",
    "GENERAL_DECLINE",
    "CUSTOMER_CANCELLED",
    "AUTHENTICATION_TIMEOUT",
    "AUTHENTICATION_FAILED",
    "SYSTEM_ERROR",
    "REQUEST_ERROR",
    "CONFIG_ERROR",
    "SYSTEM_DECLINED",
    "ABANDONED",
    "ALTPAY_DECLINE",
    "MARKED_AS_FRAUD",
    "EXPIRED",
  ],
  disputed: [
    "NEEDS_RESPONSE",
    "UNDER_REVIEW",
    "MORE_EVIDENCE_NEEDED",
    "REOPENED",
    "CLEARED",
    "CHARGED_BACK",
    "ACCEPTED",
    "EXPIRED",
  ],
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
