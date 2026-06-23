"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartSkeleton, DataTable, type Column } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { WidgetId } from "@/features/dashboard/home/widget-catalog";
import {
  countryInsights,
  dashboardStats,
  dashboardWidgetKpis,
  hourlyTraffic,
  indiaStateInsights,
  inrVsFxSplit,
  monthlyVolume,
  netVsGrossWeekly,
  paymentFailureReasons,
  paymentMethodSplit,
  settlementSpeedBuckets,
  topCustomersBySpend,
  weeklyUpiVsCard,
} from "@/features/dashboard/home/mock-data";
import { CountryInsightsMap } from "@/features/dashboard/home/components/widgets/CountryInsightsMap";
import { StateInsightsList } from "@/features/dashboard/home/components/widgets/StateInsightsList";

 

const BRAND = "#0061E3";
const BRAND_SOFT = "#93c5fd";

const cardClass =
  "bg-card text-card-foreground rounded-xl border border-border shadow-sm";

/** Recharts sometimes fails to resolve `fill="var(--…)"` on bar backgrounds; use explicit colors per theme. */
function useChartBarTrackFill(): string {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.07)" : "#f3f4f6";
}

/** Shared chrome for Recharts tooltips — matches dashboard volume hover card */
const chartTooltipShellClass =
  "rounded-2xl border border-zinc-200/90 bg-card px-4 py-3.5 text-xs text-card-foreground antialiased shadow-[0_10px_40px_-14px_rgba(15,23,42,0.2)] dark:border-zinc-700/85 dark:bg-zinc-950 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]";

