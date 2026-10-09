import {
  ARBITRATION_FEE,
  WITHDRAWAL_FEE,
  formatFee,
  type EscalationStage,
} from "@/features/dashboard/pa-transactions/status/disputeStages";
import { Badge, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { DisputeEventStatus } from "@/features/dashboard/pa-transactions/financial/types";

type GuideTone = "warning" | "info" | "success" | "danger" | "neutral";

interface GuidePoint {
  icon: IconName;
  heading: string;
  text: string;
}

interface StageGuide {
  title: string;
  /** The status's own icon and colour, as its chip shows it. */
  icon: IconName;
  tone: GuideTone;
  points: GuidePoint[];
}

const TONE_CLASS: Record<GuideTone, string> = {
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  neutral: "bg-muted text-muted-foreground",
};

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
    title: "Action required",
    icon: "alert-triangle",
    tone: "warning",
    points: [
      {
        icon: "info",
        heading: "What happened",
        text: "A cardholder has disputed this payment and asked their bank to reverse it. You now have until the response deadline shown above to either accept the dispute or contest it with evidence.",
      },
      {
        icon: "scale",
        heading: "Your options",
        text: "Accepting refunds the disputed amount to the cardholder immediately and closes the case. Contesting means uploading supporting evidence (an invoice, proof of delivery, an authorization record) for PayGlocal and then the issuing bank to review.",
      },
      {
        icon: "timer",
        heading: "If you miss the deadline",
        text: "If you miss the deadline without responding, the dispute is automatically treated as lost, the same outcome as losing a bank review, so it's always worth at least accepting rather than letting it expire.",
      },
    ],
  },
  REOPENED: {
    title: "Action required",
    icon: "alert-triangle",
    tone: "warning",
    points: [
      {
        icon: "history",
        heading: "What happened",
        text: "This dispute was previously cleared in your favor, but the cardholder's bank has come back and reopened it. This usually happens when the cardholder or their bank isn't satisfied with the first outcome and is preparing to push the case further.",
      },
      {
        icon: "scale",
        heading: "Your options",
        text: "You'll need to respond again, the same as a fresh dispute: accept it, or contest it with evidence, before the new deadline shown above.",
      },
      {
        icon: "chevrons-up",
        heading: "If this round is lost",
        text: "If this round is lost too, the dispute escalates to the next level (Pre-arbitration, then Arbitration if it's lost again there) rather than closing.",
      },
    ],
  },
  UNDER_REVIEW: {
    title: "Under review",
    icon: "clock",
    tone: "info",
    points: [
      {
        icon: "shield-check",
        heading: "PayGlocal review",
        text: "Your evidence has been submitted and is now being reviewed in two stages. First, PayGlocal checks that it's complete and relevant to this specific transaction.",
      },
      {
        icon: "landmark",
        heading: "Bank review",
        text: "Once PayGlocal approves it, the evidence is forwarded to the issuing bank, who makes the final call on whether the dispute is cleared in your favor or charged back to the cardholder.",
      },
      {
        icon: "timer",
        heading: "How long it takes",
        text: "This can take some time, especially once it reaches the bank. You'll be notified the moment there's a decision, no action is needed from you while this is in progress.",
      },
    ],
  },
  MORE_EVIDENCE_NEEDED: {
    title: "Insufficient documents",
    icon: "file-text",
    tone: "warning",
    points: [
      {
        icon: "info",
        heading: "What happened",
        text: "PayGlocal reviewed the evidence you submitted and found it wasn't sufficient to make the case to the issuing bank on your behalf.",
      },
      {
        icon: "upload",
        heading: "What to upload",
        text: "You'll need to upload additional documents before the new deadline shown above. Common gaps are a clearer proof of delivery, an authorization record that specifically covers this transaction, or your refund/cancellation policy if the reason involves a cancellation.",
      },
      {
        icon: "timer",
        heading: "If you miss the deadline",
        text: "If new documents still aren't accepted, or the deadline passes, the dispute is treated as lost, the same as a bank ruling against you.",
      },
    ],
  },
  CLEARED: {
    title: "Dispute won",
    icon: "check-circle",
    tone: "success",
    points: [
      {
        icon: "check-circle",
        heading: "Outcome",
        text: "The issuing bank reviewed the evidence and ruled in your favor. The disputed amount stays with you and this dispute is now closed.",
      },
      {
        icon: "history",
        heading: "What happens next",
        text: "It's uncommon but possible for the cardholder's bank to come back and reopen the case later (it then needs your action again), otherwise there's nothing further to do here.",
      },
    ],
  },
  CHARGED_BACK: {
    title: "Dispute lost",
    icon: "alert-circle",
    tone: "danger",
    points: [
      {
        icon: "info",
        heading: "Outcome",
        text: "The issuing bank ruled in the cardholder's favor. This round is now closed and the disputed amount was returned to them.",
      },
      {
        icon: "chevrons-up",
        heading: "What happens next",
        text: "If this dispute hadn't yet reached Arbitration (the final escalation level), it may escalate further automatically rather than staying closed. Losing specifically at Arbitration also carries a network penalty fee on top of the disputed amount.",
      },
    ],
  },
  ACCEPTED: {
    title: "Dispute accepted",
    icon: "rotate-ccw",
    tone: "danger",
    points: [
      {
        icon: "rotate-ccw",
        heading: "Outcome",
        text: "You chose to accept this dispute instead of contesting it. The disputed amount was refunded to the cardholder right away and no evidence or bank review was needed.",
      },
      {
        icon: "bar-chart",
        heading: "How it's recorded",
        text: "This is recorded as a loss for reporting purposes, even though it was your own decision rather than a bank ruling, since the money did leave your account the same way a chargeback would.",
      },
    ],
  },
  EXPIRED: {
    title: "Dispute lost",
    icon: "alert-circle",
    tone: "danger",
    points: [
      {
        icon: "timer",
        heading: "Outcome",
        text: "The response deadline passed without a reply, so the dispute defaulted to a loss, the same outcome as being charged back, but caused by a missed deadline rather than a bank decision.",
      },
      {
        icon: "info",
        heading: "How to avoid this",
        text: "Always accept or contest a live dispute before its deadline (see the Action required and Insufficient documents statuses) to avoid this outcome.",
      },
    ],
  },
};

