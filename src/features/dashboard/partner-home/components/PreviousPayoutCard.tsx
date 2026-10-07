"use client";

import { Button, Card, Separator, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { dayMonth, inr } from "@/features/dashboard/partner-home/format";
import type { Payout } from "@/features/dashboard/partner-home/mock-data";

/**
 * Previous payout: the last commission paid, with its split by product, then
 * the two before it as one line each. The full history is on the payouts
 * page (View payouts).
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
    <Card className="gap-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Previous payout</h2>
        {last && !isLoading && (
          <StatusBadge variant="success" label="Paid" trailIcon="check" size="sm" />
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Shimmer className="h-8 w-32" />
          <Shimmer className="h-3.5 w-40" />
        </div>
      ) : !last ? (
        <PlaceholderState
          variant="no-settlements"
          size="sm"
          title="No payouts yet"
          description="Commission from live merchants is paid out monthly."
          className="py-4"
        />
      ) : (
        <>
          <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {inr(last.amount)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {last.forMonth} commission, paid on {dayMonth(last.date)}
          </p>

          {last.breakdown && last.breakdown.length > 0 && (
            <dl className="mt-3 space-y-1.5">
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
            <>
              <Separator className="my-4" />
              <ul className="space-y-2">
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
            </>
          )}
        </>
      )}

      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onViewPayouts}
        rightIcon={<Icon name="arrow-right" className="h-3 w-3" />}
        className="mt-4 h-auto min-h-0 w-fit p-0 text-xs font-semibold"
      >
        View payouts
      </Button>
    </Card>
  );
}
