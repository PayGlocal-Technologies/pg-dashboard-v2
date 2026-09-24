"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { DotGridLine } from "@/components/common/charts/DotGridLine";
import { RollingNumber } from "@/components/common/RollingNumber";
import { CompactAmount } from "@/components/common/CompactAmount";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { formatCurrencyShort } from "@/lib/utils/format";
import {
  totalSettledTimeframes,
  type TotalSettledTimeframe,
} from "@/features/dashboard/mca-settlement-report/constants";
import type { SparklinePoint } from "@/features/dashboard/mca-settlement-report/types";

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
  /**
   * Omit to hide the card's own timeframe switcher entirely, for a caller
   * that drives `timeframe` from a control of its own — the Transactions
   * page does, from the range control in its header. Handler and control are
   * deliberately the same prop rather than a separate `showToggle` flag, so
   * the two cannot contradict each other: there is no way to render a
   * switcher that changes nothing, or to pass a handler nothing can call.
   */
  onTimeframeChange?: (timeframe: TotalSettledTimeframe) => void;
  /** The chart series for the selected timeframe. */
  chartData: SparklinePoint[];
  className?: string;
  /**
   * Overrides the plot area's height. Defaults to the `h-76` this card uses
   * on the settlement report, where it is the page's headline card and has
   * the room for it; the Transactions page stacks it under Total amount
   * collected and needs it shorter to match that card. Merged through `cn`,
   * so passing a height class simply wins over the default.
   */
  chartClassName?: string;
}

export function TotalSettledCard({
  totalSettled,
  totalSettledTrendPct,
  comparisonLabel,
  timeframe,
  onTimeframeChange,
  chartData,
  className,
  chartClassName,
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
          {/* Light/regular, not bold — matches SavedAmountCard's own label
              style in mca-transactions, which every KPI card's header on
              that page (Total amount collected, Documents pending) was
              brought in line with too: a quiet caption introducing the
              figure below it, not competing with it. */}
          <p className="text-sm font-normal text-muted-foreground">Total settled</p>
          <CompactAmount
            amount={totalSettled}
            currency="INR"
            className="mt-2 block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
          {/* No trend beside a zero total — "+0%/-100% vs last week" against
              nothing settled reads as broken, so it's hidden until there's a
              real figure to compare.
              The row itself always stays in the layout, though, held open by
              `min-h-4` (one text-xs line). Dropping the whole element in the
              empty state made this card shorter than its filled self, and the
              grid is `items-stretch`, so the two cards in the column beside it
              resized along with it every time a timeframe came back empty. */}
          <div
            className={cn(
              "mt-2 flex min-h-4 items-center gap-1 text-xs font-medium",
              trendPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {hasData && (
              <>
                <Icon
                  name={trendPositive ? "trending-up" : "trending-down"}
                  size={13}
                  aria-hidden
                />
                <RollingNumber
                  value={`${trendPositive ? "+" : ""}${totalSettledTrendPct}% ${comparisonLabel ?? "vs last"}`}
                  className="tabular-nums"
                />
              </>
            )}
          </div>
        </div>

        {onTimeframeChange && (
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
        )}
      </div>

      <div className={cn("h-76 w-full", chartClassName)}>
        {!hasData ? (
          // size="xs": the default md illustration's own natural footprint
          // (~132px icon + its padding) ran well past this card's neighbor
          // in the Transactions page's row (SavedAmountCard, floored at
          // min-h-64/256px) — since that row is `items-stretch`, the
          // larger of the two set the row height, stretching SavedAmountCard
          // down to match and leaving visible dead space inside it. A
          // smaller illustration keeps the empty state's own natural height
          // close to what a loaded sparkline needs, so there's little left
          // for the stretch to inflate either card with. Same fix already
          // applied to SettlementAnalyticsCard's own empty state.
          <PlaceholderState
            variant="no-settlements"
            size="xs"
            title="No settlements in this period"
            description="As payouts are made, this charts how much settled to your account over time."
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
              <CartesianGrid horizontal={DotGridLine} vertical={false} />
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
