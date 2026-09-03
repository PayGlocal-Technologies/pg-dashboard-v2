import type { StatusMeta } from "@/features/dashboard/pa-transactions/status/types";
import type { PaymentBucket } from "@/features/dashboard/pa-transactions/status/paymentBucket";
import {
  didDisputeMoneyLeaveTheMerchant,
  isDisputeStatusActive,
} from "@/features/dashboard/pa-transactions/status/disputeStatus";
import type { DisputeEvent } from "@/features/dashboard/pa-transactions/financial/types";

/** One vocabulary for a transaction's own status, never a refund or dispute
 * term (status-vocabulary spec §5-6). IN_FLIGHT is not part of the spec's
 * approved 10-term list, it's an internal marker for "payment not yet
 * resolved either way" (still Processing/Authorised/Sent for capture at the
 * raw level), rendered as a neutral placeholder rather than inventing a new
 * named chip for a state the spec explicitly says is too short-lived to
 * need one. */
export type TransactionStatusKey =
  | "IN_FLIGHT"
  | "FAILED"
  | "EXPIRED"
  | "SUCCESS"
  | "REFUND_IN_PROGRESS"
  | "REFUNDED"
  | "DISPUTED"
  | "DISPUTE_CLEARED"
  | "CHARGED_BACK"
  | "REFUNDED_AND_DISPUTED"
  | "REFUNDED_AND_CHARGED_BACK";

export const TRANSACTION_STATUS_META: Record<TransactionStatusKey, StatusMeta> = {
  IN_FLIGHT: { label: "-", variant: "muted" },
  FAILED: { label: "Failed", variant: "danger", trailIcon: "x" },
  EXPIRED: { label: "Expired", variant: "muted" },
  SUCCESS: { label: "Success", variant: "success", trailIcon: "check" },
  REFUND_IN_PROGRESS: { label: "Refund in progress", variant: "info", trailIcon: "refresh" },
  REFUNDED: { label: "Refunded", variant: "muted" },
  DISPUTED: { label: "Disputed", variant: "warning", tooltip: "Respond before the deadline" },
  DISPUTE_CLEARED: { label: "Dispute cleared", variant: "success", trailIcon: "check" },
  CHARGED_BACK: { label: "Charged back", variant: "danger", trailIcon: "x" },
  REFUNDED_AND_DISPUTED: { label: "Refunded and disputed", variant: "warning" },
  REFUNDED_AND_CHARGED_BACK: {
    label: "Refunded and charged back",
    variant: "danger",
    trailIcon: "x",
  },
};

export interface DeriveTransactionStatusChipInput {
  paymentBucket: PaymentBucket;
  originalAmount: number;
  /** Sum of COMPLETED refunds only, see refundStatus.ts. */
  refundedAmount: number;
  /** True when at least one refund is still PROCESSING. */
  hasProcessingRefund: boolean;
  /** Only the first dispute is considered, matching every other consumer of
   * `disputes[0]` in this codebase (a known, pre-existing, out-of-scope
   * limitation for transactions with more than one dispute). */
  disputeEvents: DisputeEvent[];
}

/** The transaction's ONE status chip, computed centrally so no component
 * derives this independently (status-vocabulary spec §6's 9-step
 * precedence table, evaluated top to bottom, first match wins). Replaces
 * the combining logic that used to live in paColumns.tsx's getDisplayStatus
 * and the parallel, sometimes-disagreeing deriveTransactionStatus in
 * deriveFinancials.ts, this is now the single source of truth both the
 * table chip and `TransactionFinancials.derivedTransactionStatus` read. */
export function deriveTransactionStatusChip({
  paymentBucket,
  originalAmount,
  refundedAmount,
  hasProcessingRefund,
  disputeEvents,
}: DeriveTransactionStatusChipInput): TransactionStatusKey {
  // 1. Payment has not completed.
  if (paymentBucket === "failed") return "FAILED";
  if (paymentBucket === "expired") return "EXPIRED";
  if (paymentBucket === "in_flight") return "IN_FLIGHT";

  const hasRefunded = refundedAmount > 0 && originalAmount > 0;
  const dispute = disputeEvents[0];
  const disputeIsLive = !!dispute && isDisputeStatusActive(dispute.status);
  const disputeMoneyLeft = !!dispute && didDisputeMoneyLeaveTheMerchant(dispute.status);

  // 2. Refunds exist AND a dispute is live.
  if (hasRefunded && disputeIsLive) return "REFUNDED_AND_DISPUTED";
  // 3. Refunds exist AND a dispute took money (charged back/accepted/expired).
  if (hasRefunded && disputeMoneyLeft) return "REFUNDED_AND_CHARGED_BACK";
  // 4. A dispute is live.
  if (disputeIsLive) return "DISPUTED";
  // 5. A dispute took money.
  if (disputeMoneyLeft) return "CHARGED_BACK";
  // 6. A refund is still moving.
  if (hasProcessingRefund) return "REFUND_IN_PROGRESS";
  // 7. A refund completed.
  if (hasRefunded) return "REFUNDED";
  // 8. A dispute cleared, nothing else affects the transaction.
  if (dispute?.status === "CLEARED") return "DISPUTE_CLEARED";
  // 9. Nothing has touched it.
  return "SUCCESS";
}
