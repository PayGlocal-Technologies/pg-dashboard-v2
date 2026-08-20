import { StatCardSkeleton } from "@/components/ui";
import { AmountRecoveredCard } from "@/features/dashboard/dispute-management/components/AmountRecoveredCard";
import { DisputeOverviewCard } from "@/features/dashboard/dispute-management/components/DisputeOverviewCard";
import { DisputeReasonsCard } from "@/features/dashboard/dispute-management/components/DisputeReasonsCard";

interface ReasonBreakdown {
  reason: string;
  count: number;
  pct: number;
}

interface DisputeStatCardsProps {
  needsActionCount: number;
  inReviewCount: number;
  wonCount: number;
  lostCount: number;
  recoveredLabel: string;
  recoveredTrendPct: number;
  recoveredTrend: { x: string; y: number }[];
  reasonBreakdown: ReasonBreakdown[];
}

export function DisputeStatCards({
  needsActionCount,
  inReviewCount,
  wonCount,
  lostCount,
  recoveredLabel,
  recoveredTrendPct,
  recoveredTrend,
  reasonBreakdown,
}: DisputeStatCardsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-3 lg:items-stretch">
      <DisputeOverviewCard
        needsActionCount={needsActionCount}
        inReviewCount={inReviewCount}
        wonCount={wonCount}
        lostCount={lostCount}
      />
      <AmountRecoveredCard recoveredLabel={recoveredLabel} trendPct={recoveredTrendPct} data={recoveredTrend} />
      <DisputeReasonsCard breakdown={reasonBreakdown} />
    </div>
  );
}

export function DisputeStatCardsSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}
