"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { inr } from "@/features/dashboard/partner-home/format";
import {
  PRODUCT_COLOURS,
  PRODUCT_NAMES,
} from "@/features/dashboard/partner-home/components/ProductSplit";
import type { PartnerKpi, PartnerPeriod } from "@/features/dashboard/partner-home/mock-data";

const PERIODS: { value: PartnerPeriod; label: string }[] = [
  { value: "month", label: "1M" },
  { value: "quarter", label: "3M" },
  { value: "year", label: "1Y" },
];

/** MOCK x-axis labels for the seven points each period's series carries. */
const POINT_LABELS: Record<PartnerPeriod, string[]> = {
  month: ["1 Sep", "6 Sep", "11 Sep", "16 Sep", "21 Sep", "26 Sep", "30 Sep"],
  quarter: ["1 Jul", "16 Jul", "1 Aug", "16 Aug", "1 Sep", "16 Sep", "30 Sep"],
  year: ["Oct", "Dec", "Feb", "Apr", "Jun", "Aug", "Sep"],
};

/** The series is in thousands of rupees. */
const SERIES_UNIT = 1000;

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { label: string; v: number } }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{point.label}</p>
      <p className="font-semibold tabular-nums text-foreground">{inr(point.v * SERIES_UNIT)}</p>
    </div>
  );
}

/**
 * The partner's headline: commission earned, with its trend, its curve over
 * the period and its split by product. The dashboard's performance card, in
 * the MCA dashboard's McaRevenueCard layout (title and period on one row,
 * the figure, then the chart filling the card).
 */
export function PartnerCommissionCard({
  kpi,
  comparisonLabel,
  period,
  onPeriodChange,
  isLoading,
}: {
  kpi: PartnerKpi;
  comparisonLabel: string;
  period: PartnerPeriod;
  onPeriodChange: (p: PartnerPeriod) => void;
  isLoading?: boolean;
}) {
  const gradientId = `partner-commission-${useId().replace(/[:]/g, "")}`;
  const up = kpi.changePct >= 0;
  const labels = POINT_LABELS[period];
  const data = kpi.spark.map((v, i) => ({ label: labels[i] ?? "", v }));
  const total = kpi.split.pa + kpi.split.mca;
  const split = (["pa", "mca"] as const).map((k) => ({
    key: k,
    value: kpi.split[k],
    pct: total > 0 ? Math.round((kpi.split[k] / total) * 100) : 0,
  }));

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Commission earned</h2>
        <div
          role="tablist"
          aria-label="Commission period"
          className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
        >
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              variant="ghost"
              size="sm"
              onClick={() => onPeriodChange(p.value)}
              className={cn(
                "h-7 min-h-0 rounded-md px-2.5 text-xs font-semibold shadow-none",
                period === p.value
                  ? "bg-card text-foreground shadow-sm hover:bg-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Shimmer className="h-9 w-40" />
          <Shimmer className="h-4 w-32" />
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-[2rem] font-bold leading-tight tracking-tight tabular-nums text-foreground">
            {inr(kpi.value)}
          </p>
          <p
            className={cn(
              "mt-0.5 flex items-center gap-1 text-xs font-medium",
              up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
          >
            <Icon name={up ? "trending-up" : "trending-down"} size={13} aria-hidden />
            {up ? "+" : ""}
            {kpi.changePct}% {comparisonLabel}
          </p>
        </div>
      )}

      <div className="mt-3 min-h-28 w-full flex-1">
        {isLoading ? (
          <Shimmer className="h-full min-h-28 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                interval="preserveStartEnd"
                height={20}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By product, as one line under the chart rather than its own block. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3">
        {split.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: PRODUCT_COLOURS[s.key] }}
            />
            <span className="text-muted-foreground">{PRODUCT_NAMES[s.key]}</span>
            <span className="font-semibold tabular-nums text-foreground">{inr(s.value)}</span>
            <span className="text-muted-foreground">· {s.pct}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
