import type { StatusMeta } from "@/features/dashboard/pa-transactions/status/types";
import type { DisputeEventStatus } from "@/features/dashboard/pa-transactions/financial/types";

/** One vocabulary for a dispute's own status, never a transaction or refund
 * term (status-vocabulary spec §18). NEEDS_RESPONSE covers both "just
 * raised" and "documents still needed before responding", the same
 * merchant-facing state ("the clock is running, you must act") that used to
 * be split across DISPUTED/NEEDS_ACTION. ACCEPTED is tracked separately
 * from CHARGED_BACK so win-rate reporting stays honest: a merchant who
 * accepted a dispute did not lose an argument, see withDisputeStatus. */
export const DISPUTE_STATUS_META: Record<DisputeEventStatus, StatusMeta> = {
  NEEDS_RESPONSE: {
    label: "Needs response",
    variant: "warning",
    tooltip: "Accept or contest before the deadline",
  },
  UNDER_REVIEW: { label: "Under review", variant: "info", trailIcon: "clock" },
  MORE_EVIDENCE_NEEDED: { label: "More evidence needed", variant: "warning", trailIcon: "alert" },
  REOPENED: { label: "Reopened", variant: "warning" },
  CLEARED: { label: "Cleared", variant: "success", trailIcon: "check" },
  CHARGED_BACK: { label: "Charged back", variant: "danger", trailIcon: "x" },
  ACCEPTED: { label: "Accepted", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "danger" },
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
    label: "Chargeback",
    description: "Formal claim. Money held.",
  },
  PRE_ARBITRATION: {
    label: "Pre-arbitration",
    description: "The dispute cleared and the bank came back.",
  },
  ARBITRATION: {
    label: "Arbitration",
    description: "The card network decides. Losing carries a significant fee.",
  },
};
