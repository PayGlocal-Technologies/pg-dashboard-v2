"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils/format";
import { DisputeActionCard } from "@/features/dashboard/dispute-management/components/detail/DisputeActionCard";
import { DisputeEscalationCard } from "@/features/dashboard/dispute-management/components/detail/DisputeEscalationCard";
import {
  DisputeStatusNoticeCard,
  type SubmittedDocument,
} from "@/features/dashboard/dispute-management/components/detail/DisputeStatusNoticeCard";
import {
  DisputeStageGuideDialog,
  type GuideKey,
} from "@/features/dashboard/dispute-management/components/detail/DisputeStageGuideDialog";
import type { DisputeFormStep } from "@/features/dashboard/dispute-management/components/detail/DisputeFormTimelineCard";
import { CHARGEBACK_SUPPORT_EMAIL } from "@/features/dashboard/dispute-management/constants";
import { respondBy } from "@/features/dashboard/dispute-management/helpers";
import {
  STAGE_COPY,
  formatFeeWithCode,
} from "@/features/dashboard/dispute-management/disputeStages";
import type {
  CbExternalDrawerViewStatus,
  DisputeCase,
} from "@/features/dashboard/dispute-management/types";

const SUPPORT = `Have questions? Contact us at ${CHARGEBACK_SUPPORT_EMAIL}.`;

