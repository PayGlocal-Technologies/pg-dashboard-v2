import type { StatusMeta } from "@/features/dashboard/pa-transactions/status/types";
import type { DisputeEventStatus } from "@/features/dashboard/pa-transactions/financial/types";

/** One vocabulary for a dispute's own status, never a transaction or refund
 * term (status-vocabulary spec §18). NEEDS_RESPONSE covers both "just
 * raised" and "documents still needed before responding", the same
 * merchant-facing state ("the clock is running, you must act") that used to
 * be split across DISPUTED/NEEDS_ACTION.
 *
 * Final outcomes are shown to the merchant as just Won or Lost: anything
 * that went in the merchant's favour is Won (CLEARED), anything that went in
 * the customer's favour is Lost (CHARGED_BACK, ACCEPTED, EXPIRED). The raw
 * statuses stay distinct underneath, and the tooltip says which way it was
 * lost, so a merchant who accepted a dispute can still tell that apart from
 * one they argued and lost (and any future win-rate figure can too). */
export const DISPUTE_STATUS_META: Record<DisputeEventStatus, StatusMeta> = {
  NEEDS_RESPONSE: {
    label: "Action required",
    variant: "warning",
    tooltip: "Accept or contest before the deadline",
  },
  UNDER_REVIEW: { label: "Under review", variant: "info", trailIcon: "clock" },
  MORE_EVIDENCE_NEEDED: {
    label: "Insufficient documents",
    variant: "warning",
    trailIcon: "alert",
    tooltip: "PayGlocal needs more documents before the dispute can continue",
  },
  // No longer a status of its own: a dispute that comes back reads as
  // Action required again, at its new stage. Kept for compatibility.
  REOPENED: {
    label: "Action required",
    variant: "warning",
    tooltip: "Accept or contest before the deadline",
  },
  CLEARED: {
    label: "Won",
    variant: "success",
    trailIcon: "check",
    tooltip: "Ruled in your favour. The disputed amount stays with you.",
  },
  CHARGED_BACK: {
    label: "Lost",
    variant: "danger",
    trailIcon: "x",
    tooltip: "Ruled in the customer's favour. The disputed amount was charged back.",
  },
  ACCEPTED: {
    label: "Lost",
    variant: "danger",
    trailIcon: "x",
    tooltip: "You accepted this dispute. The amount was returned to the customer.",
  },
  EXPIRED: {
    label: "Lost",
    variant: "danger",
    trailIcon: "x",
    tooltip: "The response deadline passed, so it closed in the customer's favour.",
  },
};

/** A dispute still needs a decision or is being worked (NEEDS_RESPONSE,
 * UNDER_REVIEW, MORE_EVIDENCE_NEEDED, REOPENED) vs. already resolved
 * (CLEARED, CHARGED_BACK, ACCEPTED, EXPIRED). The single place this check
 * lives, mirrors the old WON/LOST split but for the full 8-status
 * vocabulary. */
export function isDisputeStatusActive(status: DisputeEventStatus): boolean {
  return (
    status === "NEEDS_RESPONSE" ||
    status === "UNDER_REVIEW" ||
    status === "MORE_EVIDENCE_NEEDED" ||
    status === "REOPENED"
  );
}

/** Whether money ultimately left the merchant because of this dispute
 * (CHARGED_BACK and ACCEPTED are two different reasons for the same money
 * movement, EXPIRED is "treated as charged back" per the spec). Drives the
 * transaction-level precedence in transactionStatus.ts, which only cares
 * about the money outcome, not which of the three reasons caused it. */
export function didDisputeMoneyLeaveTheMerchant(status: DisputeEventStatus): boolean {
  return status === "CHARGED_BACK" || status === "ACCEPTED" || status === "EXPIRED";
}

/** New field, separate from `reviewPhase` (which only distinguishes
 * PayGlocal's vs. the bank's own review while status is UNDER_REVIEW): this
 * tracks the dispute's broader stage in the card-network process, shown as
 * its own badge beside the status, never merged into it (status-vocabulary
 * spec §19). */
export type DisputePhase = "INQUIRY" | "CHARGEBACK" | "PRE_ARBITRATION" | "ARBITRATION";

export const DISPUTE_PHASE_META: Record<DisputePhase, { label: string; description: string }> = {
  INQUIRY: {
    label: "Inquiry",
    description: "Bank asking questions. No money held yet.",
  },
  CHARGEBACK: {
    label: "Dispute",
    description: "The first round. Accept, or contest with evidence before the deadline.",
  },
  PRE_ARBITRATION: {
    label: "Pre-arbitration",
    description:
      "The customer's bank escalated after reviewing your evidence. Accept, or submit additional evidence.",
  },
  ARBITRATION: {
    label: "Arbitration",
    description:
      "The final stage. Withdraw, or let the bank decide; losing carries an arbitration fee.",
  },
};
