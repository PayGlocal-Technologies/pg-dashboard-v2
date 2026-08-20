"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface RecoveredTrendPoint {
  x: string;
  y: number;
}

function AmountRecoveredTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload: RecoveredTrendPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{point.x}</p>
      <p className="font-semibold tabular-nums text-foreground">₹{point.y.toLocaleString("en-IN")}</p>
    </div>
  );
}

interface AmountRecoveredCardProps {
  recoveredLabel: string;
  trendPct: number;
  data: RecoveredTrendPoint[];
}

export function AmountRecoveredCard({ recoveredLabel, trendPct, data }: AmountRecoveredCardProps) {
  const trendPositive = trendPct >= 0;

  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <h2 className="text-sm font-semibold text-foreground">Amount Recovered</h2>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
          {recoveredLabel}
        </span>
        <span className="text-sm text-muted-foreground">Recovered</span>
      </div>

      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="amount-recovered-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={<AmountRecoveredTooltip />} />
            <Area
              type="monotone"
              dataKey="y"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#amount-recovered-fill)"
              dot={{ r: 3, strokeWidth: 0, fill: "#10b981" }}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#10b981" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div
        className={cn(
          "flex items-center gap-1 text-xs font-medium",
          trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}
      >
        <Icon name={trendPositive ? "trending-up" : "trending-down"} size={13} aria-hidden />
        <span className="tabular-nums">
          {trendPositive ? "+" : ""}
          {trendPct}% vs previous month
        </span>
      </div>

      <Separator />

      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-primary">PayGlocal</span> helped recover {recoveredLabel} in disputed
        payments this month
      </p>
    </Card>
  );
}
