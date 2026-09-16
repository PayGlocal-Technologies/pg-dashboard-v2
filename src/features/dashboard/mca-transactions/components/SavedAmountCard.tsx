"use client";

import { Card, CardContent, Shimmer } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";
import { CompactAmount } from "@/components/common/CompactAmount";
import { useSavedAmount } from "@/features/dashboard/mca-transactions/hooks";
import type { TimeRange } from "@/features/dashboard/mca-transactions/components/SettlementAnalyticsCard";

/** The section's TimeRange → the saved-amount breakdown's timeframe key. */
const TIMEFRAME_BY_RANGE: Record<TimeRange, string> = {
  today: "today",
  week: "week",
  month: "month",
  year: "ytd",
};

/**
 * Single-KPI card stacked below OutstandingAmountCard, forming a secondary
 * analytics column beside SettlementAnalyticsCard. Same Card size/border/
 * radius/typography/spacing rhythm as Outstanding Amount (icon top-left,
 * then a tight title/KPI stack).
 */
export function SavedAmountCard({
  className,
  timeRange,
}: {
  className?: string;
  /** Chosen by the section-level time-range control. The saved-amount endpoint
   *  returns a real per-timeframe breakdown, so this reads the matching bucket. */
  timeRange: TimeRange;
}) {
  const { saved, isLoading } = useSavedAmount();
  const amount =
    saved?.timeframes.find((t) => t.timeframe === TIMEFRAME_BY_RANGE[timeRange])?.amount ?? 0;
  const currency = saved?.currency ?? "INR";

  return (
    // min-h-64: a floor, not a fixed height — the card is free to grow
    // taller (e.g. stretched to match Documents pending's row from lg up,
    // see TransactionsAnalyticsCarousel), this is just what stops the KPI
    // and the artwork colliding when nothing else is asking for more room.
    // `relative isolate overflow-hidden` is for the background image below:
    // it positions against this card, its negative z-index stays scoped to
    // it, and it's clipped to the card's own radius.
    <Card size="sm" className={cn("relative isolate min-h-64 w-full overflow-hidden", className)}>
      {/* Decorative, so `alt=""`. This artwork is its own full-bleed
          background (a soft wash filling its entire canvas, not an object
          floating on transparency like the previous asset), so it fills the
          whole card via `object-cover` rather than sitting contained in one
          corner — there's no separate gradient layer underneath it any
          more, this replaces that layer rather than sitting on top of it.
          `object-top` because the card's own text (top-left) needs to land
          on the image's paler upper region, not its busier lower-right
          corner where the coin jar sits. */}
      <AppImage
        src="/assets/saved-amount-bg-v2.png"
        alt=""
        fill
        sizes="(min-width: 1024px) 24rem, 100vw"
        className="-z-10 object-cover object-top"
      />

      {/* flex flex-1 flex-col: still needed even with the description gone,
          so Card being stretched taller than its content (see the grow
          className this component receives from TransactionsAnalyticsCarousel)
          leaves the extra space below the KPI rather than centering it. */}
      <CardContent className="flex flex-1 flex-col">
        {/* No icon any more — the background artwork already carries its
            own coin-jar imagery, so a piggy-bank glyph on top of it doubled
            up on the same idea. Straight into the KPI stack instead.

            Label light/regular rather than bold, amount a size up from
            before (3xl → 4xl): a heavier label competed with the amount for
            attention instead of introducing it, which is the label/KPI
            hierarchy this was asked to match — a quiet caption, then one
            clearly dominant figure. */}
        <p className="text-sm font-normal text-muted-foreground">Saved amount</p>

        {isLoading ? (
          <Shimmer className="mt-1 h-10 w-36" />
        ) : (
          <CompactAmount
            amount={amount}
            currency={currency}
            className="mt-1 block text-4xl font-bold tabular-nums tracking-tight text-foreground"
          />
        )}
      </CardContent>
    </Card>
  );
}
