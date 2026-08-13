"use client";

import { Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PaymentLinkMetricCard } from "@/features/dashboard/payment-links/components/PaymentLinkMetricCard";
import type {
  TransactionsMetrics,
  TransactionsTrendCharts,
  TotalVolumeTimeframe,
} from "@/features/dashboard/pa-transactions/summary";
import { totalVolumeChartsByTimeframe } from "@/features/dashboard/pa-transactions/summary";

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
 * PaymentLinkMetricCard directly rather than a second near-identical card
 * component, only Payment method keeps its own layout since it's a
 * breakdown list, a shape none of Payment Links' cards need. */
export function TransactionStatCards({ timeframe, totalVolumeLabel, metrics, trendCharts }: TransactionStatCardsProps) {
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

      {/* Payment method is a breakdown list, not a single value+trend+chart,
       * so it keeps its own content while matching the same card chrome
       * (gap-3 p-5, plain icon + semibold title row) as every other card
       * here. No reliable PayGlocal-assisted-completions attribution exists
       * in the data layer yet (see summary.ts's TODO(integration)), so the
       * one-line insight this card could otherwise carry is left out rather
       * than showing a fabricated count, per the no-invented-numbers rule. */}
      <Card className="gap-3 p-5">
        <div className="flex items-center gap-1.5">
          <Icon name="pie-chart" size={15} className="text-muted-foreground" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Payment method</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {metrics.paymentMethodSplit.map((method) => (
            <div key={method.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{method.label}</span>
                <span className="tabular-nums text-muted-foreground">{method.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${method.pct}%`, backgroundColor: method.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

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
