"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Card, Separator, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import {
  revenueTimeframes,
  type RevenuePoint,
  type RevenueTimeframe,
} from "@/features/dashboard/mca-home/mock-data";
import { useRevenueTrend } from "@/features/dashboard/mca-home/hooks";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { useSettlementUpcoming } from "@/features/dashboard/settlement-reports/hooks";

/** Day window per timeframe. The revenue-trend endpoint is date-ranged, so each
 *  tab asks for its own window and gets its own series — the chart is NOT one
 *  fixed curve. Computed once on mount (no `new Date()` in render). */
const TIMEFRAME_DAYS: Record<RevenueTimeframe, number> = { "1W": 7, "1M": 30, "3M": 90 };

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

/**
 * Y-axis tick label, in the unit the values are actually in.
 *
 * Two things an earlier `(value / 100_000).toFixed(0)` got wrong. It rounded
 * every lakh figure to a whole lakh, so a 1.2L / 1.4L / 1.5L band rendered three
 * consecutive ticks all reading "₹1L" and the axis looked broken. And it forced
 * lakhs on a daily series, where 18,000 became "₹0L". Below a lakh this reads in
 * thousands, above it in lakhs with one decimal until the whole-lakh figure is
 * unambiguous on its own.
 */
function formatMoneyAxis(value: number): string {
  if (value === 0) return "₹0";
  const abs = Math.abs(value);
  if (abs >= 100_000) {
    const lakh = value / 100_000;
    return `₹${lakh < 10 ? lakh.toFixed(1) : lakh.toFixed(0)}L`;
  }
  return `₹${Math.round(value / 1000)}K`;
}

function formatLakhTotal(value: number): string {
  return `₹${(value / 100_000).toFixed(2)}L`;
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload: RevenuePoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{point.x}</p>
      <p className="font-semibold tabular-nums text-foreground">
        {point.current.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

interface McaRevenueCardProps {
  onViewSettlements?: () => void;
}

export function McaRevenueCard({ onViewSettlements }: McaRevenueCardProps) {
  const [timeframe, setTimeframe] = useState<RevenueTimeframe>("1M");
  const [ranges] = useState(buildRevenueRanges);

  const { startDate, endDate } = ranges[timeframe];
  const { trend, isLoading, isError } = useRevenueTrend(startDate, endDate);

  // Upcoming settlement — the same live endpoint the settlement-report screen
  // uses (useSettlementUpcoming). Merchant-scoped, so resolve the PACB MID here.
  const { scopeId: settlementScopeId } = useScopeId("PACB");
  const { upcoming } = useSettlementUpcoming(settlementScopeId);

  // API points → the chart's shape (label → x). Empty until the call resolves.
  const chartData: RevenuePoint[] = (trend?.points ?? []).map((p) => ({
    x: p.label,
    current: p.current,
    previous: p.previous,
  }));
  const trendPositive = (trend?.trendPct ?? 0) >= 0;
  const hasData = !isLoading && !isError && chartData.length > 0;

  return (
    <Card className="h-full gap-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Revenue</h2>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
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

      <div className="mt-3 flex items-baseline gap-2">
        {isLoading ? (
          <Shimmer className="h-8 w-32" />
        ) : (
          <>
            <RollingNumber
              value={trend ? formatLakhTotal(trend.total) : "—"}
              className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
            />
            {trend && (
              <span className="text-xs font-medium text-muted-foreground">{trend.currency}</span>
            )}
          </>
        )}
      </div>

      {/* Trend is only meaningful against a non-zero figure — a "-100% vs
          previous period" beside ₹0 reads as broken, so it's hidden when there's
          nothing settled in the window. */}
      {isLoading ? (
        <Shimmer className="mt-1 h-4 w-40" />
      ) : trend && trend.total > 0 ? (
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
            {trend.trendPct}% {trend.comparisonLabel}
          </span>
        </div>
      ) : null}

      <div className="mt-4 min-h-48 w-full flex-1">
        {isLoading ? (
          <Shimmer className="h-full min-h-48 w-full" />
        ) : isError ? (
          <PlaceholderState
            variant="error"
            title="Couldn't load"
            description="Revenue didn't load."
            className="h-full min-h-48"
          />
        ) : !hasData ? (
          <PlaceholderState
            variant="no-analytics"
            title="No revenue"
            description="No revenue in this period."
            className="h-full min-h-48"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mca-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="x"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
                height={24}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={formatMoneyAxis}
                tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
              />
              <Tooltip content={<RevenueTooltip />} />
              <Area
                type="monotone"
                dataKey="current"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                fill="url(#mca-revenue-fill)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-1)" }}
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <Separator className="my-4" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Upcoming settlement</p>
          <RollingNumber
            value={upcoming ? `₹${upcoming.amount.toLocaleString("en-IN")}` : "—"}
            className="mt-1 block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
          {upcoming && upcoming.transactionCount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {upcoming.transactionCount} transaction{upcoming.transactionCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onViewSettlements}
          rightIcon={<Icon name="arrow-up-right" className="h-3.5 w-3.5" />}
        >
          View settlements
        </Button>
      </div>
    </Card>
  );
}
