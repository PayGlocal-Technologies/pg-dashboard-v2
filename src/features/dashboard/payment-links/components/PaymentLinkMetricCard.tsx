"use client";

import { useId, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Separator } from "@/components/ui";
import { EmptyAxesChart, EMPTY_AXIS_LABELS } from "@/components/common/charts/EmptyAxesChart";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import { DotGridLine } from "@/components/common/charts/DotGridLine";
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
  /** Caption for the empty chart (no points, or every point zero). */
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  /** "full" (default, as Payment Links shows it): both axes and gridlines.
   *  "x": the period labels along the bottom only. "none": a bare line. */
  axes?: "full" | "x" | "none";
  /** Arrow direction, when it differs from good/bad: for a metric where a
   *  fall is good (refunds), it points down and still reads green.
   *  Defaults to `trendPositive`. */
  trendUp?: boolean;
  /** "trending" (default) or plain up/down arrows. */
  trendIcon?: "trending" | "arrow";
  /** Supporting figures under the chart, one label/value row each. */
  /** A label, then (optionally) a value set beside it on the left, then a
   *  right-aligned value or action. */
  details?: { label: string; inlineValue?: ReactNode; value: ReactNode }[];
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
  emptyTitle = "No data in this period",
  emptyDescription = "This metric is charted here as activity comes in.",
  className,
  axes = "full",
  trendUp,
  trendIcon = "trending",
  details,
}: PaymentLinkMetricCardProps) {
  const up = trendUp ?? trendPositive;
  const arrow =
    trendIcon === "arrow" ? (up ? "arrow-up" : "arrow-down") : up ? "trending-up" : "trending-down";
  const isEmpty = data.length === 0 || data.every((d) => !d.y);
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
          <Icon name={arrow} size={13} aria-hidden />
          <RollingNumber value={trendLabel} className="tabular-nums" />
        </div>
      </div>

      <div className="relative h-32 w-full">
        {isEmpty ? (
          // The platform's standard chart empty state: same axes, flat
          // zero line, a caption, no illustration.
          <EmptyAxesChart
            labels={data.length ? data.map((d) => d.x) : EMPTY_AXIS_LABELS.week}
            zeroLabel={formatAxisValue(0)}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              {axes === "full" && <CartesianGrid horizontal={DotGridLine} vertical={false} />}
              <XAxis
                hide={axes === "none"}
                dataKey="x"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
                interval="preserveStartEnd"
                height={20}
              />
              <YAxis
                hide={axes !== "full"}
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
        )}
      </div>

      {details && details.length > 0 && (
        <>
          <Separator />
          <dl className="space-y-1.5">
            {details.map((d) => (
              <div key={d.label} className="flex items-baseline justify-between gap-3 text-[13px]">
                <dt className="text-muted-foreground">
                  {d.label}
                  {d.inlineValue && (
                    <span className="ml-2 font-semibold text-foreground">{d.inlineValue}</span>
                  )}
                </dt>
                <dd className="font-semibold tabular-nums text-foreground">{d.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Card>
  );
}
