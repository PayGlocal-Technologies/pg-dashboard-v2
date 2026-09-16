"use client";

import { Button, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ACCOUNT_HELPER_TEXT } from "@/features/dashboard/multi-currency/accountGuides";

/**
 * "How it works?" — how a client actually pays into the selected account, and
 * how long the money takes to arrive.
 *
 * A plain card, not a modal or a drawer: MultiCurrencyContent renders it as a
 * normal flex sibling of the account-details section, so there is never an
 * overlay/backdrop behind it, and no other content is ever covered or
 * unmounted while it's open — the account-details column simply reflows
 * (shrinks, or wraps this card onto its own line) to make room for it, the
 * same way the Metrics row below already wraps its two cards.
 *
 * The copy is per-currency because the rail is: a US client uses ACH/Fedwire
 * over 2-3 days, a UK client uses FPS over 1-2. Renders nothing for a
 * currency with no entry rather than showing a generic paragraph that would
 * be wrong for some rail.
 */
export function HowItWorksPanel({
  currency,
  onClose,
  className,
}: {
  currency: string;
  onClose: () => void;
  className?: string;
}) {
  const helper = ACCOUNT_HELPER_TEXT[currency];
  if (!helper) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">How it works</p>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          className="h-7 w-7 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
        >
          <Icon name="x" size={14} />
        </Button>
      </div>

      {/* Icon + heading + paragraph, twice, separated by a divider — same
          shape as the settlement reports "About this settlement" info panel,
          reused here for the same "explain this section" job. `helper.title`/
          `description` are the first block, `helper.timelineTitle`/`timeline`
          the second — none of that copy is new or reworded, only laid out
          this way instead of as one dialog title followed by two bare
          paragraphs. */}
      <div className="flex flex-col gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="file-text" size={16} />
        </span>
        <p className="text-sm font-semibold text-foreground">{helper.title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{helper.description}</p>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="clock" size={16} />
        </span>
        <p className="text-sm font-semibold text-foreground">{helper.timelineTitle}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{helper.timeline}</p>
      </div>
    </div>
  );
}
