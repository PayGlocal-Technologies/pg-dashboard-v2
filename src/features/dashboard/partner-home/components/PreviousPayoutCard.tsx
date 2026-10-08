"use client";

import { Button, Card, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { dayMonth, inr } from "@/features/dashboard/partner-home/format";
import type { Payout } from "@/features/dashboard/partner-home/mock-data";

/**
 * The last commission paid, with its split by product, then the two before
 * it as one line each. The full history is on the payouts page.
 */
export function PreviousPayoutCard({
  payouts,
  isLoading,
  onViewPayouts,
}: {
  /** Paid payouts, newest first. */
  payouts: Payout[];
  isLoading?: boolean;
  onViewPayouts: () => void;
}) {
  const [last, ...earlier] = payouts;

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Previous payout</h2>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onViewPayouts}
          className="h-auto min-h-0 p-0 text-xs font-semibold"
        >
          View payouts
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Shimmer className="h-7 w-28" />
          <Shimmer className="h-3.5 w-40" />
        </div>
      ) : !last ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          No payouts yet. Commission from live merchants is paid monthly.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {inr(last.amount)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name="calendar-days" size={12} aria-hidden />
                {last.forMonth} commission · paid {dayMonth(last.date)}
              </p>
            </div>
            <StatusBadge variant="success" label="Paid" trailIcon="check" size="sm" />
          </div>

          {last.breakdown && last.breakdown.length > 0 && (
            <dl className="mt-4 space-y-1.5 rounded-lg bg-muted/40 px-3 py-2.5">
              {last.breakdown.map((row) => (
                <div key={row.product} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[12.5px] text-muted-foreground">{row.product}</dt>
                  <dd className="text-[12.5px] font-medium tabular-nums text-foreground">
                    {inr(row.amount)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {earlier.length > 0 && (
            <div className="mt-auto pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Earlier
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {earlier.map((p) => (
                  <li key={p.date} className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] text-muted-foreground">
                      {p.forMonth}, paid {dayMonth(p.date)}
                    </span>
                    <span className="text-[12.5px] font-semibold tabular-nums text-foreground">
                      {inr(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
