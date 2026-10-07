"use client";

import { useState } from "react";
import { formatDisplayDateTime } from "@/features/dashboard/pa-transactions/paColumns";
import { DisputeActionCard } from "@/features/dashboard/pa-transactions/components/DisputeActionCard";
import {
  DisputeStatusNoticeCard,
  type SubmittedDocument,
} from "@/features/dashboard/pa-transactions/components/DisputeStatusNoticeCard";
import { DisputeStageGuideDialog } from "@/features/dashboard/pa-transactions/components/DisputeStageGuideDialog";
import type { DisputeFormStep } from "@/features/dashboard/pa-transactions/components/DisputeFormTimelineCard";
import type { DisputeDetail } from "@/features/dashboard/pa-transactions/deriveTransactionDetail";
import type { DisputeEvent } from "@/features/dashboard/pa-transactions/financial/types";
import { getMockDocumentPreviewUrl } from "@/features/dashboard/pa-transactions/mockDocumentPreview";
import { DisputeEscalationCard } from "@/features/dashboard/pa-transactions/components/DisputeEscalationCard";
import { formatCurrency } from "@/lib/utils";
import {
  STAGE_COPY,
  formatFee,
  reviewPhaseOf,
  stageOf,
  underReviewMessage,
} from "@/features/dashboard/pa-transactions/status/disputeStages";

export interface DisputeStatusCardProps {
  dispute: DisputeEvent;
  disputeDetail: DisputeDetail;
  onAccept: () => void;
  onContest: () => void;
  /** Arbitration only: close the case for the customer. */
  onWithdraw?: () => void;
  /** Session-only re-upload override (see DisputeDetailFeature's own
   * submittedDocuments state), falls back to dispute.documents when unset. */
  submittedDocuments?: SubmittedDocument[];
}

// dispute.documents (mock/persisted data) is plain filenames with no real
// File/blob behind them, so a genuine preview is impossible — but for a
// dispute that's already "Under review" with evidence attached, an empty
// file icon reads as if nothing had actually been uploaded. Filenames that
// look like an image get a small placeholder thumbnail (see
// getMockDocumentPreviewUrl's own doc comment), everything else still falls
// back to the plain file icon, same rule a real upload follows.
function asDocuments(names: string[] | undefined): SubmittedDocument[] | undefined {
  return names?.map((name) => ({ name, previewUrl: getMockDocumentPreviewUrl(name) }));
}

/** The one "what's happening with this dispute right now" card — Accept/
 * Contest while awaiting a decision, otherwise a terminal/in-review notice.
 * Shared by DisputeDetailFeature (the dispute's own page) and
 * TransactionDetailFeature (the parent transaction's page, which shows this
 * same card for any transaction carrying a live dispute — Disputed, or
 * Refunded and disputed — so the two pages can never tell a different story
 * about the exact same dispute). */
