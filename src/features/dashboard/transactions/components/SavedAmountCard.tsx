"use client";

import { Card, CardContent } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { SAVED_AMOUNT_INR_LABEL } from "@/features/dashboard/transactions/mock-data";

/**
 * Single-KPI card stacked below OutstandingAmountCard, forming a secondary
 * analytics column beside SettlementAnalyticsCard. Same Card size/border/
 * radius/typography as its siblings (icon badge top-left, then a tight
 * title/KPI stack), deliberately with nothing else on it: no chart, no
 * secondary metric, no toggle. No chip on its top row, unlike Outstanding
 * Amount's pending-count badge, since this card has no equivalent secondary
 * figure to pair with the icon.
 */
export function SavedAmountCard({ className }: { className?: string }) {
  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* flex flex-1 flex-col: same reasoning as OutstandingAmountCard, lets
          mt-auto on the description push it to the card's bottom edge once
          Card is stretched taller than its content (see the grow className
          this component receives from TransactionsAnalyticsCarousel). */}
      <CardContent className="flex flex-1 flex-col">
        {/* Top row: icon only (see the component doc above for why there's
            no counterpart chip here, unlike Outstanding Amount's). */}
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600">
          <Icon name="piggy-bank" size={22} />
        </span>

        {/* KPI stack: title then amount, mt-4 as the step down from the
            icon above, mt-1 within the stack itself for the tight
            title-to-amount pairing, same rhythm as Outstanding Amount's own
            KPI stack. */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground">Saved amount</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {SAVED_AMOUNT_INR_LABEL}
          </p>
        </div>

        {/* mt-auto pins this to the card's bottom edge instead of sitting
            directly under the KPI stack, matching Outstanding Amount's gap
            without a fixed spacer height. */}
        <p className="mt-auto pt-6 text-[13px] text-muted-foreground">
          Amount saved on transaction fees through PayGlocal.
        </p>
      </CardContent>
    </Card>
  );
}
