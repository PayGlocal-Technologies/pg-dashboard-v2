"use client";

import { Card, CardContent, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
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
          <p className="text-sm text-foreground">
            <span className="font-semibold">Saved amount</span>{" "}
            <span className="text-muted-foreground">vs banks</span>
          </p>

          {isLoading ? (
            <Shimmer className="mt-1 h-9 w-32" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(amount, currency, "en-IN")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