export function DisputeStatusCard({
  dispute,
  disputeDetail,
  onAccept,
  onContest,
  onWithdraw,
  submittedDocuments,
}: DisputeStatusCardProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const openGuide = () => setGuideOpen(true);

  const stage = stageOf(dispute);
  const stageCopy = STAGE_COPY[stage];
  const money = formatCurrency(dispute.amount, dispute.currency);
  const support = "Have questions? Contact us at support@payglocal.in.";
  const disputeAwaitingDecision =
    dispute.status === "NEEDS_RESPONSE" || dispute.status === "REOPENED";
  const documents =
    submittedDocuments && submittedDocuments.length > 0
      ? submittedDocuments
      : asDocuments(dispute.documents);

  // "Dispute progress" while under review, per the "Pre-arb and arb"
  // design: submitted, PayGlocal's review (or, at arbitration, preparing the
  // representation from what was already submitted), the bank's review, and
  // what happens either way.
  const phase = reviewPhaseOf(dispute);
  const submittedOn = dispute.evidenceSubmittedOn
    ? (formatDisplayDateTime(dispute.evidenceSubmittedOn) ?? dispute.evidenceSubmittedOn)
    : undefined;
  const underReviewSteps: DisputeFormStep[] = [
    {
      label: stage === "ARBITRATION" ? "Contest confirmed" : "Documents submitted",
      description:
        stage === "ARBITRATION"
          ? "You chose to continue to arbitration. No new documents are needed."
          : submittedOn
            ? `Submitted on ${submittedOn}.`
            : "Your supporting evidence has been received.",
      state: "complete",
    },
    {
      label: stage === "ARBITRATION" ? "Representation" : "PayGlocal review",
      description:
        phase === "BANK_REVIEW"
          ? "Your evidence was reviewed and sent to the customer's bank."
          : phase === "APPROVED"
            ? "Your documents were approved. We're creating a representation document for bank review."
            : stage === "ARBITRATION"
              ? "We're creating a representation document for bank review."
              : "We're reviewing your evidence to create a representation document for bank review.",
      state: phase === "BANK_REVIEW" ? "complete" : "current",
    },
    {
      label: "Bank review",
      description:
        phase === "BANK_REVIEW"
          ? `The bank is reviewing your dispute now. This may take ${stageCopy.bankReviewTime}.`
          : `The bank may take ${stageCopy.bankReviewTime} to make a final decision.`,
      state: phase === "BANK_REVIEW" ? "current" : "locked",
    },
    {
      label: "Final decision",
      description: `If the decision is in your favour, the dispute will be closed. ${stageCopy.ifLost}`,
      state: "locked",
    },
  ];

  const feeCallout = dispute.appliedFee
    ? {
        tone: "error" as const,
        title: "What this means",
        points:
          dispute.appliedFee.kind === "ARBITRATION"
            ? [
                `A ${formatFee(dispute.appliedFee)} arbitration fee has been applied and will be settled from your account`,
                "Arbitration decisions are final and cannot be re-contested",
              ]
            : [
                `A ${formatFee(dispute.appliedFee)} withdrawal fee has been applied and will be settled from your account`,
              ],
      }
    : undefined;

  let card;

  if (disputeAwaitingDecision && stage !== "CHARGEBACK") {
    card = (
      <DisputeEscalationCard
        dispute={dispute}
        onAccept={onAccept}
        onWithdraw={onWithdraw ?? onAccept}
        onContest={onContest}
        onLearnMore={openGuide}
      />
    );
  } else if (disputeAwaitingDecision) {
    card = (
      <DisputeActionCard
        merchantLabel={disputeDetail.merchantLabel}
        reasonCode={dispute.reasonCode}
        reason={dispute.reason}
        description={dispute.description}
        onLearnMore={openGuide}
        onAccept={onAccept}
        onContest={onContest}
      />
    );
  } else if (dispute.status === "CLEARED") {
    card = (
      <DisputeStatusNoticeCard
        icon="check-circle"
        iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        title="Dispute won"
        description={`You've won this dispute. The disputed amount of ${money} stays with you, and this dispute is now closed.`}
        documents={documents}
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "ACCEPTED" && dispute.withdrawn) {
    card = (
      <DisputeStatusNoticeCard
        icon="alert-triangle"
        iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
        title="Dispute withdrawn"
        description={`You've withdrawn this dispute. ${money} was returned to the customer and settled from your account. ${support}`}
        callout={feeCallout}
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "ACCEPTED") {
    card = (
      <DisputeStatusNoticeCard
        icon="alert-triangle"
        iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
        title="Dispute accepted"
        description={`You've accepted this dispute. ${money} was returned to the customer and settled from your account. ${support}`}
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "CHARGED_BACK") {
    card = (
      <DisputeStatusNoticeCard
        icon="alert-triangle"
        iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
        title="Dispute lost"
        description={`You've lost this dispute. ${money} was returned to the customer and settled from your account. ${support}`}
        callout={feeCallout}
        documents={documents}
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "EXPIRED") {
    card = (
      <DisputeStatusNoticeCard
        icon="alert-triangle"
        iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
        title="Dispute lost"
        description={`You lost this dispute because there was no response before the deadline. ${money} was returned to the customer and settled from your account. ${support}`}
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "MORE_EVIDENCE_NEEDED") {
    card = (
      <DisputeStatusNoticeCard
        icon="alert-triangle"
        iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
        title="Insufficient documents"
        description="We need more information to investigate this dispute. Please upload additional documents to submit more supporting evidence."
        documents={asDocuments(dispute.documents)}
        action={{ label: "Upload documents", onClick: onContest }}
        onLearnMore={openGuide}
      />
    );
  } else {
    const accepted =
      dispute.acceptedAmount !== undefined
        ? {
            tone: "info" as const,
            title: "Partially accepted",
            points: [
              `${formatCurrency(dispute.acceptedAmount, dispute.currency)} has been accepted and will be returned to the customer`,
              `The remaining ${formatCurrency(dispute.amount - dispute.acceptedAmount, dispute.currency)} is still under dispute`,
            ],
          }
        : undefined;
    card = (
      <DisputeStatusNoticeCard
        icon="clock"
        iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        title={
          phase === "BANK_REVIEW"
            ? "Bank is reviewing your evidence"
            : phase === "APPROVED"
              ? "Evidence approved"
              : "Under review"
        }
        description={underReviewMessage(dispute)}
        callout={accepted}
        documents={documents}
        steps={underReviewSteps}
        onLearnMore={openGuide}
      />
    );
  }

  return (
    <>
      {card}
      <DisputeStageGuideDialog
        status={dispute.status}
        stage={stageOf(dispute)}
        open={guideOpen}
        onOpenChange={setGuideOpen}
      />
    </>
  );
}
