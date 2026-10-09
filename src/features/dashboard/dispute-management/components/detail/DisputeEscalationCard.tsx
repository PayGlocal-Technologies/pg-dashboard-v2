"use client";

import { Badge, Button, Callout, CalloutTitle, Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ACTION_CARD_CLASS } from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { stageWarnings } from "@/features/dashboard/dispute-management/disputeStages";
import { respondBy } from "@/features/dashboard/dispute-management/helpers";
// BACKEND GAP - see the chip note in DisputeActionCard.
// import { ChargebackProtectedChip } from "@/features/dashboard/dispute-management/components/detail/ChargebackProtectedChip";
import type { DisputeCase } from "@/features/dashboard/dispute-management/types";

const BADGE_VARIANT = { danger: "error", warning: "warning", muted: "secondary" } as const;

function Choice({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 px-4 py-5 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name={icon} size={18} aria-hidden />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mb-1 max-w-64 text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {/* Pinned to the bottom: the two choices stretch to the same height,
       * so their buttons line up whatever each description's length. */}
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={onAction}
        className="mt-auto w-full max-w-60"
      >
        {action}
      </Button>
    </div>
  );
}

/**
 * The decision a merchant faces when a dispute escalates (pg-dashboard's
 * CbPreArbActionCard / CbArbActionCard, ACTION_REQUIRED): the stage, the
 * clock, what it can cost (the dispute's own fees), then the two ways
 * forward side by side. Both compliance levels use the pre-arbitration
 * screen, as in pg-dashboard.
 *
 *  - Pre-arbitration: Accept dispute (full or partial, the same accept
 *    dialog as the first round) OR Continue contesting (more evidence).
 *  - Arbitration: Withdraw dispute OR Continue contesting (the bank makes a
 *    final decision on the evidence it already has; nothing new is
 *    uploaded).
 */
export function DisputeEscalationCard({
  dispute,
  now,
  onAccept,
  onWithdraw,
  onContest,
  onLearnMore,
}: {
  dispute: DisputeCase;
  now: number;
  onAccept: () => void;
  onWithdraw: () => void;
  onContest: () => void;
  onLearnMore: () => void;
}) {
  const isArbitration = dispute.screenStage === "ARBITRATION";
  const clock = respondBy(dispute.dueDate, now);
  const warnings = stageWarnings(dispute);

  return (
    <Card className={cn("gap-0 p-0", ACTION_CARD_CLASS)}>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold text-foreground">
            {isArbitration ? "Arbitration review started" : "Pre-arbitration review started"}
          </h2>
          <Badge variant={BADGE_VARIANT[clock.tone]} size="sm" className="rounded-md">
            {clock.text}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isArbitration
            ? "The customer's bank has escalated this dispute to arbitration after reviewing the evidence you submitted earlier."
            : "The customer's bank has escalated this dispute to pre-arbitration after reviewing the submitted evidence."}
        </p>

        <Callout variant="warning" className="mt-4">
          <Icon name="alert-triangle" size={16} aria-hidden className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <CalloutTitle className="text-sm font-semibold">
              Before you proceed, here&apos;s what to know
            </CalloutTitle>
            <div className="mt-1 text-sm leading-relaxed opacity-90">
              <ul className="list-disc space-y-0.5 pl-4 text-[13px]">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </Callout>
      </div>

      <div className="flex flex-col border-t border-border sm:flex-row">
        {isArbitration ? (
          <Choice
            icon="rotate-ccw"
            title="Withdraw dispute"
            description="The dispute will be closed and the amount will be returned to the customer."
            action="Withdraw dispute"
            onAction={onWithdraw}
          />
        ) : (
          <Choice
            icon="rotate-ccw"
            title="Accept dispute"
            description="The dispute will be closed and the amount will be returned to the customer."
            action="Accept dispute"
            onAction={onAccept}
          />
        )}
        <div className="flex items-center justify-center gap-2 sm:flex-col" aria-hidden>
          <span className="h-px w-full bg-border sm:h-full sm:w-px" />
          <span className="text-[11px] font-medium text-muted-foreground">OR</span>
          <span className="h-px w-full bg-border sm:h-full sm:w-px" />
        </div>
        <Choice
          icon={isArbitration ? "scale" : "file-text"}
          title="Continue contesting"
          description={
            isArbitration
              ? "The bank will complete a final review and make a decision."
              : "Submit additional evidence for the bank to review before arbitration."
          }
          action="Continue contesting"
          onAction={onContest}
        />
      </div>

      <div className="border-t border-border px-5 py-3">
        <Button
          type="button"
          variant="link"
          onClick={onLearnMore}
          className="h-auto w-fit p-0 text-sm font-medium"
        >
          How {isArbitration ? "arbitration" : "pre-arbitration"} works
        </Button>
      </div>
    </Card>
  );
}
