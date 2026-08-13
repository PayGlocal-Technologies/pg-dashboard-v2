"use client";

import { Badge, Card, CardContent, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { toMetricNumber, useMcaOverview } from "@/features/dashboard/mca-transactions/hooks";

/**
 * Compact companion to SettlementAnalyticsCard: same Card size/border/radius
 * (so the two match height and visual weight side by side), three stacked
 * zones (title+amount, INR+pending badge, explanatory text) plus a top-right
 * icon badge, no toggle or per-account breakdown. Doesn't use flux-ui's own
 * MetricSparklineCard, both for that reason and because its fixed p-5
 * padding wouldn't match Card size="sm"'s px-7 py-7 next to it.
 */
export function OutstandingAmountCard({ className }: { className?: string }) {
  const { overview, isLoading } = useMcaOverview();
  // settlementsDue is "received, not yet settled" — the card's own subject.
  // The API reports it in INR, so no conversion happens here.
  const outstandingInr = toMetricNumber(overview?.settlementsDue?.value);
  const pendingCount = toMetricNumber(overview?.settlementsDue?.count);

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* flex flex-1 flex-col: gives the three content zones below (top,
          middle, bottom) a shared flex-col context, so mt-auto on the
          description can push it to the card's own bottom edge once Card is
          stretched taller than its content (see the grow className this
          component receives from TransactionsAnalyticsCarousel) instead of
          leaving that space sitting between the INR row and the
          description. */}
      <CardContent className="flex flex-1 flex-col">
        {/* Top zone: title and KPI as one tight left-aligned stack (mt-1, not
            the 12px+ gap a separate row would carry), with the icon badge on
            the same row so its top edge still lands level with the title's,
            not the taller KPI beneath it. items-start compares the icon
            against this whole stack's top edge, which is the title line. */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Outstanding amount</p>
            {isLoading ? (
              <Shimmer className="mt-1 h-9 w-32" />
            ) : (
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatCurrency(outstandingInr, "INR", "en-IN")}
              </p>
            )}
          </div>

          {/* h-12 w-12/rounded-full/amber-500 at 10% opacity: same subtle
              tinted-circle treatment as the error state's icon elsewhere in
              this feature (see McaTransactionTable), just amber for
              "pending" instead of red for "failed". Kept in sync by hand
              with Saved Amount's green version below rather than a shared
              component, since it's only these two call sites. */}
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Icon name="clock" size={22} />
          </span>
        </div>

        {/* Middle zone: the INR conversion (derived from the USD figure and
            the same FX rate the rest of the Transactions feature uses, not a
            second literal) and the pending-transactions chip, same row.
            items-center, not items-start: both are now single-line and the
            same visual weight, unlike the old row that paired this chip
            against the much taller primary KPI.

            flex-wrap lets the chip drop onto its own line once the row is
            too narrow to hold both, and shrink-0 keeps its width fixed
            rather than letting it compress instead of wrapping. */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {/* Funds on hold is a strict subset of what is outstanding, so it
              reads as supporting detail under the headline rather than a
              second KPI. Hidden entirely when nothing is held, instead of
              showing a zero. */}
          {toMetricNumber(overview?.fundsOnHold?.value) > 0 ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatCurrency(toMetricNumber(overview?.fundsOnHold?.value), "INR", "en-IN")} on hold
            </p>
          ) : (
            <span />
          )}
          {!isLoading && pendingCount > 0 && (
            <Badge variant="secondary" size="sm" className="shrink-0">
              {pendingCount.toLocaleString("en-IN")} pending transaction
              {pendingCount === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {/* Bottom zone: mt-auto pins this to the card's bottom edge instead
            of sitting directly under the middle zone, matching the
            reference's large gap without a fixed spacer height. pt-6 is the
            floor for that gap on a card short enough that mt-auto alone
            wouldn't clear the middle zone by much. */}
        <p className="mt-auto pt-6 text-[13px] text-muted-foreground">
          Amount received from customers that is yet to be settled.
        </p>
      </CardContent>
    </Card>
  );
}