/** Shared context shown under every status's own explanation, since a
 * single dispute can run through this whole ladder — see the STAGE_GUIDES
 * doc comment above. */
const ESCALATION_LADDER: {
  stage: EscalationStage;
  icon: IconName;
  label: string;
  description: string;
}[] = [
  {
    stage: "CHARGEBACK",
    icon: "file-text",
    label: "Dispute",
    description:
      "The customer has raised a dispute. Accept it, or contest it with evidence before the deadline. Not responding closes it in the customer's favour.",
  },
  {
    stage: "PRE_ARBITRATION",
    icon: "chevron-up",
    label: "Pre-arbitration",
    description: `If the bank rules against you, it can escalate to pre-arbitration. Accept now to avoid further escalation, or submit additional evidence. The bank may take up to 60 business days to decide.`,
  },
  {
    stage: "ARBITRATION",
    icon: "chevrons-up",
    label: "Arbitration",
    description: `The final stage: no new documents can be added. Withdraw (a ${formatFee(WITHDRAWAL_FEE)} withdrawal fee may apply), or let the bank make a final decision; if it goes against you, a ${formatFee(ARBITRATION_FEE)} arbitration fee is charged.`,
  },
];

interface DisputeStageGuideDialogProps {
  status: DisputeEventStatus;
  /** The dispute's current stage, highlighted in the stages list. */
  stage?: EscalationStage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The "Learn more" pop-up for whichever dispute status is currently
 * showing on DisputeStatusCard, reached identically from a transaction's
 * own page or the dispute's own page (see DisputeStatusCard's own doc
 * comment) — the explanation can never differ depending on which page the
 * merchant started from. Header (status icon and title), the status's
 * points one per row, then the stages as a stepper with the current one
 * marked. */
export function DisputeStageGuideDialog({
  status,
  stage,
  open,
  onOpenChange,
}: DisputeStageGuideDialogProps) {
  const guide = STAGE_GUIDES[status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <div className="flex items-center gap-3 px-6 pt-6 pr-14">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              TONE_CLASS[guide.tone]
            )}
          >
            <Icon name={guide.icon} size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight">{guide.title}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px]">
              What this status means and what to do next.
            </DialogDescription>
          </div>
        </div>

        <ul className="flex flex-col gap-4 px-6 py-5">
          {guide.points.map((point) => (
            <li key={point.heading} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                <Icon name={point.icon} size={14} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{point.heading}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                  {point.text}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-border bg-muted/30 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Dispute stages
          </p>
          <ol className="mt-4">
            {ESCALATION_LADDER.map((level, i) => {
              const current = level.stage === stage;
              const last = i === ESCALATION_LADDER.length - 1;
              return (
                <li key={level.stage} className="relative flex gap-3 pb-5 last:pb-0">
                  {/* The line joining each step to the next. */}
                  {!last && (
                    <span
                      aria-hidden
                      className="absolute top-8 bottom-0 left-[15px] w-px bg-border"
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      current
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <Icon name={level.icon} size={14} aria-hidden />
                  </span>
                  <div className="min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground">{level.label}</p>
                      {current && (
                        <Badge variant="default" size="sm">
                          Current stage
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {level.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
