"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Shimmer,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { CompactAmount } from "@/components/common/CompactAmount";
import { DotGridLine } from "@/components/common/charts/DotGridLine";
import { formatCurrencyShort } from "@/lib/utils/format";
import {
  netVolumeByTimeframe,
  paymentsCountByTimeframe,
  revenueTimeframes,
  type RevenuePoint,
  type RevenueSeries,
  type RevenueTimeframe,
} from "@/features/dashboard/mca-home/mock-data";
import { useRevenueTrend } from "@/features/dashboard/mca-home/hooks";

/** Day window per timeframe. The revenue-trend endpoint is date-ranged, so each
 *  tab asks for its own window and gets its own series — the chart is NOT one
 *  fixed curve. Computed once on mount (no `new Date()` in render). */
const TIMEFRAME_DAYS: Record<RevenueTimeframe, number> = { "1W": 7, "1M": 30, "3M": 90 };

/** What the trend line reads as for each tab — "vs last week" / "vs last
 *  month" / "vs previous 3 months", the same wording mock-data.ts already
 *  uses for Net volume/Number of payments. Applied here too rather than
 *  trusting the live "collected" series' own `comparisonLabel`: that field
 *  comes straight from the revenue-trend endpoint as a raw day count ("vs
 *  previous 91 days" for the 3M tab), which doesn't match the 1W/1M/3M
 *  labels above it and reads as a different scale than what was picked. */
const TIMEFRAME_COMPARISON_LABEL: Record<RevenueTimeframe, string> = {
  "1W": "vs last week",
  "1M": "vs last month",
  "3M": "vs previous 3 months",
};

function buildRevenueRanges(): Record<RevenueTimeframe, { startDate: string; endDate: string }> {
  const end = new Date();
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  const back = (days: number): { startDate: string; endDate: string } => {
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return { startDate: iso(start), endDate: iso(end) };
  };
  return {
    "1W": back(TIMEFRAME_DAYS["1W"]),
    "1M": back(TIMEFRAME_DAYS["1M"]),
    "3M": back(TIMEFRAME_DAYS["3M"]),
  };
}

/** Y-axis tick label. Delegates to the shared short form so the axis reads in
 *  the same ₹K/₹L/₹Cr units as every headline and bar figure. */
