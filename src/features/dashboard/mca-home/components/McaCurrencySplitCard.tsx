"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button, Card, Shimmer } from "@/components/ui";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useCurrencySplit } from "@/features/dashboard/mca-transactions/hooks";

type CurrencySplitMetric = "volume" | "count";

const METRICS: { value: CurrencySplitMetric; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "count", label: "Count" },
];

/**
 * The hue order the currency slices take, most-significant first.
 *
 * Hue-separated on purpose. This used to run chart-1 → chart-3 → chart-2, and
 * chart-1 (#0061e3) and chart-2 (#2563eb) are the same blue two steps apart — so
 * a merchant with three currencies saw the largest slice and the catch-all
 * painted what read as one colour. chart-2 is dropped from the categorical order
 * entirely for that reason: it is a shade of chart-1, not a sibling of it.
 *
 * Blue → amber → violet → green clears the adjacent-pair colour-vision check on
 * both the normal and the deficient-vision floors, so no two slices that sit
 * next to each other in the ring collapse into each other.
 */
const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-3)",
  "var(--chart-4)",
];

/**
 * The API's catch-all bucket. It is not a currency, so it does not take a
 * currency's hue — it is painted neutral, and it is skipped when the hues above
 * are handed out. Otherwise it would consume a slot and shift every currency
 * listed after it onto the wrong colour.
 */
const OTHER_SLICE = "OTHER";
const OTHER_COLOR = "var(--muted-foreground)";

/** Last 30 days, computed once on mount (no `new Date()` in render — see the
 *  React Compiler rule in CLAUDE.md). This card has no timeframe control, so it
 *  fixes a sensible default window. */
function buildLast30Range(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

function CurrencySplitTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { value: number; payload: { label: string; color: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: item.payload.color }} />
        <span className="font-medium text-foreground">{item.payload.label}</span>
      </div>
      <p className="mt-0.5 font-semibold tabular-nums text-foreground">{item.value}%</p>
    </div>
  );
}

export function McaCurrencySplitCard() {
  const [metric, setMetric] = useState<CurrencySplitMetric>("volume");
  const [range] = useState(buildLast30Range);
  const { split, isLoading, isError } = useCurrencySplit(range.startDate, range.endDate);

  // Volume → amountPct, Count → countPct, straight from the API's slices.
  // The hue cursor advances only on real currencies, so "Other" keeps its
  // neutral without spending one. Past the end of the order a further currency
  // takes the neutral too, rather than cycling back onto a colour already in the
  // ring — a repeated hue is worse than an unnamed one.
  let hue = 0;
  const slices = (split?.slices ?? []).map((s) => {
    const color = s.currency === OTHER_SLICE ? OTHER_COLOR : (SLICE_COLORS[hue++] ?? OTHER_COLOR);
    return {
      key: s.currency,
      label: s.currency,
      color,
      volumePct: s.amountPct,
      countPct: s.countPct,
    };
  });
  const dataKey = metric === "volume" ? "volumePct" : "countPct";
  const hasData = !isLoading && !isError && slices.length > 0;

  return (
    <Card className="h-full gap-4 p-5">
      <div className="flex flex-nowrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            Currency split{" "}
            <span className="text-xs font-normal text-muted-foreground">· Last 30 days</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {metric === "volume"
              ? "Share of total volume by currency"
              : "Share of total transaction count by currency"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {METRICS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMetric(opt.value)}
              className={cn(
                "h-auto min-h-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                metric === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 flex-wrap items-center gap-6">
          <Shimmer className="h-36 w-36 shrink-0 rounded-full" />
          <div className="min-w-35 flex-1 space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <PlaceholderState
          variant="error"
          size="sm"
          title="Couldn't load"
          description="Currency split didn't load."
          className="flex-1 py-4"
        />
      ) : !hasData ? (
        <PlaceholderState
          variant="no-analytics"
          size="sm"
          title="No transactions"
          description="No transactions in this period."
          className="flex-1 py-4"
        />
      ) : (
        <div className="flex flex-1 flex-wrap items-center gap-6">
          <div className="h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CurrencySplitTooltip />} cursor={false} />
                <Pie
                  data={slices}
                  dataKey={dataKey}
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={64}
                  paddingAngle={2}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="min-w-35 flex-1 space-y-2.5 text-xs">
            {slices.map((slice) => (
              <li key={slice.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: slice.color }}
                  />
                  {slice.label}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {metric === "volume" ? slice.volumePct : slice.countPct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
