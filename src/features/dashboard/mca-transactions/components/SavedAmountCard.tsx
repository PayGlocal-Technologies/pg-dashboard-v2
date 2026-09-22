"use client";

import { Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
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

/** Same period wording the MCA home dashboard's own McaSavedAmountCard uses
 *  for its "<period>, you've saved" headline, extended to this card's own
 *  four ranges. */
const HEADLINE_BY_RANGE: Record<TimeRange, string> = {
  today: "Today,",
  week: "This week,",
  month: "This month,",
  year: "This year,",
};

/**
 * Single-KPI card stacked below OutstandingAmountCard, forming a secondary
 * analytics column beside SettlementAnalyticsCard.
 *
 * Styled after a finance-insight card reference the user supplied — icon
 * badge, soft green gradient-blob background instead of a photographic
 * illustration, and a two-line "<period>, you've saved" headline — matching
 * the MCA home dashboard's own McaSavedAmountCard, which reads this same
 * endpoint. No trend arrow: the saved-amount endpoint has no prior-period
 * figure to compare against.
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
    // min-h-40: a floor, not a fixed height — the card is free to grow
    // taller (e.g. stretched to match Documents pending's row from lg up,
    // see TransactionsAnalyticsCarousel), this is just what stops the
    // content and the background blobs feeling cramped when nothing else
    // is asking for more room.
    <Card
      size="sm"
      className={cn(
        "relative isolate flex min-h-40 w-full flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-linear-to-br from-white via-white to-emerald-50/80 dark:border-emerald-900/40 dark:from-card dark:via-card dark:to-emerald-950/30",
        className
      )}
    >
      {/* Decorative gradient blobs, clipped to the card's own radius via
          the parent's `overflow-hidden`. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-emerald-200/60 blur-3xl dark:bg-emerald-500/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl dark:bg-emerald-500/10"
      />

      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        <Icon name="piggy-bank" className="h-5 w-5" />
      </span>

      <div className="relative mt-3 flex flex-1 flex-col justify-center">
        <p className="text-base font-semibold leading-tight text-foreground">
          {HEADLINE_BY_RANGE[timeRange]}
          <br />
          <span className="text-emerald-700 dark:text-emerald-400">you&apos;ve saved</span>
        </p>

        {isLoading ? (
          <Shimmer className="mt-1.5 h-8 w-28" />
        ) : (
          <CompactAmount
            amount={amount}
            currency={currency}
            className="mt-1.5 block text-[26px] font-bold tabular-nums tracking-tight text-foreground"
          />
        )}

        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Saved on transaction fees through PayGlocal.
        </p>
      </div>
    </Card>
  );
}
