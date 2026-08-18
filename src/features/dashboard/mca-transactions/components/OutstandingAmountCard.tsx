"use client";

import { Badge, Card, CardContent, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { toMetricNumber, useMcaOverview } from "@/features/dashboard/mca-transactions/hooks";

/**
 * Compact companion to SettlementAnalyticsCard: same Card size/border/radius
 * (so the two match height and visual weight side by side), a top row
 * pairing the icon badge with the pending-count chip, then a tight
 * title/KPI stack, then explanatory text. Doesn't use flux-ui's own
 * MetricSparklineCard, both for that reason and because its fixed p-5
 * padding wouldn't match Card size="sm"'s px-7 py-7 next to it.
 *
 * Titled "Funds on hold" even though the KPI itself is still settlementsDue
 * (the reference this was redesigned against shows a USD KPI with an INR
 * conversion beside it, but settlementsDue only ever comes back from
 * useMcaOverview in INR, there's no USD figure behind it to convert from, so
 * the KPI below is that one real value alone rather than a fabricated second
 * currency). The actual fundsOnHold figure that used to sit under the KPI as
 * a supporting line moved out entirely, at the design's request, rather than
 * being replaced by another value.
 */
export function OutstandingAmountCard({ className }: { className?: string }) {
  const { overview, isLoading } = useMcaOverview();
  // settlementsDue is "received, not yet settled" — the card's own subject.
  // The API reports it in INR, so no conversion happens here.
  const outstandingInr = toMetricNumber(overview?.settlementsDue?.value);
  const pendingCount = toMetricNumber(overview?.settlementsDue?.count);

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* flex flex-1 flex-col: gives the zones below a shared flex-col
          context, so mt-auto on the description can push it toward the
          card's own bottom edge once Card is stretched taller than its
          content (see the grow className this component receives from
          TransactionsAnalyticsCarousel), instead of leaving that space
          sitting between the KPI and the description. */}
      <CardContent className="flex flex-1 flex-col">
        {/* Top row: icon left, pending-count chip right. items-start (not
            center) keeps the chip pinned to the top of the card rather than
            centering against the taller KPI stack below it. */}
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
          {!isLoading && pendingCount > 0 && (
            <Badge variant="secondary" size="sm" className="shrink-0">
              {pendingCount.toLocaleString("en-IN")} pending transaction
              {pendingCount === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {/* KPI stack: title then amount, mt-4 as the step down from the top
            row, mt-1 within the stack itself for the tight title-to-amount
            pairing. */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground">Funds on hold</p>
          {isLoading ? (
            <Shimmer className="mt-1 h-9 w-32" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(outstandingInr, "INR", "en-IN")}
            </p>
          )}
        </div>

        {/* mt-auto pins this to the card's bottom edge instead of sitting
            directly under the KPI, matching the reference's comfortable
            bottom gap without a fixed spacer height. pt-6 is the floor for
            that gap on a card short enough that mt-auto alone wouldn't clear
            the KPI stack by much. */}
        <p className="mt-auto pt-6 text-[13px] text-muted-foreground">
          Amount received from customers that is yet to be settled.
        </p>
      </CardContent>
    </Card>
  );
}
