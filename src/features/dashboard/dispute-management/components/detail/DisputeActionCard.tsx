import {
  Badge,
  Button,
  Callout,
  CalloutText,
  CalloutTitle,
  Card,
  Separator,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ACTION_CARD_CLASS } from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { respondBy } from "@/features/dashboard/dispute-management/helpers";
import { stageWarnings } from "@/features/dashboard/dispute-management/disputeStages";
// BACKEND GAP - see the chip's own note below.
// import { ChargebackProtectedChip } from "@/features/dashboard/dispute-management/components/detail/ChargebackProtectedChip";
import type { DisputeCase } from "@/features/dashboard/dispute-management/types";

const BADGE_VARIANT = { danger: "error", warning: "warning", muted: "secondary" } as const;

/**
 * The first-round decision (pg-dashboard's CbDisputeActionCard,
 * ACTION_REQUIRED): what the dispute is (reason and code), why the customer
 * raised it, the deadline, then Accept or Contest. Three layers, so a
 * merchant can scan straight down and answer all three.
 */
export function DisputeActionCard({
  dispute,
  now,
  onLearnMore,
  onAccept,
  onContest,
}: {
  dispute: DisputeCase;
  now: number;
  onLearnMore: () => void;
  onAccept: () => void;
  onContest: () => void;
}) {
  const due = respondBy(dispute.dueDate, now);

  return (
    // The merchant has to act here, so it carries the action-card wash.
    <Card className={cn("gap-0 p-5", ACTION_CARD_CLASS)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-base font-bold text-foreground">{dispute.reasonShort}</h2>
        <Badge variant={BADGE_VARIANT[due.tone]} size="sm" className="rounded-md">
          {due.text}
        </Badge>
        {/*
          BACKEND GAP - "Chargeback protected" chip. pg-dashboard has no
          merchant-facing protection flag (the liability fields are shown to
          internal users only), so the chip has nothing true to say yet.
          Restore once the details response carries a merchant-safe flag:

        {dispute.isProtected && <ChargebackProtectedChip />}
        */}
      </div>
      {dispute.reasonCode && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" size="sm" square className="tabular-nums">
            {dispute.reasonCode}
          </Badge>
        </div>
      )}

      {/* The customer's claim, why the dispute exists: its own tinted
       * container so it reads as a distinct layer, not body copy. */}
      <Callout variant="neutral" className="mt-4">
        <div className="min-w-0 flex-1">
          <CalloutTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Why was this disputed?
          </CalloutTitle>
          <CalloutText className="mt-1 text-sm font-medium text-foreground opacity-100">
            {dispute.reasonDescription}
          </CalloutText>
        </div>
      </Callout>

      {/* pg-dashboard's "Important to know" (DISPUTE_INFO). */}
      <Callout variant="warning" className="mt-4">
        <Icon name="alert-triangle" size={16} aria-hidden className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <CalloutTitle className="text-sm font-semibold">Important to know</CalloutTitle>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-relaxed opacity-90">
            {stageWarnings(dispute).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      </Callout>

      <div className="mt-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          What can you do?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Accept the dispute to close it and return the amount to the customer, or contest it by
          submitting supporting evidence.
        </p>
        <Button
          type="button"
          variant="link"
          onClick={onLearnMore}
          className="mt-1.5 h-auto w-fit p-0 text-sm font-medium"
        >
          Learn how to respond to disputes
        </Button>
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onAccept}>
          Accept dispute
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={onContest}>
          Contest dispute
        </Button>
      </div>
    </Card>
  );
}
