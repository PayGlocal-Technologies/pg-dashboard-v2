"use client";

import { Button, Card, Separator, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { dayMonth, inr } from "@/features/dashboard/partner-home/format";
import type { Payout } from "@/features/dashboard/partner-home/mock-data";

/**
 * Next payout: the amount and its date lead; the month's split by product
 * and the last three payouts sit underneath, smaller. A summary only; the
 * full history is on the payouts page (View payouts).
 */
export function NextPayoutCard({
  nextPayout,
  previousPayouts,
  isLoading,
  onViewPayouts,
}: {
  nextPayout: Payout | null;
  previousPayouts: Payout[];
  isLoading?: boolean;
  onViewPayouts: () => void;
}) {
  return (
    <Card className="gap-0 p-5">
      <h2 className="text-sm font-semibold text-foreground">Next payout</h2>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Shimmer className="h-8 w-32" />
          <Shimmer className="h-3.5 w-40" />
        </div>
      ) : !nextPayout ? (
        <PlaceholderState
          variant="no-settlements"
          size="sm"
          title="No upcoming payouts"
          description="Commission from live merchants is paid out monthly."
          className="py-4"
        />
      ) : (
        <>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {inr(nextPayout.amount)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Due on {dayMonth(nextPayout.date)}
              </p>
            </div>
            <StatusBadge
              variant={nextPayout.status === "paid" ? "success" : "warning"}
              label={nextPayout.status === "paid" ? "Paid" : "Processing"}
              trailIcon={nextPayout.status === "paid" ? "check" : "clock"}
              size="sm"
            />
          </div>

          {nextPayout.breakdown && nextPayout.breakdown.length > 0 && (
            <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                {nextPayout.forMonth} commission
              </p>
              {nextPayout.breakdown.map((row) => (
                <div key={row.product} className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] text-foreground">{row.product}</span>
                  <span className="text-[12.5px] font-medium tabular-nums text-foreground">
                    {inr(row.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {previousPayouts.length > 0 && (
        <>
          <Separator className="my-4" />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Previous payouts
          </p>
          <ul className="mt-1">
            {previousPayouts.map((p) => (
              <li key={p.date} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-[12.5px] text-muted-foreground">
                  {p.forMonth}, paid {dayMonth(p.date)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold tabular-nums text-foreground">
                    {inr(p.amount)}
                  </span>
                  <StatusBadge variant="success" label="Paid" size="sm" />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onViewPayouts}
        rightIcon={<Icon name="arrow-right" className="h-3 w-3" />}
        className="mt-3 h-auto min-h-0 w-fit p-0 text-xs font-semibold"
      >
        View payouts
      </Button>
    </Card>
  );
}
