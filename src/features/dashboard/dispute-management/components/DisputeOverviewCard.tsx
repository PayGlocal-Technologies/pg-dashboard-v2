"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PillToggle } from "@/components/common/PillToggle";
import { formatCurrency } from "@/lib/utils";
import {
  DISPUTE_OVERVIEW_BUCKETS,
  getDisputeAmounts,
  getDisputeCounts,
  getTotalDisputeAmount,
  getTotalDisputeCount,
} from "@/features/dashboard/dispute-management/aggregations";
import type { DisputeRow } from "@/features/dashboard/dispute-management/types";

type OverviewMetric = "count" | "amount";

// Amount first (and the default below): the money at stake is the figure
// that actually drives what a merchant does next, count is the secondary
// "how many" breakdown you switch to afterward, not the other way round.
const METRIC_OPTIONS = [
  { value: "amount", label: "Amount" },
  { value: "count", label: "Count" },
] as const satisfies { value: OverviewMetric; label: string }[];

interface OverviewRow {
  key: string;
  label: string;
  color: string;
  value: number;
  /** Share of the total, 0-1; sizes the bar segment. */
  share: number;
}

interface DisputeOverviewCardProps {
  disputes: DisputeRow[];
}

/**
 * How the disputed total breaks down by status, by amount or by count.
 *
 * One proportional bar (the parts of the total, side by side) over a compact
 * 2 x 2 legend: each cell is dot + status, with the value under it. Every
 * status keeps its cell even at zero, so switching Amount / Count never
 * changes the card's height. Values are visible text, never hover-only, and
 * each cell names its status, so nothing relies on colour alone.
 */
export function DisputeOverviewCard({ disputes }: DisputeOverviewCardProps) {
  const [metric, setMetric] = useState<OverviewMetric>("amount");

  const counts = getDisputeCounts(disputes);
  const amounts = getDisputeAmounts(disputes);
  const totalCount = getTotalDisputeCount(disputes);
  const totalAmount = getTotalDisputeAmount(disputes);
  const total = metric === "count" ? totalCount : totalAmount;

  const rows: OverviewRow[] = DISPUTE_OVERVIEW_BUCKETS.map((bucket) => {
    const value = metric === "count" ? counts[bucket.key] : amounts[bucket.key];
    return {
      key: bucket.key,
      label: bucket.label,
      color: bucket.color,
      value,
      share: total > 0 ? value / total : 0,
    };
  });

  const formatValue = (value: number) =>
    metric === "count"
      ? `${value} ${value === 1 ? "dispute" : "disputes"}`
      : formatCurrency(value, amounts.currency);

  const isEmpty = disputes.length === 0;

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Dispute overview</h2>
        <PillToggle
          options={METRIC_OPTIONS}
          value={metric}
          onChange={setMetric}
          ariaLabel="Dispute overview metric"
        />
      </div>

      {/* Centred in whatever height the row's tallest sibling gives this
          card, so there's never a blank band under the legend. Empty keeps
          this same layout at zero, the bar drawn as a dashed track (the MCA
          dashboard's empty-chart idea), so the card never changes height. */}
      <div className="flex flex-1 flex-col justify-center gap-3.5">
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {metric === "count" ? totalCount : formatCurrency(totalAmount, amounts.currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            {isEmpty
              ? "No disputes in this period"
              : metric === "count"
                ? "Total disputes"
                : "Total disputed"}
          </p>
        </div>

        {/* The whole = 100% of the bar; each status takes its share. A 2px
              gap separates segments, and a zero-value status draws nothing.
              Decorative: the legend below carries the same figures as text. */}
        {isEmpty ? (
          <div
            className="h-2.5 w-full rounded-full border border-dashed border-muted-foreground/40"
            aria-hidden="true"
          />
        ) : (
          <div
            className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
            aria-hidden="true"
          >
            {rows
              .filter((row) => row.value > 0)
              .map((row) => (
                <span
                  key={row.key}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ flexGrow: row.share, flexBasis: 0, backgroundColor: row.color }}
                />
              ))}
          </div>
        )}

        <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
          {rows.map((row) => (
            <li key={row.key} className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{row.label}</span>
              </span>
              <p className="mt-0.5 truncate pl-3.5 text-[15px] font-semibold tabular-nums text-foreground">
                {formatValue(row.value)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
