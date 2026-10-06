import type {
  DisputeEvent,
  DisputeReviewPhase,
} from "@/features/dashboard/pa-transactions/financial/types";

/**
 * The escalation workflow, from the "Pre-arb and arb" design (Desktop >
 * PayGlocal Dashboard > Pre-arb and arb.pdf), in one place: what each stage
 * offers, what it costs, how long the bank takes, and what happens if the
 * merchant loses. Every dispute screen reads its stage-specific copy from
 * here so the stages can never drift apart.
 *
 *   Dispute ──lost──▶ Pre-arbitration ──lost──▶ Arbitration (final)
 *
 *  - Dispute / Pre-arbitration: Accept (full or partial) or Contest. Contest
 *    means uploading evidence, which PayGlocal reviews (it can ask for more:
 *    Insufficient documents), turns into a representation and sends to the
 *    customer's bank. Losing escalates to the next stage; not responding
 *    closes it against the merchant.
 *  - Arbitration: no new documents. Withdraw (the amount goes back to the
 *    customer, and a withdrawal fee may apply) or Continue contesting (the
 *    bank makes a final decision; losing also charges an arbitration fee).
 *
 * MOCK: the fee amounts are the design's; the real ones come from the card
 * network and the merchant's pricing. TODO(integration).
 */

export type EscalationStage = "CHARGEBACK" | "PRE_ARBITRATION" | "ARBITRATION";

/** The disputed stage, defaulting to the first round. */
export function stageOf(dispute: Pick<DisputeEvent, "disputePhase">): EscalationStage {
  const p = dispute.disputePhase;
  return p === "PRE_ARBITRATION" || p === "ARBITRATION" ? p : "CHARGEBACK";
}

/** Card-network fees, charged in USD. */
export const ARBITRATION_FEE = { amount: 800, currency: "USD" } as const;
export const WITHDRAWAL_FEE = { amount: 200, currency: "USD" } as const;

export function formatFee(fee: { amount: number; currency: string }): string {
  // "$800", not "$800.00": fees are whole amounts, as the design shows them.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: fee.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(fee.amount);
}

export const STAGE_COPY: Record<
  EscalationStage,
  {
    label: string;
    /** "Otherwise, …" at the end of the progress steps. */
    ifLost: string;
    /** How long the bank takes once it has the representation. */
    bankReviewTime: string;
  }
> = {
  CHARGEBACK: {
    label: "Dispute",
    ifLost: "Otherwise, it may move to pre-arbitration.",
    bankReviewTime: "up to 60 business days",
  },
  PRE_ARBITRATION: {
    label: "Pre-arbitration",
    ifLost: "Otherwise, it may move to arbitration.",
    bankReviewTime: "up to 60 business days",
  },
  ARBITRATION: {
    label: "Arbitration",
    ifLost:
      "Otherwise, the contested amount will be returned to the customer and settled from your account.",
    bankReviewTime: "up to 24 hours",
  },
};

/** The "Before you proceed, here's what to know" points on a stage's
 *  decision card. */
export function stageWarnings(dispute: DisputeEvent): string[] {
  const stage = stageOf(dispute);
  if (stage === "PRE_ARBITRATION") {
    return [
      `If this case moves to arbitration and the decision is not in your favour, an arbitration fee of up to ${formatFee(ARBITRATION_FEE)} may apply`,
      "You can choose to accept the dispute at this stage to avoid further escalation",
    ];
  }
  if (stage === "ARBITRATION") {
    return [
      "Arbitration is the final stage of the dispute process",
      "No further documents or actions can be taken at this stage",
      `If the dispute is closed against you, an arbitration fee of ${formatFee(ARBITRATION_FEE)} may apply`,
      ...(dispute.withdrawalFeeApplies
        ? [
            `If you choose to withdraw at this stage, a withdrawal fee of ${formatFee(WITHDRAWAL_FEE)} may apply`,
          ]
        : []),
    ];
  }
  return [];
}

/** Where the evidence is while a dispute is Under review. */
export function reviewPhaseOf(dispute: DisputeEvent): DisputeReviewPhase {
  return dispute.reviewPhase ?? "PAYGLOCAL_REVIEW";
}

/** The headline for an Under review dispute, per review phase. */
export function underReviewMessage(dispute: DisputeEvent): string {
  const phase = reviewPhaseOf(dispute);
  if (phase === "BANK_REVIEW") {
    return "Bank is reviewing the evidence. We'll notify you when we have a decision from the bank.";
  }
  if (phase === "APPROVED") {
    return "Uploaded documents have been approved. We're now creating a representation document for bank review.";
  }
  return stageOf(dispute) === "ARBITRATION"
    ? "We're creating your dispute evidence for bank review. No action is needed from you at this moment."
    : "We're reviewing your dispute evidence. No action is needed from you right now.";
}
