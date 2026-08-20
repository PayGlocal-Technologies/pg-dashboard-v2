"use client";

import { PaymentLinkMetricCard } from "@/features/dashboard/payment-links/components/PaymentLinkMetricCard";
import type {
  TransactionsMetrics,
  TransactionsTrendCharts,
  TotalVolumeTimeframe,
} from "@/features/dashboard/transactions/summary";
import { totalVolumeChartsByTimeframe } from "@/features/dashboard/transactions/summary";

function formatLakhTooltip(y: number): string {
  return `₹${y.toLocaleString("en-IN")}`;
}

function formatLakhAxis(y: number): string {
  return y === 0 ? "₹0" : `₹${(y / 100_000).toFixed(1)}L`;
}

function formatRupeeAxis(y: number): string {
  return y === 0 ? "₹0" : `₹${Math.round(y).toLocaleString("en-IN")}`;
}

function trendLabel(pct: number, suffix = "vs last period"): string {
  return `${pct >= 0 ? "+" : ""}${pct}% ${suffix}`;
}

interface TransactionStatCardsProps {
  timeframe: TotalVolumeTimeframe;
  totalVolumeLabel: string;
  metrics: TransactionsMetrics;
  trendCharts: TransactionsTrendCharts;
}

/** Same 4-equal-card grid, placement and card chrome as PaymentLinksStatCards
 * (see payment-links/index.tsx's "Metrics" header + this grid), reusing
 * PaymentLinkMetricCard directly for all four cards, Disputes rather than
 * a second near-identical card component. */
export function TransactionStatCards({
  timeframe,
  totalVolumeLabel,
  metrics,
  trendCharts,
}: TransactionStatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <PaymentLinkMetricCard
        title="Total volume"
        value={totalVolumeLabel}
        trendLabel={trendLabel(metrics.totalVolumeTrendPct)}
        trendPositive={metrics.totalVolumeTrendPct >= 0}
        data={totalVolumeChartsByTimeframe[timeframe]}
        accentColor="var(--chart-4)"
        formatTooltipValue={formatLakhTooltip}
        formatAxisValue={formatLakhAxis}
      />

      <PaymentLinkMetricCard
        title="Net volume"
        icon="wallet"
        value={`₹${metrics.netVolume.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
        trendLabel={trendLabel(metrics.netVolumeTrendPct)}
        trendPositive={metrics.netVolumeTrendPct >= 0}
        data={trendCharts.netVolume}
        accentColor="var(--chart-1)"
        formatTooltipValue={formatLakhTooltip}
        formatAxisValue={formatRupeeAxis}
      />

      <PaymentLinkMetricCard
        title="Disputes"
        icon="alert-triangle"
        value={`₹${metrics.disputeAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
        trendLabel={`${metrics.disputeCount.toLocaleString("en-IN")} transaction${metrics.disputeCount === 1 ? "" : "s"} · ${trendLabel(metrics.disputeAmountTrendPct)}`}
        // Inverted vs. every other card here, more disputes is a bad outcome,
        // so a rising trend reads red, not green.
        trendPositive={metrics.disputeAmountTrendPct < 0}
        data={trendCharts.disputeAmount}
        accentColor="var(--chart-5)"
        formatTooltipValue={formatLakhTooltip}
        formatAxisValue={formatRupeeAxis}
      />

      <PaymentLinkMetricCard
        title="Refunds"
        icon="repeat"
        value={`₹${metrics.refundAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
        trendLabel={`${metrics.refundCount.toLocaleString("en-IN")} transaction${metrics.refundCount === 1 ? "" : "s"} · ${trendLabel(metrics.refundAmountTrendPct)}`}
        trendPositive={metrics.refundAmountTrendPct >= 0}
        data={trendCharts.refundAmount}
        accentColor="var(--chart-3)"
        formatTooltipValue={formatLakhTooltip}
        formatAxisValue={formatRupeeAxis}
      />
    </div>
  );
}
