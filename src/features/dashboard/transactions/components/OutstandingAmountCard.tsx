"use client";

import { Card, CardContent, Badge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { formatUsdShort } from "@/features/dashboard/transactions/components/SettlementAnalyticsCard";
import { MCA_FX_RATES_TO_INR } from "@/features/dashboard/transactions/constants";
import {
  OUTSTANDING_AMOUNT_USD,
  PENDING_TRANSACTIONS_COUNT,
} from "@/features/dashboard/transactions/mock-data";

/**
 * Compact companion to SettlementAnalyticsCard: same Card size/border/radius
 * (so the two match height and visual weight side by side), a top row
 * pairing the icon badge with the pending-count chip, then a tight
 * title/amount/INR stack, then explanatory text, no toggle, no divider, no
 * progress visualization, no per-account breakdown. Doesn't use flux-ui's
 * own MetricSparklineCard, both for that reason and because its fixed p-5
 * padding wouldn't match Card size="sm"'s px-7 py-7 next to it.
 */
export function OutstandingAmountCard({ className }: { className?: string }) {
  const inrValue = OUTSTANDING_AMOUNT_USD * (MCA_FX_RATES_TO_INR.USD ?? 1);

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* flex flex-1 flex-col: gives the sections below a shared flex-col
          context, so mt-auto on the description can push it toward the
          card's own bottom edge once Card is stretched taller than its
          content (see the grow className this component receives from
          TransactionsAnalyticsCarousel), instead of leaving that space
          sitting between the KPI stack and the description. */}
      <CardContent className="flex flex-1 flex-col">
        {/* Top row: icon left, pending-count chip right. items-start (not
            center) keeps the chip pinned to the top of the card rather than
            centering against the taller KPI stack below it, per the
            reference. */}
        <div className="flex items-start justify-between gap-2">
          {/* h-12 w-12/rounded-full/amber-500 at 10% opacity: same subtle
              tinted-circle treatment as the error state's icon elsewhere in
              this feature (see McaTransactionTable), just amber for
              "pending" instead of red for "failed". Kept in sync by hand
              with Saved Amount's green version below rather than a shared
              component, since it's only these two call sites. */}
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Icon name="clock" size={22} />
          </span>
          <Badge variant="secondary" size="sm" className="shrink-0">
            {PENDING_TRANSACTIONS_COUNT} pending transactions
          </Badge>
        </div>

        {/* KPI stack: title, then the amount and its INR conversion on one
            baseline-aligned row (items-baseline, not center, so the smaller
            INR figure sits on the same text baseline as the much larger
            amount beside it), the same pairing SettlementAnalyticsCard uses
            for its own KPI. mt-4 is a deliberate step down from the top row,
            not the tight mt-1 within the stack itself. */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground">Outstanding amount</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatUsdShort(OUTSTANDING_AMOUNT_USD)}
            </p>
            {/* Derived from the USD figure and the same FX rate the rest of
                the Transactions feature uses, not a second literal. */}
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatCurrency(inrValue, "INR", "en-IN")}
            </p>
          </div>
        </div>

        {/* mt-auto pins this to the card's bottom edge instead of sitting
            directly under the KPI stack, matching the reference's
            comfortable bottom gap without a fixed spacer height. pt-6 is the
            floor for that gap on a card short enough that mt-auto alone
            wouldn't clear the KPI stack by much. */}
        <p className="mt-auto pt-6 text-[13px] text-muted-foreground">
          Amount received from customers that is yet to be settled.
        </p>
      </CardContent>
    </Card>
  );
}
