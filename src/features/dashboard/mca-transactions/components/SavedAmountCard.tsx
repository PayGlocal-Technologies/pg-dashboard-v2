"use client";

import { Card, CardContent, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { toMetricNumber, useMcaOverview } from "@/features/dashboard/mca-transactions/hooks";

/**
 * Single-KPI card stacked below OutstandingAmountCard, forming a secondary
 * analytics column beside SettlementAnalyticsCard. Same Card size/border/
 * radius/typography/spacing rhythm as Outstanding Amount (icon top-left,
 * then a tight title/KPI stack, then explanatory text), deliberately with
 * nothing else on it: no chart, no secondary metric, no toggle, no chip
 * (this card has no equivalent secondary figure to pair one with).
 */
export function SavedAmountCard({ className }: { className?: string }) {
  const { overview, isLoading } = useMcaOverview();
  // amountSaved.overall is the lifetime figure; last30 is also returned but
  // the card's copy ("saved on transaction fees through PayGlocal") is
  // unqualified, so it reads the lifetime one.
  const savedInr = toMetricNumber(overview?.amountSaved?.overall?.value);

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* flex flex-1 flex-col: same reasoning as OutstandingAmountCard, lets
          mt-auto on the description push it to the card's bottom edge once
          Card is stretched taller than its content (see the grow className
          this component receives from TransactionsAnalyticsCarousel). */}
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
          <p className="text-sm font-semibold text-foreground">Saved amount</p>
          {isLoading ? (
            <Shimmer className="mt-1 h-9 w-32" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(savedInr, "INR", "en-IN")}
            </p>
          )}
        </div>

        {/* mt-auto pins this to the card's bottom edge instead of sitting
            directly under the KPI, matching Outstanding Amount's gap without
            a fixed spacer height. */}
        <p className="mt-auto pt-6 text-[13px] text-muted-foreground">
          Amount saved on transaction fees through PayGlocal.
        </p>
      </CardContent>
    </Card>
  );
}
