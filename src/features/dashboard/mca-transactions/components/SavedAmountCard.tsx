"use client";

import { Card, CardContent, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { toMetricNumber, useMcaOverview } from "@/features/dashboard/mca-transactions/hooks";
// TIME_RANGE_MULTIPLIERS import dropped with the mock per-period scaling below.
import type { TimeRange } from "@/features/dashboard/mca-transactions/components/SettlementAnalyticsCard";

/**
 * Single-KPI card stacked below OutstandingAmountCard, forming a secondary
 * analytics column beside SettlementAnalyticsCard. Same Card size/border/
 * radius/typography/spacing rhythm as Outstanding Amount (icon top-left,
 * then a tight title/KPI stack), deliberately with nothing else on it: no
 * chart, no secondary metric, no toggle, no chip (this card has no
 * equivalent secondary figure to pair one with).
 */
export function SavedAmountCard({
  className,
}: {
  className?: string;
  /** Chosen by the page-level time-range control (see
   *  AnalyticsTimeRangeControl). The live endpoint only ever returns a
   *  lifetime figure, no per-period breakdown, so this scales that one real
   *  number by the same approximation SettlementAnalyticsCard's placeholder
   *  bars use (see TIME_RANGE_MULTIPLIERS), rather than leaving the KPI
   *  static while every other card on the page visibly reacts to the filter.
   *  Today/This week's figures are therefore estimates, not real per-period
   *  totals, pending a real endpoint. */
  timeRange: TimeRange;
}) {
  const { overview, isLoading } = useMcaOverview();
  // amountSaved.overall is the lifetime figure; last30 is also returned, but
  // the card's own title ("Saved amount vs banks") carries no time
  // qualifier, so it reads the lifetime one to match, then scales it by
  // timeRange below.
  // MOCK: the live endpoint returns only a lifetime figure, so per-period
  // values were faked by scaling it with TIME_RANGE_MULTIPLIERS. That scaling
  // is mock — commented out. The card now shows the real lifetime figure as-is,
  // regardless of the selected time range, until a per-period endpoint exists.
  // const savedInr = Math.round(
  //   toMetricNumber(overview?.amountSaved?.overall?.value) * TIME_RANGE_MULTIPLIERS[timeRange]
  // );
  const savedInr = toMetricNumber(overview?.amountSaved?.overall?.value);

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* flex flex-1 flex-col: still needed even with the description gone,
          so Card being stretched taller than its content (see the grow
          className this component receives from TransactionsAnalyticsCarousel)
          leaves the extra space below the KPI rather than centering it. */}
      <CardContent className="flex flex-1 flex-col">
        {/* Top row: icon only, upper-left, matching Outstanding Amount's own
            top row (see that component's doc comment for why there's no
            counterpart chip here). */}
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600">
          <Icon name="piggy-bank" size={22} />
        </span>

        {/* KPI stack: title then amount, mt-4 as the step down from the icon
            above, mt-1 within the stack itself for the tight title-to-amount
            pairing, same rhythm as Outstanding Amount's own KPI stack. */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground">Saved amount vs banks</p>
          {isLoading ? (
            <Shimmer className="mt-1 h-9 w-32" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(savedInr, "INR", "en-IN")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
