"use client";

import { Card, Shimmer } from "@/components/ui";
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
      {/* Decorative, so `alt=""`. A voucher/ticket illustration — its blank
          left half is the artwork's own designated text area (the same
          shape Refer & Earn's own $30 voucher uses), so the KPI below is
          positioned to land inside that blank half rather than floating
          over the cash/sparkle imagery around it. object-cover object-center
          because the asset is pre-cropped tight to its own content (no
          transparent margin left to center within), at very nearly this
          card's own aspect ratio, so cover crops minimally either way. */}
      <AppImage
        src="/assets/savedamount.png"
        alt=""
        fill
        sizes="(min-width: 1024px) 24rem, 100vw"
        className="-z-10 object-cover object-center"
      />

      {/* Positioned (not just padded) to the voucher's own blank rectangle —
          left-[20%]/w-[43%] is that rectangle's measured span in the
          artwork, top-[40%] where it starts below the ticket's rounded top
          edge. flex-col justify-center centers the two-line KPI vertically
          within that band rather than pinning it to the band's own top. */}
      <div className="absolute inset-y-0 left-[20%] top-[40%] flex w-[43%] flex-col justify-center">
        <p className="text-sm font-normal text-muted-foreground">Saved amount</p>

        {isLoading ? (
          <Shimmer className="mt-1 h-9 w-28" />
        ) : (
          <CompactAmount
            amount={amount}
            currency={currency}
            className="mt-1 block text-3xl font-bold tabular-nums tracking-tight text-foreground"
          />
        )}
      </div>
    </Card>
  );
}