function formatMoneyAxis(value: number): string {
  if (value === 0) return "₹0";
  // Whole units, not formatCurrencyShort's 2-decimal precision (₹100.00Cr) —
  // axis ticks are round gridline values by construction, so the decimals
  // never carry information, just clutter.
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${Math.round(abs / 10_000_000)}Cr`;
  if (abs >= 100_000) return `${sign}₹${Math.round(abs / 100_000)}L`;
  if (abs >= 1_000) return `${sign}₹${Math.round(abs / 1_000)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

/** Plain-count axis label, for the "Number of payments" metric — there is no
 *  currency to compact, just a grouped integer. */
function formatCountAxis(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function TrendTooltip({
  active,
  payload,
  isMoney,
}: {
  active?: boolean;
  payload?: readonly { payload: RevenuePoint }[];
  isMoney: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{point.x}</p>
      <p className="font-semibold tabular-nums text-foreground">
        {isMoney ? formatMoneyAxis(point.current) : formatCountAxis(point.current)}
      </p>
    </div>
  );
}

/**
 * What the dropdown beside the title switches between. One reusable card,
 * not three — every option renders through the same trend-chart layout
 * below, so switching options never changes the card's height.
 *
 * "Net volume" and "Number of payments" have no live trend endpoint for the
 * MCA scope yet, so they read from the mock series in mock-data.ts — the same
 * placeholder-dataset pattern `revenueByTimeframe` already established there —
 * rather than going empty. "Total amount collected" is real, live data.
 */
type PerformanceMetric = "collected" | "net-volume" | "payments";

const METRIC_OPTIONS: { value: PerformanceMetric; label: string }[] = [
  { value: "collected", label: "Total amount collected" },
  { value: "net-volume", label: "Net volume" },
  { value: "payments", label: "Number of payments" },
];

export function McaRevenueCard() {
  const [timeframe, setTimeframe] = useState<RevenueTimeframe>("3M");
  const [metric, setMetric] = useState<PerformanceMetric>("collected");
  const [ranges] = useState(buildRevenueRanges);

  const { startDate, endDate } = ranges[timeframe];
  const {
    trend,
    isLoading: trendLoading,
    isError: trendError,
  } = useRevenueTrend(startDate, endDate);

  const metricLabel =
    METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? METRIC_OPTIONS[0]!.label;

  // The 1W/1M/3M pills change every metric's series here — real for
  // "collected", mock but still per-timeframe for the other two — so unlike
  // an earlier version of this card, nothing needs it dimmed.
  const isMoneyMetric = metric === "collected" || metric === "net-volume";
  const isTrendMetric = metric === "collected" || metric === "net-volume" || metric === "payments";

  // ── Trend metrics: "Total amount collected" (live), "Net volume" and
  // "Number of payments" (mock) all render through the same chart below. ──
  const liveSeries: RevenueSeries | null = trend
    ? {
        currency: trend.currency,
        total: trend.total,
        previousTotal: trend.previousTotal,
        trendPct: trend.trendPct,
        comparisonLabel: trend.comparisonLabel,
        points: trend.points.map((p) => ({ x: p.label, current: p.current, previous: p.previous })),
      }
    : null;

  const activeSeries: RevenueSeries | null =
    metric === "collected"
      ? liveSeries
      : metric === "net-volume"
        ? netVolumeByTimeframe[timeframe]
        : metric === "payments"
          ? paymentsCountByTimeframe[timeframe]
          : null;

  const activeLoading = metric === "collected" && trendLoading;
  const activeError = metric === "collected" && trendError;
  const hasChartData = !activeLoading && !activeError && (activeSeries?.points.length ?? 0) > 0;
  const trendPositive = (activeSeries?.trendPct ?? 0) >= 0;

  return (
    <Card className="h-full gap-0 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto min-h-0 gap-1 px-1.5 py-1 text-sm font-semibold text-foreground hover:bg-muted"
              rightIcon={<Icon name="chevron-down" className="h-3.5 w-3.5 text-muted-foreground" />}
            >
              {metricLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {METRIC_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.value} onSelect={() => setMetric(opt.value)}>
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {metric === "collected" && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="-ml-2 flex items-center text-muted-foreground">
                  <Icon name="info" className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Includes collections from all sources, including invoices.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {revenueTimeframes.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTimeframe(opt.value)}
              className={cn(
                "h-auto min-h-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                timeframe === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {isTrendMetric && (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="flex items-baseline gap-2">
              {activeLoading ? (
                <Shimmer className="h-8 w-32" />
              ) : activeSeries ? (
                <>
                  {isMoneyMetric ? (
                    <CompactAmount
                      amount={activeSeries.total}
                      currency={activeSeries.currency}
                      className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
                    />
                  ) : (
                    <span className="block text-2xl font-bold tracking-tight text-foreground tabular-nums">
                      {formatCountAxis(activeSeries.total)}
                    </span>
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    {isMoneyMetric ? activeSeries.currency : "payments"}
                  </span>
                </>
              ) : (
                <span className="block text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  —
                </span>
              )}
            </div>
            {/* Right beside the headline figure now, not floated to the far
                edge of the row where it read as an orphaned label under the
                1W/1M/3M toggle instead of a comparison to the number next to
                it. Still small/muted — a footnote to the main figure, not a
                second KPI. */}
            {!activeLoading && activeSeries && (
              <p className="text-xs text-muted-foreground">
                Previous{" "}
                <span className="font-semibold tabular-nums">
                  {isMoneyMetric
                    ? formatCurrencyShort(activeSeries.previousTotal, activeSeries.currency)
                    : formatCountAxis(activeSeries.previousTotal)}
                </span>
              </p>
            )}
          </div>

          {activeSeries && activeSeries.total > 0 && !activeLoading ? (
            <div
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                trendPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              <Icon name={trendPositive ? "trending-up" : "trending-down"} size={13} aria-hidden />
              <span>
                {trendPositive ? "+" : ""}
                {activeSeries.trendPct}% {TIMEFRAME_COMPARISON_LABEL[timeframe]}
              </span>
            </div>
          ) : activeLoading ? (
            <Shimmer className="mt-1 h-4 w-40" />
          ) : null}

          {/* mt-5, not mt-2.5: the card's own height is fixed (Card is a flex
              column, this wrapper is flex-1), so growing this margin only
              gives the amount/trend text some breathing room above the
              chart — it comes out of the chart's own share of the
              already-fixed card height, not the card growing. */}
          <div className="mt-5 min-h-28 w-full flex-1">
            {activeLoading ? (
              <Shimmer className="h-full min-h-28 w-full" />
            ) : activeError ? (
              <PlaceholderState
                variant="error"
                size="sm"
                title="Couldn't load"
                description="Revenue didn't load."
                className="h-full min-h-28"
              />
            ) : !hasChartData ? (
              <PlaceholderState
                variant="no-analytics"
                size="sm"
                title="No data in this period"
                description="This metric is charted here as activity comes in."
                className="h-full min-h-28"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activeSeries!.points}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="mca-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                      <stop offset="60%" stopColor="var(--chart-1)" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={DotGridLine} vertical={false} />
                  <XAxis
                    dataKey="x"
                    axisLine={{ stroke: "var(--chart-grid)" }}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
                    height={24}
                  />
                  <YAxis
                    axisLine={{ stroke: "var(--chart-grid)" }}
                    tickLine={false}
                    width={48}
                    tickFormatter={isMoneyMetric ? formatMoneyAxis : formatCountAxis}
                    tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
                  />
                  <RechartsTooltip content={<TrendTooltip isMoney={isMoneyMetric} />} />
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#mca-revenue-fill)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-1)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
