"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import type { SparklinePoint } from "@/features/dashboard/payment-links/types";

interface MetricTooltipProps {
  active?: boolean;
  payload?: readonly { payload: SparklinePoint }[];
  formatValue: (y: number) => string;
}

function MetricTooltip({ active, payload, formatValue }: MetricTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{point.x}</p>
      <p className="font-semibold tabular-nums text-foreground">{formatValue(point.y)}</p>
    </div>
  );
}

export interface PaymentLinkMetricCardProps {
  title: string;
  icon?: IconName;
  value: string;
  trendLabel: string;
  trendPositive?: boolean;
  data: SparklinePoint[];
  accentColor: string;
  formatTooltipValue?: (y: number) => string;
  formatAxisValue?: (y: number) => string;
  className?: string;
}

export function PaymentLinkMetricCard({
  title,
  icon,
  value,
  trendLabel,
  trendPositive = true,
  data,
  accentColor,
  formatTooltipValue = (y) => y.toLocaleString("en-US"),
  formatAxisValue = (y) => y.toLocaleString("en-US"),
  className,
}: PaymentLinkMetricCardProps) {
  const gradientId = `payment-link-metric-fill-${useId().replace(/[:]/g, "")}`;

  return (
    <Card className={cn("gap-3 p-5", className)}>
      <div>
        <div className="flex items-center gap-1.5">
          {icon && <Icon name={icon} size={15} className="text-muted-foreground" aria-hidden />}
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <RollingNumber
          value={value}
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
          <RollingNumber value={trendLabel} className="tabular-nums" />
        </div>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="x"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
              interval="preserveStartEnd"
              height={20}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={formatAxisValue}
              tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
            />
            <Tooltip content={<MetricTooltip formatValue={formatTooltipValue} />} />
            <Area
              type="monotone"
              dataKey="y"
              stroke={accentColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: accentColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
