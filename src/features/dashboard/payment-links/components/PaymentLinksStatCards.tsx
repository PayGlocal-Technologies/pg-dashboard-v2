import { StatCardSkeleton } from "@/components/ui";
import { PaymentLinkMetricCard } from "@/features/dashboard/payment-links/components/PaymentLinkMetricCard";
import type { SparklinePoint } from "@/features/dashboard/payment-links/types";

interface PaymentLinksStatCardsProps {
  totalAmountLabel: string;
  totalAmountTrendPct: number;
  totalAmountChartData: SparklinePoint[];
  totalLinks: number;
  totalLinksTodayLabel: string;
  totalLinksChartData: SparklinePoint[];
  paidLinks: number;
  paidLinksTodayLabel: string;
  paidLinksChartData: SparklinePoint[];
  activeLinks: number;
  activeLinksTodayLabel: string;
  activeLinksChartData: SparklinePoint[];
}

const formatCurrencyTooltip = (y: number) => `$${y.toLocaleString("en-US")}`;
const formatCurrencyAxis = (y: number) => (y === 0 ? "$0" : `$${(y / 1000).toFixed(0)}K`);
const formatCountValue = (y: number) => y.toLocaleString("en-US");

export function PaymentLinksStatCards({
  totalAmountLabel,
  totalAmountTrendPct,
  totalAmountChartData,
  totalLinks,
  totalLinksTodayLabel,
  totalLinksChartData,
  paidLinks,
  paidLinksTodayLabel,
  paidLinksChartData,
  activeLinks,
  activeLinksTodayLabel,
  activeLinksChartData,
}: PaymentLinksStatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <PaymentLinkMetricCard
        title="Total Amount Collected"
        value={totalAmountLabel}
        trendLabel={`${totalAmountTrendPct >= 0 ? "+" : ""}${totalAmountTrendPct}% vs previous period`}
        trendPositive={totalAmountTrendPct >= 0}
        data={totalAmountChartData}
        accentColor="var(--chart-4)"
        formatTooltipValue={formatCurrencyTooltip}
        formatAxisValue={formatCurrencyAxis}
      />

      <PaymentLinkMetricCard
        title="Total Links"
        icon="link"
        value={String(totalLinks)}
        trendLabel={totalLinksTodayLabel}
        data={totalLinksChartData}
        accentColor="var(--chart-1)"
        formatTooltipValue={formatCountValue}
        formatAxisValue={formatCountValue}
      />

      <PaymentLinkMetricCard
        title="Paid Links"
        icon="check-circle"
        value={String(paidLinks)}
        trendLabel={paidLinksTodayLabel}
        data={paidLinksChartData}
        accentColor="var(--chart-2)"
        formatTooltipValue={formatCountValue}
        formatAxisValue={formatCountValue}
      />

      <PaymentLinkMetricCard
        title="Active Links"
        icon="activity"
        value={String(activeLinks)}
        trendLabel={activeLinksTodayLabel}
        data={activeLinksChartData}
        accentColor="var(--chart-3)"
        formatTooltipValue={formatCountValue}
        formatAxisValue={formatCountValue}
      />
    </div>
  );
}

export function PaymentLinksStatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}
