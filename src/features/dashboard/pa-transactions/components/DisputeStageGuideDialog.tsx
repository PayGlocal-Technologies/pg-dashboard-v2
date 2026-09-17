import { Dialog, DialogContent, DialogTitle, Separator } from "@/components/ui";
import type { DisputeEventStatus } from "@/features/dashboard/pa-transactions/financial/types";

interface StageGuide {
  title: string;
  paragraphs: string[];
}

/** One plain-language explainer per dispute status, shown from the "Learn
 * more" link on whichever card is currently on screen (DisputeActionCard
 * for an awaiting-decision dispute, DisputeStatusNoticeCard for every other
 * status) — see the dispute-workflow reference this content is drawn from:
 * every dispute runs the same Raised -> Evidence -> PayGlocal review -> Bank
 * review cycle, escalating through Dispute -> Pre-arbitration -> Arbitration
 * on each loss, which is why that ladder is repeated as shared context
 * below rather than only explaining the one status in isolation. */
const STAGE_GUIDES: Record<DisputeEventStatus, StageGuide> = {
  NEEDS_RESPONSE: {
    title: "Needs response",
    paragraphs: [
      "A cardholder has disputed this payment and asked their bank to reverse it. You now have until the response deadline shown above to either accept the dispute or contest it with evidence.",
      "Accepting refunds the disputed amount to the cardholder immediately and closes the case. Contesting means uploading supporting evidence (an invoice, proof of delivery, an authorization record) for PayGlocal and then the issuing bank to review.",
      "If you miss the deadline without responding, the dispute is automatically treated as lost, the same outcome as losing a bank review, so it's always worth at least accepting rather than letting it expire.",
    ],
  },
  REOPENED: {
    title: "Reopened",
    paragraphs: [
      "This dispute was previously cleared in your favor, but the cardholder's bank has come back and reopened it. This usually happens when the cardholder or their bank isn't satisfied with the first outcome and is preparing to push the case further.",
      "You'll need to respond again, the same as a fresh dispute: accept it, or contest it with evidence, before the new deadline shown above.",
      "If this round is lost too, the dispute escalates to the next level (Pre-arbitration, then Arbitration if it's lost again there) rather than closing.",
    ],
  },
  UNDER_REVIEW: {
    title: "Under review",
    paragraphs: [
      "Your evidence has been submitted and is now being reviewed in two stages. First, PayGlocal checks that it's complete and relevant to this specific transaction.",
      "Once PayGlocal approves it, the evidence is forwarded to the issuing bank, who makes the final call on whether the dispute is cleared in your favor or charged back to the cardholder.",
      "This can take some time, especially once it reaches the bank. You'll be notified the moment there's a decision, no action is needed from you while this is in progress.",
    ],
  },
  MORE_EVIDENCE_NEEDED: {
    title: "More evidence needed",
    paragraphs: [
      "PayGlocal reviewed the evidence you submitted and found it wasn't sufficient to make the case to the issuing bank on your behalf.",
      "You'll need to upload additional documents before the new deadline shown above. Common gaps are a clearer proof of delivery, an authorization record that specifically covers this transaction, or your refund/cancellation policy if the reason involves a cancellation.",
      "If new documents still aren't accepted, or the deadline passes, the dispute is treated as lost, the same as a bank ruling against you.",
    ],
  },
  CLEARED: {
    title: "Dispute cleared",
    paragraphs: [
      "The issuing bank reviewed the evidence and ruled in your favor. The disputed amount stays with you and this dispute is now closed.",
      "It's uncommon but possible for the cardholder's bank to come back and reopen the case later (see the Reopened status), otherwise there's nothing further to do here.",
    ],
  },
  CHARGED_BACK: {
    title: "Dispute charged back",
    paragraphs: [
      "The issuing bank ruled in the cardholder's favor. This round is now closed and the disputed amount was returned to them.",
      "If this dispute hadn't yet reached Arbitration (the final escalation level), it may escalate further automatically rather than staying closed. Losing specifically at Arbitration also carries a network penalty fee on top of the disputed amount.",
    ],
  },
  ACCEPTED: {
    title: "Dispute accepted",
    paragraphs: [
      "You chose to accept this dispute instead of contesting it. The disputed amount was refunded to the cardholder right away and no evidence or bank review was needed.",
      "This is recorded as a loss for reporting purposes, even though it was your own decision rather than a bank ruling, since the money did leave your account the same way a chargeback would.",
    ],
  },
  EXPIRED: {
    title: "Dispute expired",
    paragraphs: [
      "The response deadline passed without a reply, so the dispute defaulted to a loss, the same outcome as being charged back, but caused by a missed deadline rather than a bank decision.",
      "Always accept or contest a live dispute before its deadline (see the Needs response/More evidence needed statuses) to avoid this outcome.",
    ],
  },
};

/** Shared context shown under every status's own explanation, since a
 * single dispute can run through this whole ladder — see the STAGE_GUIDES
 * doc comment above. */
const ESCALATION_LADDER = [
  { label: "Dispute", description: "The first round, right after the cardholder's bank raises it." },
  {
    label: "Pre-arbitration",
    description: "The bank came back after losing the first round and is trying again.",
  },
  {
    label: "Arbitration",
    description: "The card network itself decides. This is final, and losing carries a penalty fee.",
  },
];

interface DisputeStageGuideDialogProps {
  status: DisputeEventStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The "Learn more" pop-up for whichever dispute status is currently
 * showing on DisputeStatusCard, reached identically from a transaction's
 * own page or the dispute's own page (see DisputeStatusCard's own doc
 * comment) — the explanation can never differ depending on which page the
 * merchant started from. */
export function DisputeStageGuideDialog({ status, open, onOpenChange }: DisputeStageGuideDialogProps) {
  const guide = STAGE_GUIDES[status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>{guide.title}</DialogTitle>
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          {guide.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <Separator className="my-1" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            How escalation works
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {ESCALATION_LADDER.map((level, i) => (
              <div key={level.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground/85">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-foreground/85">{level.label}</p>
                  <p className="text-xs text-muted-foreground">{level.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
