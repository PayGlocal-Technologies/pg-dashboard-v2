"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import { CompactAmount } from "@/components/common/CompactAmount";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { formatCurrencyShort } from "@/lib/utils/format";
import {
  totalSettledTimeframes,
  type TotalSettledTimeframe,
} from "@/features/dashboard/settlement-reports/mock-data";
import type { SparklinePoint } from "@/features/dashboard/settlement-reports/types";

/** Y-axis tick label. Shared short form so ticks read in the same ₹K/₹L/₹Cr
 *  units as the headline (an earlier lakh-only version showed "6814.6L"). */
function formatLakhAxis(value: number): string {
  return value === 0 ? "₹0" : formatCurrencyShort(value, "INR");
}

/** Evenly-spaced 0..max ticks (4 divisions), max rounded up to the nearest ₹10k. */
function computeYAxisTicks(data: SparklinePoint[]): { domain: [number, number]; ticks: number[] } {
  const max = Math.max(...data.map((d) => d.y), 0);
  const niceMax = Math.max(Math.ceil(max / 10_000) * 10_000, 10_000);
  const step = niceMax / 4;
  return { domain: [0, niceMax], ticks: [0, step, step * 2, step * 3, niceMax] };
}

function TotalSettledTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload: SparklinePoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{point.x}</p>
      <p className="font-semibold tabular-nums text-foreground">
        ₹{point.y.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

interface TotalSettledCardProps {
  /** Raw settled total; the card compacts it (₹9.95L / ₹6.91Cr) and shows the
   *  exact figure on hover via CompactAmount. */
  totalSettled: number;
  totalSettledTrendPct: number;
  /** Trend comparison caption from the overview API (e.g. "vs last week").
   *  Falls back to "vs last" for the mock/PA path. */
  comparisonLabel?: string;
  /** Controlled: the selected timeframe drives the overview fetch upstream, so
   *  total/trend/chart all change together. */
  timeframe: TotalSettledTimeframe;
  onTimeframeChange: (timeframe: TotalSettledTimeframe) => void;
  /** The chart series for the selected timeframe. */
  chartData: SparklinePoint[];
  className?: string;
}

export function TotalSettledCard({
  totalSettled,
  totalSettledTrendPct,
  comparisonLabel,
  timeframe,
  onTimeframeChange,
  chartData,
  className,
}: TotalSettledCardProps) {
  const trendPositive = totalSettledTrendPct >= 0;
  const data = chartData;
  const { domain, ticks } = computeYAxisTicks(data);
  // Nothing settled in the window → no series to plot, so an illustration
  // stands in for the empty chart rather than an axis-only grid.
  const hasData = data.length > 0 && data.some((point) => point.y > 0);

  return (
    <Card className={cn("gap-4 p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Total settled</p>
          <CompactAmount
            amount={totalSettled}
            currency="INR"
            className="mt-2 block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
          {/* No trend beside a zero total — "+0%/-100% vs last week" against
              nothing settled reads as broken, so it's hidden until there's a
              real figure to compare. */}
          {hasData && (
            <div
              className={cn(
                "mt-2 flex items-center gap-1 text-xs font-medium",
                trendPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              <Icon name={trendPositive ? "trending-up" : "trending-down"} size={13} aria-hidden />
              <RollingNumber
                value={`${trendPositive ? "+" : ""}${totalSettledTrendPct}% ${comparisonLabel ?? "vs last"}`}
                className="tabular-nums"
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {totalSettledTimeframes.map((t) => (
            <Button
              key={t.value}
              variant="ghost"
              size="sm"
              onClick={() => onTimeframeChange(t.value)}
              className={cn(
                "h-auto min-h-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium",
                timeframe === t.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-76 w-full">
        {!hasData ? (
          <PlaceholderState
            variant="no-settlements"
            title="No settlements yet"
            description="Nothing has settled in this period yet."
            className="h-full"
          />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="total-settled-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="x"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
              interval="preserveStartEnd"
              height={24}
            />
            <YAxis
              domain={domain}
              ticks={ticks}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={formatLakhAxis}
              tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
            />
            <Tooltip content={<TotalSettledTooltip />} />
            <Area
              type="monotone"
              dataKey="y"
              stroke="var(--chart-4)"
              strokeWidth={2}
              fill="url(#total-settled-fill)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-4)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
