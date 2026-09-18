import { StatCardSkeleton } from "@/components/ui";
import { AmountRecoveredCard } from "@/features/dashboard/dispute-management/components/AmountRecoveredCard";
import { DisputeOverviewCard } from "@/features/dashboard/dispute-management/components/DisputeOverviewCard";
import { DisputeReasonsCard } from "@/features/dashboard/dispute-management/components/DisputeReasonsCard";
import type { DisputeRow } from "@/features/dashboard/dispute-management/types";

interface ReasonBreakdown {
  reason: string;
  count: number;
  pct: number;
}

interface DisputeStatCardsProps {
  disputes: DisputeRow[];
  recoveredLabel: string;
  recoveredTrendPct: number;
  recoveredTrend: { x: string; y: number }[];
  reasonBreakdown: ReasonBreakdown[];
}

export function DisputeStatCards({
  disputes,
  recoveredLabel,
  recoveredTrendPct,
  recoveredTrend,
  reasonBreakdown,
}: DisputeStatCardsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-3 lg:items-stretch">
      <DisputeOverviewCard disputes={disputes} />
      <AmountRecoveredCard
        recoveredLabel={recoveredLabel}
        trendPct={recoveredTrendPct}
        data={recoveredTrend}
      />
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