const ICON = {
  won: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  lost: "bg-red-500/10 text-red-600 dark:text-red-400",
  waiting: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

/** The guide each production state opens, in the guide's own vocabulary. */
const GUIDE_FOR: Record<CbExternalDrawerViewStatus, GuideKey> = {
  ACTION_REQUIRED: "NEEDS_RESPONSE",
  UPLOAD_DOC: "NEEDS_RESPONSE",
  INSUFFICIENT_DOC: "MORE_EVIDENCE_NEEDED",
  UNDER_REVIEW: "UNDER_REVIEW",
  READY_TO_REPRESENT: "UNDER_REVIEW",
  BANK_REVIEW: "UNDER_REVIEW",
  DISPUTE_CLOSED: "ACCEPTED",
  DISPUTE_CLOSED_MERCHANT_FAV: "CLEARED",
  DISPUTE_CLOSED_CUSTOMER_FAV: "CHARGED_BACK",
  NO_RESPONSE: "EXPIRED",
  DISPUTE_RESOLVED_BY_REFUND: "CLEARED",
};

/** "on 27 Jul '26, 09:49 AM", or nothing when the API has no date yet. */
function onDate(value: string | null | undefined): string {
  const formatted = value ? formatTimestamp(value, "") : "";
  return formatted ? ` on ${formatted}` : "";
}

/**
 * The one "what's happening with this dispute right now" card, chosen by the
 * case's level and merchant view status exactly as pg-dashboard's three
 * merchant action cards choose their branch (CbDisputeActionCard,
 * CbPreArbActionCard, CbArbActionCard). A dispute resolved by refund shows
 * no card, as there.
 */
export function DisputeStatusCard({
  dispute,
  documents,
  now,
  onAccept,
  onContest,
  onWithdraw,
  onUploadEvidence,
}: {
  dispute: DisputeCase;
  /** The merchant's proof documents (`/doc/details`). */
  documents: SubmittedDocument[];
  now: number;
  onAccept: () => void;
  onContest: () => void;
  onWithdraw: () => void;
  onUploadEvidence: () => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const openGuide = () => setGuideOpen(true);

  const stage = dispute.screenStage;
  const isArb = stage === "ARBITRATION";
  const copy = STAGE_COPY[stage];
  const due = respondBy(dispute.dueDate, now);
  const dueOn = formatTimestamp(dispute.dueDate, "");
  const money = (amount: number | null) => formatCurrency(amount ?? 0, dispute.currency);

  // "Dispute progress", pg-dashboard's StyledSteps for each state.
  const submittedStep: DisputeFormStep = {
    label: "Documents submitted",
    description: `Your supporting evidence was submitted${onDate(dispute.submittedOn)}.`,
    state: "complete",
  };
  const sentStep = (state: DisputeFormStep["state"]): DisputeFormStep => ({
    label: "Sent to the bank",
    description: `Your evidence was reviewed and sent to the customer's bank${onDate(dispute.representedOn)}.`,
    state,
  });
  const bankStep = (state: DisputeFormStep["state"]): DisputeFormStep => ({
    label: "Bank review",
    description:
      state === "current"
        ? `The bank is reviewing your dispute now. This may take ${copy.bankReviewTime}.`
        : `The bank may take ${copy.bankReviewTime} to make a final decision.`,
    state,
  });
  const decisionStep: DisputeFormStep = {
    label: "Final decision",
    description: `If the decision is in your favour, the dispute will be closed. ${copy.ifLost}`,
    state: "locked",
  };
  const uploadSteps = (additional: boolean): DisputeFormStep[] => [
    {
      label: additional ? "Upload additional evidence" : "Upload supporting evidence",
      description: dueOn ? `Upload by ${dueOn}.` : "Upload before the response deadline.",
      state: "current",
    },
    {
      label: "PayGlocal review",
      description: "We'll review your evidence and create a representation document for bank review.",
      state: "locked",
    },
    bankStep("locked"),
    decisionStep,
  ];

  const partialCallout =
    dispute.levelAcceptedAmount && dispute.levelAcceptedAmount !== 0
      ? {
          tone: "info" as const,
          title: "Partially accepted",
          points: [
            `${money(dispute.levelAcceptedAmount)} has been accepted and returned to the customer`,
            `You're contesting the remaining ${money(dispute.levelContestedAmount)}`,
          ],
        }
      : undefined;

  const docs = documents.length > 0 ? documents : undefined;
  let card: React.ReactNode = null;

  switch (dispute.status) {
    case "ACTION_REQUIRED":
      card =
        stage === "CHARGEBACK" ? (
          <DisputeActionCard
            dispute={dispute}
            now={now}
            onLearnMore={openGuide}
            onAccept={onAccept}
            onContest={onContest}
          />
        ) : (
          <DisputeEscalationCard
            dispute={dispute}
            now={now}
            onAccept={onAccept}
            onWithdraw={onWithdraw}
            onContest={onContest}
            onLearnMore={openGuide}
          />
        );
      break;

    case "UPLOAD_DOC":
      card = (
        <DisputeStatusNoticeCard
          icon="upload"
          iconClassName={ICON.waiting}
          title={stage === "CHARGEBACK" ? "Submit supporting evidence" : "Submit additional evidence"}
          badge={due}
          description="Upload the documents that support your case, then submit them for review before the deadline."
          callout={partialCallout}
          documents={docs}
          documentsTitle="Uploaded documents"
          action={{ label: "Upload documents", onClick: onUploadEvidence }}
          steps={uploadSteps(stage !== "CHARGEBACK")}
          onLearnMore={openGuide}
        />
      );
      break;

    case "INSUFFICIENT_DOC":
      card = (
        <DisputeStatusNoticeCard
          icon="alert-triangle"
          iconClassName={ICON.lost}
          title="Submit additional supporting evidence"
          badge={due}
          description="We need more information to investigate this dispute. Please upload additional documents to submit more supporting evidence. Check comments below for more details."
          documents={docs}
          action={{ label: "Upload additional documents", onClick: onUploadEvidence }}
          steps={uploadSteps(true)}
          onLearnMore={openGuide}
        />
      );
      break;

    case "UNDER_REVIEW":
      card = (
        <DisputeStatusNoticeCard
          icon="clock"
          iconClassName={ICON.waiting}
          title="Under review"
          description="We're reviewing your dispute evidence. No action is needed from you right now."
          callout={partialCallout}
          documents={docs}
          steps={[
            submittedStep,
            {
              label: "PayGlocal review",
              description:
                "We're reviewing your evidence to create a representation document for bank review.",
              state: "current",
            },
            bankStep("locked"),
            decisionStep,
          ]}
          onLearnMore={openGuide}
        />
      );
      break;

    case "READY_TO_REPRESENT":
      card = (
        <DisputeStatusNoticeCard
          icon="clock"
          iconClassName={ICON.waiting}
          title={isArb ? "Representation in progress" : "Evidence approved"}
          description={
            isArb
              ? "Our internal team is going to represent your dispute to the bank. No action is needed from you at this moment."
              : "Uploaded documents have been reviewed. We're now creating a representation document for bank review."
          }
          callout={partialCallout}
          documents={docs}
          steps={
            isArb
              ? [
                  {
                    label: "Representation",
                    description: "Your dispute will be represented to the bank for further review.",
                    state: "current",
                  },
                  bankStep("locked"),
                  decisionStep,
                ]
              : [
                  submittedStep,
                  {
                    label: "Representation",
                    description: "We're creating a representation document for bank review.",
                    state: "current",
                  },
                  bankStep("locked"),
                  decisionStep,
                ]
          }
          onLearnMore={openGuide}
        />
      );
      break;

    case "BANK_REVIEW":
      card = (
        <DisputeStatusNoticeCard
          icon="clock"
          iconClassName={ICON.waiting}
          title="Bank is reviewing your evidence"
          description="Bank is reviewing the evidence. We'll notify you when we have a decision from the bank."
          callout={partialCallout}
          documents={docs}
          steps={[...(isArb ? [] : [submittedStep]), sentStep("complete"), bankStep("current"), decisionStep]}
          onLearnMore={openGuide}
        />
      );
      break;

    case "DISPUTE_CLOSED":
      card = isArb ? (
        <DisputeStatusNoticeCard
          icon="alert-triangle"
          iconClassName={ICON.lost}
          title="Dispute withdrawn"
          description={`${dispute.decidedByPayGlocal ? "We've withdrawn this dispute on your behalf." : "You've withdrawn this dispute."} ${money(dispute.levelAcceptedAmount)} returned to customer and settled from your account. ${SUPPORT}`}
          callout={
            dispute.withdrawalFee
              ? {
                  tone: "error",
                  title: "What this means",
                  points: [
                    `A ${formatFeeWithCode(dispute.withdrawalFee)} withdrawal fee has been applied and will be settled from your account`,
                  ],
                }
              : undefined
          }
          documents={docs}
          onLearnMore={openGuide}
        />
      ) : (
        <DisputeStatusNoticeCard
          icon="alert-triangle"
          iconClassName={ICON.lost}
          title="Dispute accepted"
          description={`${dispute.decidedByPayGlocal ? "We've accepted this dispute on your behalf." : "You've accepted this dispute."} ${money(dispute.levelAcceptedAmount)} has been returned to customer and settled from your account. ${SUPPORT}`}
          onLearnMore={openGuide}
        />
      );
      break;

    case "DISPUTE_CLOSED_MERCHANT_FAV":
      card = (
        <DisputeStatusNoticeCard
          icon="check-circle"
          iconClassName={ICON.won}
          title="Dispute won"
          description="You've won this dispute."
          documents={docs}
          steps={[
            ...(isArb ? [] : [submittedStep]),
            sentStep("complete"),
            { label: "Bank review", description: "The bank has completed its review.", state: "complete" },
            {
              label: "Final decision",
              description: `The dispute was resolved in your favour${onDate(dispute.closedOn)}.`,
              state: "complete",
            },
          ]}
          onLearnMore={openGuide}
        />
      );
      break;

    case "DISPUTE_CLOSED_CUSTOMER_FAV":
      // Only arbitration closes in the customer's favour: a loss at an earlier
      // level escalates instead. pg-dashboard handles it in CbArbActionCard alone.
      if (!isArb) break;
      card = (
        <DisputeStatusNoticeCard
          icon="alert-triangle"
          iconClassName={ICON.lost}
          title="Dispute lost"
          description={`You've lost this dispute. ${money(dispute.amount)} returned to customer and settled from your account. ${SUPPORT}`}
          callout={
            dispute.penaltyFee
              ? {
                  tone: "error",
                  title: "What this means",
                  points: [
                    `A ${formatFeeWithCode(dispute.penaltyFee)} arbitration fee has been applied and will be settled from your account`,
                    "Arbitration decisions are final and cannot be re-contested",
                  ],
                }
              : undefined
          }
          documents={docs}
          steps={[
            sentStep("complete"),
            { label: "Bank review", description: "Bank review completed.", state: "complete" },
            {
              label: "Final decision",
              description: `Dispute resolved in customer's favour${onDate(dispute.closedOn)}.`,
              state: "complete",
            },
          ]}
          onLearnMore={openGuide}
        />
      );
      break;

    case "NO_RESPONSE":
      card = (
        <DisputeStatusNoticeCard
          icon="alert-triangle"
          iconClassName={ICON.lost}
          title="Dispute lost"
          description={`You lost this dispute due to no response from your end. ${money(dispute.amount)} has been returned to customer and settled from your account. ${SUPPORT}`}
          onLearnMore={openGuide}
        />
      );
      break;

    case "DISPUTE_RESOLVED_BY_REFUND":
      card = null;
      break;
  }

  if (!card) return null;

  return (
    <>
      {card}
      <DisputeStageGuideDialog
        guide={GUIDE_FOR[dispute.status]}
        stage={stage}
        dispute={dispute}
        open={guideOpen}
        onOpenChange={setGuideOpen}
      />
    </>
  );
}
