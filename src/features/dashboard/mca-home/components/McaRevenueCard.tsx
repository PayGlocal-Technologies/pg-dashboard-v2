"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import {
  REVENUE_TIMEFRAME_SCALE,
  revenueSeries,
  revenueSummary,
  revenueTimeframes,
  upcomingSettlement,
  type RevenuePoint,
  type RevenueTimeframe,
} from "@/features/dashboard/mca-home/mock-data";

function formatLakhAxis(value: number): string {
  return value === 0 ? "₹0" : `₹${(value / 100_000).toFixed(0)}L`;
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
      <p className="font-semibold tabular-nums text-foreground">{point.current.toLocaleString("en-IN")}</p>
    </div>
  );
}

interface McaRevenueCardProps {
  onViewSettlements?: () => void;
}

export function McaRevenueCard({ onViewSettlements }: McaRevenueCardProps) {
  const [timeframe, setTimeframe] = useState<RevenueTimeframe>("1M");
  const scale = REVENUE_TIMEFRAME_SCALE[timeframe];
  const data = revenueSeries.map((p) => ({ ...p, current: p.current * scale, previous: p.previous * scale }));
  const trendPositive = revenueSummary.trendPct >= 0;

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
        <RollingNumber
          value={formatLakhTotal(revenueSummary.total * scale)}
          className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
        />
        <span className="text-xs font-medium text-muted-foreground">{revenueSummary.currency}</span>
      </div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1 text-xs font-medium",
          trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}
      >
        <Icon name={trendPositive ? "trending-up" : "trending-down"} size={13} aria-hidden />
        <span>
          {trendPositive ? "+" : ""}
          {revenueSummary.trendPct}% vs last month
        </span>
      </div>

      <div className="mt-4 min-h-48 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
              tickFormatter={formatLakhAxis}
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
      </div>

      <Separator className="my-4" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Upcoming settlement</p>
          <div className="mt-1 flex items-center gap-2">
            <RollingNumber
              value={`₹${upcomingSettlement.amount.toLocaleString("en-IN")}`}
              className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
            />
            <Badge size="sm">{upcomingSettlement.cycle}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Settles at {upcomingSettlement.settlesAtLabel} · {upcomingSettlement.bankAccountLabel}
          </p>
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
