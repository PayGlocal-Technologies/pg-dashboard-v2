"use client";

import { PaymentLinkMetricCard } from "@/features/dashboard/payment-links/components/PaymentLinkMetricCard";
import { useSettlementCalendar } from "@/features/dashboard/settlement-reports/hooks";
import { formatDayMonth } from "@/lib/utils/format";
import type {
  TransactionsMetrics,
  TransactionsTrendCharts,
  TotalVolumeTimeframe,
} from "@/features/dashboard/pa-transactions/summary";
import { totalVolumeChartsByTimeframe } from "@/features/dashboard/pa-transactions/summary";

/** What each period's change is measured against. */
const COMPARISON: Record<TotalVolumeTimeframe, string> = {
  today: "vs yesterday",
  week: "vs last week",
  month: "vs last month",
  ytd: "vs last year",
};

/** Whole rupees: these are headline figures, not ledger amounts. */
const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const count = (n: number) => n.toLocaleString("en-IN");

/** "8.6% vs last year": the arrow carries the sign, so the number doesn't. */
const pctLabel = (pct: number, comparison: string) => `${Math.abs(pct)}% ${comparison}`;

interface TransactionStatCardsProps {
  timeframe: TotalVolumeTimeframe;
  metrics: TransactionsMetrics;
  trendCharts: TransactionsTrendCharts;
}

/**
 * Gross volume, Success rate, Net volume and Refunds: each a figure, its
 * change against the previous period, the trend across the period (period
 * labels only, no value axis), and one supporting figure underneath. All
 * through the shared PaymentLinkMetricCard.
 *
 * Colour says good or bad, the arrow says which way it moved: refunds
 * falling is a green down arrow, success rate falling a red one.
 */
export function TransactionStatCards({
  timeframe,
  metrics,
  trendCharts,
}: TransactionStatCardsProps) {
  const comparison = COMPARISON[timeframe];
  // The next PA settlement date, from the live bank-holiday calendar. Date
  // only; there is no amount for it here.
  const { nextSettlement, isLoading: isCalendarLoading } = useSettlementCalendar();
  const nextSettlementDate =
    !isCalendarLoading && nextSettlement?.date ? formatDayMonth(nextSettlement.date) : "—";

  // One colour per card, from the app's chart palette (the same four these
  // cards used before): each trend reads as its own metric at a glance.
  const shared = {
    axes: "x" as const,
    trendIcon: "arrow" as const,
    formatTooltipValue: rupees,
    // Flat surfaces, no shadow, as on the transaction details.
    className: "shadow-none",
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <PaymentLinkMetricCard
        {...shared}
        title="Gross volume"
        accentColor="var(--chart-4)"
        value={rupees(metrics.totalVolume)}
        trendLabel={pctLabel(metrics.totalVolumeTrendPct, comparison)}
        trendPositive={metrics.totalVolumeTrendPct >= 0}
        data={totalVolumeChartsByTimeframe[timeframe]}
        details={[{ label: "Successful payments", value: count(metrics.transactionCount) }]}
      />

      <PaymentLinkMetricCard
        {...shared}
        title="Success rate"
        accentColor="var(--chart-5)"
        value={`${metrics.successRate}%`}
        // A rate moves in percentage points, not percent.
        trendLabel={`${Math.abs(metrics.successRateTrendPct)} pts ${comparison}`}
        trendPositive={metrics.successRateTrendPct >= 0}
        data={trendCharts.successRate}
        formatTooltipValue={(y) => `${y}%`}
        details={[{ label: "Failed payments", value: count(metrics.failedCount) }]}
      />

      <PaymentLinkMetricCard
        {...shared}
        title="Net volume"
        accentColor="var(--chart-1)"
        value={rupees(metrics.netVolume)}
        trendLabel={pctLabel(metrics.netVolumeTrendPct, comparison)}
        trendPositive={metrics.netVolumeTrendPct >= 0}
        data={trendCharts.netVolume}
        details={[{ label: "Next settlement", value: nextSettlementDate }]}
      />

      <PaymentLinkMetricCard
        {...shared}
        title="Refunds"
        accentColor="var(--chart-3)"
        value={rupees(metrics.refundAmount)}
        trendLabel={pctLabel(metrics.refundAmountTrendPct, comparison)}
        // Fewer refunds is the good outcome: green when falling, arrow still
        // shows the real direction.
        trendPositive={metrics.refundAmountTrendPct <= 0}
        trendUp={metrics.refundAmountTrendPct > 0}
        data={trendCharts.refundAmount}
        details={[{ label: "Refunded payments", value: count(metrics.refundCount) }]}
      />
    </div>
  );
}
