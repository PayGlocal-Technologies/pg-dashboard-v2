import type { StatusMeta } from "@/features/dashboard/pa-transactions/status/types";
import type { PaymentOutcome } from "@/features/dashboard/pa-transactions/status/paymentBucket";
import {
  didDisputeMoneyLeaveTheMerchant,
  isDisputeStatusActive,
} from "@/features/dashboard/pa-transactions/status/disputeStatus";
import type { DisputeEvent } from "@/features/dashboard/pa-transactions/financial/types";

/** One vocabulary for a transaction's own status, never a refund or dispute
 * term (status-vocabulary spec §1, rule #1). The full 14-term list: six
 * "before the money arrives" (the payment's own outcome, used as-is with no
 * further combination) and eight "after" (Success alone, or Success
 * combined with whatever refund/dispute state has touched it since). */
export type TransactionStatusKey =
  // Before the money arrives — a direct copy of PaymentOutcome other than
  // SUCCESS, which is the only outcome that proceeds to the "after" group.
  | "PROCESSING"
  | "AUTHORISED"
  | "SENT_FOR_CAPTURE"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  // After the money arrives.
  | "SUCCESS"
  | "REFUND_IN_PROGRESS"
  | "REFUNDED"
  | "DISPUTED"
  | "DISPUTE_CLEARED"
  | "CHARGED_BACK"
  | "REFUNDED_AND_DISPUTED"
  | "REFUNDED_AND_CHARGED_BACK";

export const TRANSACTION_STATUS_META: Record<TransactionStatusKey, StatusMeta> = {
  // Before the money arrives — blue while nothing has gone wrong yet
  // (Processing/Authorised), muted once it's simply over with no money
  // movement (Cancelled/Expired), red only for an actual decline (Failed).
  // Sent for capture is deliberately green, not blue like the other two
  // still-pending states — a merchant-requested distinction: capture
  // having been requested reads as a completed merchant action rather than
  // a wait-and-see state, even though the bank hasn't confirmed it yet.
  PROCESSING: {
    label: "Processing",
    variant: "info",
    tooltip: "Sent to the bank, no answer yet. Wait, do not fulfil.",
  },
  AUTHORISED: {
    label: "Authorised",
    variant: "info",
    tooltip: "Approved by the bank, money not collected. Do not fulfil, capture first.",
  },
  SENT_FOR_CAPTURE: {
    label: "Sent for capture",
    variant: "success",
    trailIcon: "check",
    tooltip: "Capture requested, not confirmed. Wait, usually minutes.",
  },
  FAILED: {
    label: "Failed",
    variant: "danger",
    trailIcon: "x",
    tooltip: "Did not go through. Ask the customer to retry.",
  },
  CANCELLED: { label: "Cancelled", variant: "muted", tooltip: "Cancelled before collection." },
  EXPIRED: {
    label: "Expired",
    variant: "muted",
    tooltip: "Authorised, never collected in time. Ask for a fresh payment.",
  },

  // After the money arrives.
  SUCCESS: { label: "Success", variant: "success", trailIcon: "check" },
  REFUND_IN_PROGRESS: {
    label: "Refund in progress",
    variant: "info",
    trailIcon: "refresh",
    tooltip: "A refund is on the way to the customer, 5 to 7 working days.",
  },
  REFUNDED: { label: "Refunded", variant: "muted" },
  DISPUTED: { label: "Disputed", variant: "warning", tooltip: "Respond before the deadline." },
  DISPUTE_CLEARED: { label: "Dispute cleared", variant: "success", trailIcon: "check" },
  CHARGED_BACK: {
    label: "Charged back",
    variant: "danger",
    trailIcon: "x",
    tooltip: "Review why. Repeats affect your standing.",
  },
  REFUNDED_AND_DISPUTED: {
    label: "Refunded and disputed",
    variant: "warning",
    tooltip: "Check the dispute does not cover the refunded goods.",
  },
  REFUNDED_AND_CHARGED_BACK: {
    label: "Refunded and charged back",
    variant: "danger",
    trailIcon: "x",
    tooltip: "Review. You may have paid twice.",
  },
};

export interface DeriveTransactionStatusChipInput {
  paymentOutcome: PaymentOutcome;
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
 * derives this independently (status-vocabulary spec §1's 9-step
 * precedence table, evaluated top to bottom, first match wins). */
export function deriveTransactionStatusChip({
  paymentOutcome,
  originalAmount,
  refundedAmount,
  hasProcessingRefund,
  disputeEvents,
}: DeriveTransactionStatusChipInput): TransactionStatusKey {
  // 1. Payment has not completed — its own term from the "before" group,
  // untouched by anything below (a refund/dispute can't exist on money
  // that was never collected).
  if (paymentOutcome !== "SUCCESS") return paymentOutcome;

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
