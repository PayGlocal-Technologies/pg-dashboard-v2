"use client";

import { Card, Shimmer } from "@/components/ui";
import { CompactAmount } from "@/components/common/CompactAmount";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { useSettlementUpcoming } from "@/features/dashboard/settlement-reports/hooks";

/**
 * "Upcoming settlement", split out of McaRevenueCard into its own small card
 * under Needs attention. It used to sit as a supporting strip at the bottom
 * of the performance card, but that gave the performance card a fixed-height
 * block regardless of which metric was selected — pulling it out lets that
 * card's graph use the freed space instead, and gives Needs attention a
 * fixed-height neighbour that fills the rest of the column beside it.
 */
export function McaUpcomingSettlementCard() {
  const { scopeId } = useScopeId("PACB");
  const { upcoming, isLoading } = useSettlementUpcoming(scopeId);

  return (
    <Card className="gap-3 p-5">
      <p className="text-xs font-medium text-muted-foreground">Upcoming settlement</p>
      {isLoading ? (
        <Shimmer className="mt-1.5 h-7 w-24" />
      ) : upcoming ? (
        <CompactAmount
          amount={upcoming.amount}
          currency="INR"
          className="mt-1 block text-2xl font-bold tracking-tight text-foreground tabular-nums"
        />
      ) : (
        <span className="mt-1 block text-2xl font-bold tracking-tight text-foreground tabular-nums">
          —
        </span>
      )}
      {!isLoading && upcoming && upcoming.transactionCount > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {upcoming.transactionCount} transaction{upcoming.transactionCount === 1 ? "" : "s"}
        </p>
      )}
    </Card>
  );
}