function StandardChartTooltip({
  active,
  payload,
  label,
  formatValue,
  className,
}: {
  active?: boolean;
  payload?: readonly any[];
  label?: string | number;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={cn(chartTooltipShellClass, "max-w-[min(100vw-1.5rem,17rem)]", className)}>
      <p className="mb-2.5 text-sm font-semibold leading-none text-foreground">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
                style={{ background: entry.color ?? entry.fill ?? "#0061E3" }}
              />
              <span className="truncate text-[13px] text-muted-foreground">{entry.name}:</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
              {formatValue && entry.value !== undefined
                ? formatValue(entry.value as number)
                : (entry.value as number)?.toLocaleString("en-IN") ?? String(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BarChartCardProps {
  data: { [key: string]: string | number }[];
  xKey: string;
  bars: { key: string; label: string; color: string }[];
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  formatValue?: (v: number) => string;
  height?: number;
  className?: string;
}

function BarChartCard({
  data,
  xKey,
  bars,
  title,
  subtitle,
  isLoading,
  formatValue,
  height = 200,
  className,
}: BarChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "bg-card text-card-foreground rounded-xl border border-border px-5 pt-4 pb-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {bars.map((bar) => (
            <div key={bar.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: bar.color }} />
              <span className="text-[11px] text-muted-foreground font-medium">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} barCategoryGap="22%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000
                    ? `${(v / 1_000).toFixed(0)}K`
                    : v
              }
              width={40}
            />
            <Tooltip
              content={(props) => <StandardChartTooltip {...props} formatValue={formatValue} />}
              cursor={{ fill: "var(--chart-cursor)", radius: 4 }}
            />
            {bars.map((bar) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.label}
                fill={bar.color}
                radius={[5, 5, 0, 0]}
                animationDuration={720}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}

/** Matches StatCard sparkline: gradient area, dashed cursor, brand stroke */
function StatStyleSparkline({
  data,
  lineColor = BRAND,
  uid,
}: {
  data: number[];
  lineColor?: string;
  uid: string;
}) {
  const sparkData = data.map((v, i) => ({ i, v }));
  const gradId = `w-spark-${uid}`;
  return (
    <div className="flex-shrink-0 rounded-lg" style={{ width: "44%", height: 52, minWidth: 88 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparkData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ display: "none" }}
            cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
            animationDuration={650}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiBlock({
  title,
  valueLabel,
  change,
  changeUnit = "percent",
  changeLabel = "vs last period",
  subtitle,
  spark,
  preview,
  isLoading,
}: {
  title: string;
  valueLabel: string;
  change?: number;
  changeUnit?: "percent" | "pts";
  changeLabel?: string;
  subtitle?: string;
  spark: number[];
  preview?: boolean;
  isLoading?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const sparkData = spark;

  if (isLoading && !preview) {
    return (
      <div className={cn(cardClass, "p-5 flex flex-col gap-2")}>
        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
        <div className="h-9 w-40 bg-muted rounded-md animate-pulse mt-3" />
        <div className="flex justify-between gap-2 mt-1">
          <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          <div className="h-[52px] flex-1 max-w-[44%] bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={preview ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(cardClass, "p-5 flex flex-col gap-2 cursor-inherit h-full")}
    >
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-normal text-muted-foreground">{title}</span>
      </div>

      <div className="text-[1.5rem] sm:text-[1.9rem] font-bold text-foreground leading-none tracking-tight tabular-nums mt-3">
        {valueLabel}
      </div>

      <div className="flex items-end gap-2 mt-1 min-h-[52px]">
        <div className="flex flex-col gap-1 flex-1 min-w-0 justify-end pb-0.5">
          {change !== undefined ? (
            <div
              className={cn(
                "flex items-center gap-1 text-[12px] font-semibold whitespace-nowrap flex-wrap",
                isPositive ? "text-emerald-600" : "text-red-500"
              )}
            >
              {isPositive ? (
                <Icon name="trending-up" style={{ width: 13, height: 13 }} className="shrink-0" />
              ) : (
                <Icon name="trending-down" style={{ width: 13, height: 13 }} className="shrink-0" />
              )}
              <span>
                {isPositive && change > 0 ? "+" : ""}
                {change}
                {changeUnit === "percent" ? "%" : " pts"}
              </span>
              <span className="text-muted-foreground font-normal text-[11px]">{changeLabel}</span>
            </div>
          ) : subtitle ? (
            <span className="text-[11px] text-muted-foreground">{subtitle}</span>
          ) : null}
        </div>
        <StatStyleSparkline data={sparkData} uid={uid} />
      </div>
    </motion.div>
  );
}

function fmtInr(n: number) {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function ChartCardFrame({
  title,
  subtitle,
  children,
  className,
  minHeight,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  minHeight?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className={cn("rounded-xl px-5 pt-4 pb-3", cardClass, minHeight, className)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function PieSplitCard({
  title,
  subtitle,
  data,
  preview,
  isLoading,
}: {
  title: string;
  subtitle?: string;
  data: { key: string; label: string; value: number; color: string }[];
  preview?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading && !preview) {
    return (
      <div className={cn(cardClass, "px-5 pt-4 pb-3 min-h-[220px]")}>
        <ChartSkeleton />
      </div>
    );
  }
  return (
    <ChartCardFrame title={title} subtitle={subtitle} minHeight="min-h-[220px]">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="w-[128px] h-[128px] shrink-0 mx-auto sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={(props) => <StandardChartTooltip {...props} formatValue={(v) => `${v}%`} />}
                cursor={false}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={2}
              >
                {data.map((e) => (
                  <Cell key={e.key} fill={e.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 min-w-[140px] space-y-2 text-xs">
          {data.map((e) => (
            <li key={e.key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: e.color }} />
                {e.label}
              </span>
              <span className="font-semibold text-foreground tabular-nums">{e.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCardFrame>
  );
}

type TopCustomerRow = (typeof topCustomersBySpend)[number];

const topCustomerColumns: Column<TopCustomerRow>[] = [
  {
    key: "customer",
    header: "Customer",
    render: (r) => (
      <div>
        <div className="font-medium text-foreground">{r.name}</div>
        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{r.email}</div>
      </div>
    ),
  },
  {
    key: "total",
    header: "Total",
    align: "right",
    render: (r) => (
      <span className="font-semibold text-foreground whitespace-nowrap">{fmtInr(r.total)}</span>
    ),
  },
];

export function DashboardWidgetRenderer({
  widgetId,
  preview = false,
  isLoading,
}: {
  widgetId: WidgetId;
  preview?: boolean;
  isLoading?: boolean;
}) {
  const chartBarTrackFill = useChartBarTrackFill();
  switch (widgetId) {
    case "payments_successful_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Successful Payments"
          valueLabel={preview ? "₹8.2L" : fmtInr(dashboardStats.successfulPayments.value)}
          change={preview ? 12.4 : dashboardStats.successfulPayments.change}
          spark={[42, 55, 48, 60, 53, 70, 65, 78, 72, 88, 84, 95]}
        />
      );
    case "payments_attempts_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Payment Attempts"
          valueLabel={preview ? "364" : String(dashboardWidgetKpis.paymentAttempts.value)}
          change={preview ? 4.8 : dashboardWidgetKpis.paymentAttempts.change}
          spark={[30, 38, 42, 40, 48, 52, 50, 58, 55, 60, 62, 64]}
        />
      );
    case "payments_success_rate_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Success rate"
          valueLabel={preview ? "94.2%" : `${dashboardWidgetKpis.successRate.value}%`}
          change={preview ? 1.1 : dashboardWidgetKpis.successRate.change}
          changeUnit="pts"
          changeLabel="vs prior"
          spark={[88, 89, 90, 91, 92, 93, 93, 94, 94, 94, 94, 94]}
        />
      );
    case "payments_avg_ticket_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Average ticket size"
          valueLabel={preview ? "₹2.5K" : fmtInr(dashboardWidgetKpis.avgTicket.value)}
          subtitle="Per successful capture"
          spark={[22, 23, 24, 23, 25, 24, 26, 25, 27, 26, 28, 25]}
        />
      );
    case "payments_refunds_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Refunds"
          valueLabel={preview ? "₹18.4K" : fmtInr(dashboardWidgetKpis.refunds.value)}
          change={preview ? -2.3 : dashboardWidgetKpis.refunds.change}
          spark={[20, 22, 21, 23, 22, 20, 19, 18, 18, 17, 18, 18]}
        />
      );
    case "payments_failed_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Failed payments"
          valueLabel={preview ? "22" : String(dashboardWidgetKpis.failedPayments.value)}
          change={preview ? -8 : dashboardWidgetKpis.failedPayments.change}
          spark={[35, 32, 30, 28, 26, 24, 23, 22, 22, 22, 21, 22]}
        />
      );
    case "charts_monthly_volume":
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "px-5 pt-4 pb-3 min-h-[260px]")}>
            <ChartSkeleton />
          </div>
        );
      }
      return (
        <BarChartCard
          title="Monthly Volume"
          subtitle="Payment volume vs settlements"
          data={
            preview
              ? monthlyVolume.map((m) => ({ ...m, volume: m.volume * 0.3 + 100000 }))
              : monthlyVolume
          }
          xKey="month"
          bars={[
            { key: "volume", label: "Volume", color: BRAND },
            { key: "settlements", label: "Settled", color: BRAND_SOFT },
          ]}
          formatValue={(v) => `₹${(v / 100000).toFixed(1)}L`}
          isLoading={false}
          height={220}
          className="h-full"
        />
      );
    case "charts_gross_volume_split": {
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "px-5 pt-4 pb-3 min-h-[260px]")}>
            <ChartSkeleton />
          </div>
        );
      }
      const base = preview
        ? monthlyVolume.map((m) => ({ ...m, volume: m.volume * 0.3 + 100000 }))
        : monthlyVolume;
      const splitData = base.map((m, i) => {
        const internationalShare = 0.22 + (i % 3) * 0.015;
        const international = Math.round(m.volume * internationalShare);
        const domestic = Math.max(0, Math.round(m.volume - international));
        return { month: m.month, domestic, international };
      });
      return (
        <BarChartCard
          title="Gross volume split"
          subtitle="International vs domestic capture volume"
          data={splitData}
          xKey="month"
          bars={[
            { key: "domestic", label: "Domestic", color: BRAND_SOFT },
            { key: "international", label: "International", color: BRAND },
          ]}
          formatValue={(v) => `₹${(v / 100000).toFixed(1)}L`}
          isLoading={false}
          height={220}
          className="h-full"
        />
      );
    }
    case "charts_hourly_traffic": {
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "px-5 pt-4 pb-3 min-h-[240px]")}>
            <ChartSkeleton />
          </div>
        );
      }
      const ht = preview
        ? hourlyTraffic.map((d) => ({ ...d, v: Math.round(d.v * 0.4 + 5) }))
        : hourlyTraffic;
      return (
        <ChartCardFrame title="Hourly traffic" subtitle="Sessions by hour (IST)" minHeight="min-h-[240px]">
          <div className="h-[188px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ht}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  content={(props) => <StandardChartTooltip {...props} />}
                  cursor={{ stroke: BRAND, strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.35 }}
                />
                <Line
                  type="monotone"
                  dataKey="v"
                  name="Sessions"
                  stroke={BRAND}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: BRAND, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCardFrame>
      );
    }
    case "charts_payment_split":
      return (
        <PieSplitCard
          title="Payment method split"
          subtitle="Share of successful volume"
          data={paymentMethodSplit}
          preview={preview}
          isLoading={isLoading}
        />
      );
    case "charts_upi_vs_card_weekly":
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "px-5 pt-4 pb-3 min-h-[260px]")}>
            <ChartSkeleton />
          </div>
        );
      }
      return (
        <BarChartCard
          title="UPI vs Card (weekly)"
          subtitle="Rail mix — SMB India view"
          data={weeklyUpiVsCard}
          xKey="week"
          bars={[
            { key: "upi", label: "UPI", color: BRAND },
            { key: "card", label: "Card", color: BRAND_SOFT },
          ]}
          formatValue={(v) => `₹${(v / 1000).toFixed(0)}K`}
          isLoading={false}
          height={200}
          className="h-full"
        />
      );
    case "charts_net_vs_gross":
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "px-5 pt-4 pb-3 min-h-[260px]")}>
            <ChartSkeleton />
          </div>
        );
      }
      return (
        <BarChartCard
          title="Net vs gross"
          subtitle="After MDR & taxes vs captured volume"
          data={netVsGrossWeekly}
          xKey="label"
          bars={[
            { key: "gross", label: "Gross", color: BRAND_SOFT },
            { key: "net", label: "Net", color: BRAND },
          ]}
          formatValue={(v) => `₹${(v / 1000).toFixed(0)}K`}
          isLoading={false}
          height={200}
          className="h-full"
        />
      );
    case "charts_inr_fx_split":
      return (
        <PieSplitCard
          title="INR vs FX volume"
          subtitle="Domestic settlements vs multi-currency"
          data={inrVsFxSplit}
          preview={preview}
          isLoading={isLoading}
        />
      );
    case "charts_settlement_lag":
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "px-5 pt-4 pb-3 min-h-[240px]")}>
            <ChartSkeleton />
          </div>
        );
      }
      return (
        <ChartCardFrame
          title="Settlement speed (T+N)"
          subtitle="% of volume by working-day lag"
          minHeight="min-h-[240px]"
        >
          <div className="h-[188px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={settlementSpeedBuckets}
                barCategoryGap="18%"
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
                  tickFormatter={(v) => `${v}%`}
                  width={36}
                />
                <Tooltip
                  content={(props) => <StandardChartTooltip {...props} formatValue={(v) => `${v}%`} />}
                  cursor={{ fill: "var(--chart-cursor)", radius: 4 }}
                />
                <Bar
                  dataKey="pct"
                  name="Share"
                  fill={BRAND}
                  radius={[5, 5, 0, 0]}
                  background={{ fill: chartBarTrackFill }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCardFrame>
      );
    case "charts_decline_reasons": {
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "px-5 pt-4 pb-3 min-h-[260px]")}>
            <ChartSkeleton />
          </div>
        );
      }
      const maxCount = Math.max(...paymentFailureReasons.map((d) => d.count), 1);
      return (
        <ChartCardFrame title="Decline reasons" subtitle="Top failure codes — last 30 days" minHeight="min-h-[260px]">
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={paymentFailureReasons}
                margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" domain={[0, maxCount]} hide />
                <YAxis
                  type="category"
                  dataKey="reason"
                  width={124}
                  tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={(props) => <StandardChartTooltip {...props} />}
                  cursor={{ fill: "var(--chart-cursor)", radius: 4 }}
                />
                <Bar
                  dataKey="count"
                  name="Count"
                  fill={BRAND}
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                  background={{ fill: chartBarTrackFill }}
                  isAnimationActive={!preview}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCardFrame>
      );
    }
    case "settlements_due_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Settlements due"
          valueLabel={preview ? "₹1.2L" : fmtInr(dashboardStats.settlementsDue.value)}
          change={preview ? -3.2 : dashboardStats.settlementsDue.change}
          spark={[80, 75, 82, 70, 74, 68, 72, 65, 70, 63, 68, 58]}
        />
      );
    case "settlements_today_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Settled today"
          valueLabel={preview ? "₹4.1L" : fmtInr(dashboardWidgetKpis.settledToday.value)}
          subtitle="Cleared to bank"
          spark={[20, 28, 35, 40, 48, 52, 55, 50, 58, 62, 60, 65]}
        />
      );
    case "settlements_next_date":
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "p-5 min-h-[120px]")}>
            <div className="h-20 bg-muted rounded-lg animate-pulse" />
          </div>
        );
      }
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn(cardClass, "p-5 flex flex-col gap-2 h-full")}
        >
          <span className="text-[13px] font-normal text-muted-foreground">Next settlement</span>
          <p className="text-xs text-muted-foreground -mt-1">Auto-settlement schedule</p>
          <p className="text-[1.35rem] sm:text-[1.65rem] font-bold text-foreground leading-tight tracking-tight mt-2">
            {preview ? "Mar 21 · 11:00 AM" : dashboardWidgetKpis.nextSettlementLabel}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Auto-settlement at mid-market FX. Funds typically arrive same business day.
          </p>
        </motion.div>
      );
    case "customers_active_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Active customers"
          valueLabel={
            preview ? "1,284" : dashboardWidgetKpis.activeCustomers.value.toLocaleString("en-IN")
          }
          change={preview ? 6.2 : dashboardWidgetKpis.activeCustomers.change}
          spark={[900, 950, 980, 1010, 1040, 1080, 1120, 1150, 1180, 1220, 1260, 1284]}
        />
      );
    case "customers_new_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="New customers"
          valueLabel={preview ? "42" : String(dashboardWidgetKpis.newCustomers.value)}
          change={preview ? 12 : dashboardWidgetKpis.newCustomers.change}
          spark={[12, 15, 18, 20, 22, 25, 28, 30, 34, 36, 40, 42]}
        />
      );
    case "customers_repeat_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Repeat rate"
          valueLabel={preview ? "38.5%" : `${dashboardWidgetKpis.repeatRate.value}%`}
          change={preview ? 0.4 : dashboardWidgetKpis.repeatRate.change}
          changeUnit="pts"
          changeLabel="vs prior"
          spark={[32, 33, 34, 35, 35, 36, 36, 37, 37, 38, 38, 39]}
        />
      );
    case "customers_country_insights":
      return (
        <CountryInsightsMap
          data={countryInsights}
          isLoading={isLoading && !preview}
          className="h-full min-h-[280px]"
          staticPeriodControl={preview}
        />
      );
    case "customers_state_insights":
      return (
        <StateInsightsList
          data={indiaStateInsights}
          isLoading={isLoading && !preview}
          className="h-full min-h-[280px]"
          staticPeriodControl={preview}
        />
      );
    case "customers_top_table": {
      if (isLoading && !preview) {
        return (
          <div className={cn(cardClass, "p-5 min-h-[200px]")}>
            <div className="h-4 w-40 bg-muted rounded mb-4 animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        );
      }
      const rows = preview
        ? topCustomersBySpend.map((r, i) => ({ ...r, total: r.total * 0.2 + i * 1000 }))
        : topCustomersBySpend;
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn("rounded-xl p-5 overflow-x-auto", cardClass)}
        >
          <span className="text-[13px] font-normal text-muted-foreground">Top customers by spend</span>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">Last 90 days</p>
          <DataTable
            columns={topCustomerColumns}
            data={rows}
            rowKey={(r) => r.email}
            headerStyle="minimal"
            density="compact"
          />
        </motion.div>
      );
    }
    case "risk_open_disputes_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Open disputes"
          valueLabel={preview ? "₹14.2K" : fmtInr(dashboardStats.openDisputes.value)}
          subtitle="At risk"
          spark={[10, 14, 12, 18, 15, 20, 16, 22, 18, 16, 14, 12]}
        />
      );
    case "risk_dispute_rate_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Dispute rate"
          valueLabel={preview ? "0.82%" : `${dashboardWidgetKpis.disputeRate.value}%`}
          change={preview ? -0.15 : dashboardWidgetKpis.disputeRate.change}
          changeUnit="pts"
          changeLabel="vs prior"
          spark={[1.2, 1.1, 1.05, 1, 0.95, 0.9, 0.88, 0.86, 0.85, 0.84, 0.83, 0.82]}
        />
      );
    case "risk_blocked_kpi":
      return (
        <KpiBlock
          preview={preview}
          isLoading={isLoading}
          title="Blocked transactions"
          valueLabel={preview ? "7" : String(dashboardWidgetKpis.blockedTx.value)}
          subtitle="Risk holds"
          spark={[12, 11, 10, 9, 9, 8, 8, 7, 7, 7, 7, 7]}
        />
      );
    default: {
      const _exhaustive: never = widgetId;
      return _exhaustive;
    }
  }
}
