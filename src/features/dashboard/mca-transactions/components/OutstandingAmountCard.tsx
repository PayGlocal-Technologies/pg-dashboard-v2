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
 * title/KPI stack, nothing else. Doesn't use flux-ui's own
 * MetricSparklineCard, both for that reason and because its fixed p-5
 * padding wouldn't match Card size="sm"'s px-7 py-7 next to it.
 *
 * Titled "Documents pending" even though the KPI itself is still settlementsDue
 * (the reference this was redesigned against shows a USD KPI with an INR
 * conversion beside it, but settlementsDue only ever comes back from
 * useMcaOverview in INR, there's no USD figure behind it to convert from, so
 * the KPI below is that one real value alone rather than a fabricated second
 * currency). The fundsOnHold figure and the explanatory line that used to sit
 * under the KPI both moved out entirely, at the design's request, rather than
 * being replaced by other content.
 */
export function OutstandingAmountCard({ className }: { className?: string }) {
  const { overview, isLoading } = useMcaOverview();
  // settlementsDue is "received, not yet settled" — the card's own subject.
  // The API reports it in INR, so no conversion happens here.
  const outstandingInr = toMetricNumber(overview?.settlementsDue?.value);
  const pendingCount = toMetricNumber(overview?.settlementsDue?.count);

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* flex flex-1 flex-col: still needed even with the description gone,
          so Card being stretched taller than its content (see the grow
          className this component receives from TransactionsAnalyticsCarousel)
          leaves the extra space below the KPI rather than centering it. */}
      <CardContent className="flex flex-1 flex-col">
        {/* Top row: icon left, pending-count chip right, vertically centered
            against the icon (the KPI stack is its own row below, so there's no
            taller sibling to align against here). */}
        <div className="flex items-center justify-between gap-2">
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
          <p className="text-sm font-semibold text-foreground">Documents pending</p>
          {isLoading ? (
            <Shimmer className="mt-1 h-9 w-32" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(outstandingInr, "INR", "en-IN")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
