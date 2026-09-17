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

export interface DisputeStatusCardProps {
  dispute: DisputeEvent;
  disputeDetail: DisputeDetail;
  onAccept: () => void;
  onContest: () => void;
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
  submittedDocuments,
}: DisputeStatusCardProps) {
  // Owned right here rather than threaded in from either caller — the
  // explainer content is keyed off `dispute.status` alone (see
  // DisputeStageGuideDialog), so there's nothing page-specific for
  // TransactionDetailFeature/DisputeDetailFeature to supply.
  const [guideOpen, setGuideOpen] = useState(false);
  const openGuide = () => setGuideOpen(true);

  // "Needs response" covers a freshly raised dispute awaiting accept/
  // contest, and REOPENED (a cleared dispute the bank came back on, the
  // merchant must respond again the same way). MORE_EVIDENCE_NEEDED also
  // needs the merchant to act, but is its own distinct notice (re-upload,
  // not a first-time accept/contest choice), handled in its own branch.
  const disputeAwaitingDecision =
    dispute.status === "NEEDS_RESPONSE" || dispute.status === "REOPENED";
  const isUnderBankReview = dispute.reviewPhase === "BANK_REVIEW";

  const underReviewSteps: DisputeFormStep[] | undefined =
    dispute.status === "UNDER_REVIEW"
      ? [
          {
            label: "Chargeback",
            description: formatDisplayDateTime(dispute.raisedOn) ?? dispute.raisedOn,
            state: "complete",
          },
          {
            label: "Merchant Response",
            description: "Upload supporting documents before the response deadline.",
            state: "complete",
          },
          {
            label: "Evidence Submitted",
            description: "Your supporting evidence has been received and queued for review.",
            state: "complete",
          },
          {
            label: "PayGlocal Review",
            description: isUnderBankReview
              ? "Your evidence was reviewed and a representation was prepared for the issuing bank."
              : "PayGlocal will review your evidence and prepare a representation for submission to the issuing bank.",
            state: isUnderBankReview ? "complete" : "current",
          },
          {
            label: "Bank Review",
            description:
              "The issuing bank may take up to approximately 60 business days to review the submitted evidence and issue a decision.",
            state: isUnderBankReview ? "current" : "locked",
          },
          {
            label: "Final Decision",
            description:
              "If the decision is in your favour, the dispute will close successfully. Otherwise, depending on the card network's process, the case may proceed to Pre-Arbitration.",
            state: "locked",
          },
          { label: "Closed", description: "", state: "locked" },
        ]
      : undefined;

  let card;

  if (disputeAwaitingDecision) {
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
        title="Dispute cleared"
        description="You successfully contested this dispute, the disputed amount stays with you. This dispute is now closed."
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "ACCEPTED") {
    card = (
      <DisputeStatusNoticeCard
        icon="check-circle"
        iconClassName="bg-muted text-muted-foreground"
        title="Dispute closed"
        description="You accepted this dispute and a refund was initiated to the cardholder. This dispute is now closed."
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "CHARGED_BACK") {
    card = (
      <DisputeStatusNoticeCard
        icon="alert-triangle"
        iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
        title="Dispute charged back"
        description="The bank ruled in the cardholder's favour. This dispute is now closed and the disputed amount was charged back."
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "EXPIRED") {
    card = (
      <DisputeStatusNoticeCard
        icon="alert-triangle"
        iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
        title="Dispute expired"
        description="The response deadline passed without a reply. This dispute is now closed and treated as a chargeback."
        onLearnMore={openGuide}
      />
    );
  } else if (dispute.status === "MORE_EVIDENCE_NEEDED") {
    card = (
      <DisputeStatusNoticeCard
        icon="alert-triangle"
        iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
        title="More evidence needed"
        description="We need more information to investigate this dispute. Please upload additional documents to submit more supporting evidence."
        documents={asDocuments(dispute.documents)}
        action={{ label: "Upload documents", onClick: onContest }}
        onLearnMore={openGuide}
      />
    );
  } else {
    card = (
      <DisputeStatusNoticeCard
        icon="clock"
        iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        title={isUnderBankReview ? "Bank is reviewing your evidence" : "Under review"}
        description={
          isUnderBankReview
            ? "Bank is reviewing the evidence. We'll notify you when we have a decision from the bank."
            : "Your documents have been submitted and will be reviewed."
        }
        documents={
          submittedDocuments && submittedDocuments.length > 0
            ? submittedDocuments
            : asDocuments(dispute.documents)
        }
        steps={underReviewSteps}
        onLearnMore={openGuide}
      />
    );
  }

  return (
    <>
      {card}
      <DisputeStageGuideDialog status={dispute.status} open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
