"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
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
import { useCurrencySplit } from "@/features/dashboard/mca-transactions/hooks";

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

/** Y-axis tick label. Delegates to the shared short form so the axis reads in
 *  the same ₹K/₹L/₹Cr units as every headline and bar figure. */
function formatMoneyAxis(value: number): string {
  return value === 0 ? "₹0" : formatCurrencyShort(value, "INR");
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
 * not four — every option renders through the same trend-chart layout below
 * (or, for "Common currency", the same ranked-share layout McaCurrencySplitCard
 * uses), so switching options never changes the card's height.
 *
 * "Net volume" and "Number of payments" have no live trend endpoint for the
 * MCA scope yet, so they read from the mock series in mock-data.ts — the same
 * placeholder-dataset pattern `revenueByTimeframe` already established there —
 * rather than going empty. "Total amount collected" and "Common currency" are
 * both real, live data.
 */
type PerformanceMetric = "collected" | "net-volume" | "payments" | "common-currency";

const METRIC_OPTIONS: { value: PerformanceMetric; label: string }[] = [
  { value: "collected", label: "Total amount collected" },
  { value: "net-volume", label: "Net volume" },
  { value: "payments", label: "Number of payments" },
  { value: "common-currency", label: "Common currency" },
];

/** The hue order currency/country bars take, most-significant first — same
 *  cycle McaInvoiceOriginsCard's own distribution bar uses. */
const SHARE_BAR_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function ShareBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload: { currency: string; amountPct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{row.currency}</p>
      <p className="font-semibold tabular-nums text-foreground">{row.amountPct}%</p>
    </div>
  );
}

/**
 * Ranked currency shares — the closest thing to a chart "Common currency"
 * has, since a single currency code has nothing to plot as a line over time.
 *
 * Three or fewer currencies read fine as actual bars, each one long enough
 * to compare at a glance. Past that a bar chart's rows get too thin to carry
 * a label, so it drops to the same plain ranked list McaInvoiceOriginsCard
 * switches to for more than a handful of countries — no bar at all there,
 * just the figures, since with this many rows the shape stops being the
 * point and the ranking is.
 */
function CommonCurrencyBreakdown({
  slices,
}: {
  slices: { currency: string; amountPct: number }[];
}) {
  if (slices.length <= 3) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={slices}
          margin={{ top: 20, right: 8, left: 8, bottom: 0 }}
          barCategoryGap="28%"
        >
          <XAxis
            type="category"
            dataKey="currency"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
          />
          <YAxis type="number" domain={[0, 100]} hide />
          <RechartsTooltip
            content={<ShareBarTooltip />}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Bar dataKey="amountPct" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive={false}>
            {slices.map((slice, i) => (
              <Cell key={slice.currency} fill={SHARE_BAR_COLORS[i % SHARE_BAR_COLORS.length]} />
            ))}
            <LabelList
              dataKey="amountPct"
              position="top"
              formatter={(v: unknown) => `${typeof v === "number" ? v : 0}%`}
              style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {slices.slice(0, 6).map((slice) => (
        <div key={slice.currency} className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-foreground">{slice.currency}</span>
          <span className="font-semibold tabular-nums text-foreground">{slice.amountPct}%</span>
        </div>
      ))}
    </div>
  );
}

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

  // Common currency reuses the exact same per-currency split McaCurrencySplitCard
  // reads — same hook, same endpoint, driven by this card's own timeframe rather
  // than that card's fixed 30-day window.
  const {
    split,
    isLoading: splitLoading,
    isError: splitError,
  } = useCurrencySplit(startDate, endDate);

  const metricLabel =
    METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? METRIC_OPTIONS[0]!.label;

  // The 1W/1M/3M pills change every metric's series here — real for
  // "collected"/"common currency", mock but still per-timeframe for the other
  // two — so unlike an earlier version of this card, nothing needs it dimmed.
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

  // ── "Common currency" ───────────────────────────────────────────────────
  const currencySlices = useMemo(
    () =>
      (split?.slices ?? [])
        .filter((s) => s.currency !== "OTHER")
        .map((s) => ({ currency: s.currency, amountPct: s.amountPct }))
        .sort((a, b) => b.amountPct - a.amountPct),
    [split]
  );
  const topCurrency = currencySlices[0];
  const hasCurrencyData = !splitLoading && !splitError && currencySlices.length > 0;

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
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
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
            {/* Small, muted, subordinate to the main figure — deliberately not
                styled as a second KPI. */}
            {!activeLoading && activeSeries && (
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-medium text-muted-foreground">Previous</p>
                {isMoneyMetric ? (
                  <CompactAmount
                    amount={activeSeries.previousTotal}
                    currency={activeSeries.currency}
                    className="mt-0.5 block text-sm font-semibold text-muted-foreground tabular-nums"
                  />
                ) : (
                  <p className="mt-0.5 text-sm font-semibold text-muted-foreground tabular-nums">
                    {formatCountAxis(activeSeries.previousTotal)}
                  </p>
                )}
              </div>
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
                {activeSeries.trendPct}% {activeSeries.comparisonLabel}
              </span>
            </div>
          ) : activeLoading ? (
            <Shimmer className="mt-1 h-4 w-40" />
          ) : null}

          <div className="mt-2.5 min-h-32 w-full flex-1">
            {activeLoading ? (
              <Shimmer className="h-full min-h-32 w-full" />
            ) : activeError ? (
              <PlaceholderState
                variant="error"
                size="sm"
                title="Couldn't load"
                description="Revenue didn't load."
                className="h-full min-h-32"
              />
            ) : !hasChartData ? (
              <PlaceholderState
                variant="no-analytics"
                size="sm"
                title="No data in this period"
                description="This metric is charted here as activity comes in."
                className="h-full min-h-32"
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
                  <CartesianGrid
                    strokeDasharray="4 6"
                    stroke="var(--chart-grid)"
                    vertical={false}
                  />
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
        </>
      )}

      {metric === "common-currency" && (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            {splitLoading ? (
              <Shimmer className="h-8 w-24" />
            ) : (
              <span className="block text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {topCurrency?.currency ?? "—"}
              </span>
            )}
          </div>
          {!splitLoading && topCurrency && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {topCurrency.amountPct}% of volume in this period
            </p>
          )}

          <div className="mt-2.5 min-h-32 w-full flex-1">
            {splitLoading ? (
              <Shimmer className="h-full min-h-32 w-full" />
            ) : splitError ? (
              <PlaceholderState
                variant="error"
                size="sm"
                title="Couldn't load"
                description="Currency split didn't load."
                className="h-full min-h-32"
              />
            ) : !hasCurrencyData ? (
              <PlaceholderState
                variant="no-analytics"
                size="sm"
                title="No transactions in this period"
                description="Once payments arrive, the currency you collect most in will show up here."
                className="h-full min-h-32"
              />
            ) : (
              <CommonCurrencyBreakdown slices={currencySlices} />
            )}
          </div>
        </>
      )}
    </Card>
  );
}
