import { currencySymbol } from "@/lib/utils/format";
import type {
  DisputeCase,
  DisputeScreenStage,
  Fee,
} from "@/features/dashboard/dispute-management/types";

/**
 * Stage-specific copy for the dispute screens, in one place, from
 * pg-dashboard's three merchant action cards (CbDisputeActionCard,
 * CbPreArbActionCard, CbArbActionCard):
 *
 *   Dispute ──lost──▶ Pre-arbitration ──lost──▶ Arbitration (final)
 *
 * Both compliance levels use the pre-arbitration screen. Fees are the
 * dispute's own (`cbCaseMetaData.arbFeeData`); where the case carries none,
 * the copy says a fee "may apply", as pg-dashboard does.
 */

/** `₹800`, a fee as the cards write it: whole amounts without decimals. */
export function formatFee(fee: Fee): string {
  const amount = Number.isInteger(fee.amount) ? String(fee.amount) : fee.amount.toFixed(2);
  return `${currencySymbol(fee.currency)}${amount}`;
}

/** `₹800 INR`, with the code, as the closing notices write it. */
export function formatFeeWithCode(fee: Fee): string {
  return `${formatFee(fee)} ${fee.currency}`;
}

export const STAGE_COPY: Record<
  DisputeScreenStage,
  {
    /** "Otherwise, …" at the end of the progress steps. */
    ifLost: string;
    /** How long the bank takes once it has the representation. */
    bankReviewTime: string;
  }
> = {
  CHARGEBACK: {
    ifLost: "Otherwise, it may move to pre-arbitration.",
    bankReviewTime: "up to 120 business days",
  },
  PRE_ARBITRATION: {
    ifLost: "Otherwise, it may move to arbitration.",
    bankReviewTime: "up to 45 business days",
  },
  ARBITRATION: {
    ifLost:
      "Otherwise, the contested amount will be returned to the customer and settled from your account.",
    bankReviewTime: "up to 24 hours",
  },
};

/**
 * The "Before you proceed, here's what to know" points on a stage's decision
 * card: PREARB_INFO and ARB_INFO, with the dispute's own fees.
 */
export function stageWarnings(dispute: DisputeCase): string[] {
  const { penaltyFee, withdrawalFee } = dispute;
  if (dispute.screenStage === "PRE_ARBITRATION") {
    return [
      "At this stage, you need to submit additional supporting documents to continue contesting the dispute.",
      penaltyFee
        ? `If this case moves to arbitration and the decision is not in your favour, an arbitration fee up to ${formatFeeWithCode(penaltyFee)} may apply`
        : "If this case moves to arbitration and the decision is not in your favour, an arbitration fee may apply",
      "You can choose to accept the dispute at this stage to avoid further escalation",
    ];
  }
  if (dispute.screenStage === "ARBITRATION") {
    return [
      "Arbitration is the final stage of the dispute process",
      "No further documents or actions can be taken at this stage",
      // pg-dashboard leaves both fee lines out when the case carries neither fee.
      ...(penaltyFee === null && withdrawalFee === null
        ? []
        : [
            penaltyFee
              ? `If the dispute is decided against you, an arbitration fee of ${formatFee(penaltyFee)} may apply`
              : "If the dispute is closed against you, an arbitration fee may be charged",
            withdrawalFee
              ? `If you choose to withdraw at this stage, a withdrawal fee of ${formatFee(withdrawalFee)} may apply`
              : "If you choose to withdraw at this stage, an additional fee may apply",
          ]),
    ];
  }
  return [
    "Submit all relevant documents at this stage itself",
    "Providing complete evidence early on improves your chances of resolving the dispute in your favour and helps avoid escalation to higher stages",
  ];
}
