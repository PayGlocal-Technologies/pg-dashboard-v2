"use client";

import { useState } from "react";
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
import {
  totalSettledTimeframes,
  type TotalSettledTimeframe,
} from "@/features/dashboard/settlement-reports/mock-data";
import type { SparklinePoint } from "@/features/dashboard/settlement-reports/types";

function formatLakhAxis(value: number): string {
  return value === 0 ? "₹0" : `₹${(value / 100_000).toFixed(1)}L`;
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
  totalSettledLabel: string;
  totalSettledTrendPct: number;
  /** Per-timeframe series, differs by which product (PA/PACB) is active, see useProductContext.ts. */
  chartsByTimeframe: Record<TotalSettledTimeframe, SparklinePoint[]>;
  className?: string;
}

export function TotalSettledCard({
  totalSettledLabel,
  totalSettledTrendPct,
  chartsByTimeframe,
  className,
}: TotalSettledCardProps) {
  const [timeframe, setTimeframe] = useState<TotalSettledTimeframe>("ytd");
  const trendPositive = totalSettledTrendPct >= 0;
  const data = chartsByTimeframe[timeframe];
  const { domain, ticks } = computeYAxisTicks(data);

  return (
    <Card className={cn("gap-4 p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Total settled</p>
          <RollingNumber
            value={totalSettledLabel}
            className="mt-2 block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
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
              value={`${trendPositive ? "+" : ""}${totalSettledTrendPct}% vs last`}
              className="tabular-nums"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {totalSettledTimeframes.map((t) => (
            <Button
              key={t.value}
              variant="ghost"
              size="sm"
              onClick={() => setTimeframe(t.value)}
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

      <div className="h-48 w-full">
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
      </div>
    </Card>
  );
}
