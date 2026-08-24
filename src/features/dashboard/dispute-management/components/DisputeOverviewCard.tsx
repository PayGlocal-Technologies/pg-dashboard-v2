"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EmptyState } from "@/components/ui";
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

const METRIC_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "amount", label: "Amount" },
] as const satisfies { value: OverviewMetric; label: string }[];

interface OverviewRow {
  key: string;
  label: string;
  color: string;
  value: number;
}

function OverviewTooltip({
  active,
  payload,
  metric,
  currency,
}: {
  active?: boolean;
  payload?: readonly { payload: OverviewRow }[];
  metric: OverviewMetric;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{row.label}</p>
      <p className="font-semibold tabular-nums text-foreground">
        {metric === "count"
          ? `${row.value} dispute${row.value === 1 ? "" : "s"}`
          : `${formatCurrency(row.value, currency)} disputed`}
      </p>
    </div>
  );
}

interface DisputeOverviewCardProps {
  disputes: DisputeRow[];
}

/** Count answers "how many disputes do I have", Amount answers "how much
 * money is at stake", both read off the same underlying rows, switched via
 * a compact toggle rather than two separate cards. Horizontal bars (not the
 * previous donut) so status categories are easy to compare on either metric,
 * see getDisputeCounts/getDisputeAmounts for the centralized aggregation. */
export function DisputeOverviewCard({ disputes }: DisputeOverviewCardProps) {
  const [metric, setMetric] = useState<OverviewMetric>("count");

  const counts = getDisputeCounts(disputes);
  const amounts = getDisputeAmounts(disputes);
  const totalCount = getTotalDisputeCount(disputes);
  const totalAmount = getTotalDisputeAmount(disputes);

  const rows: OverviewRow[] = DISPUTE_OVERVIEW_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    color: bucket.color,
    value: metric === "count" ? counts[bucket.key] : amounts[bucket.key],
  }));

  const isEmpty = disputes.length === 0;

  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Dispute overview</h2>
        <PillToggle
          options={METRIC_OPTIONS}
          value={metric}
          onChange={setMetric}
          ariaLabel="Dispute overview metric"
        />
      </div>

      {isEmpty ? (
        <EmptyState
          title="No disputes to display"
          description="Disputed payments will appear here as they come in."
          className="flex-1 justify-center py-0"
        />
      ) : (
        <>
          <div>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {metric === "count" ? totalCount : formatCurrency(totalAmount, amounts.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {metric === "count" ? "Total disputes" : "Total disputed"}
            </p>
          </div>

          {/* Chart values are always rendered as visible text (see LabelList
           * below), never exposed only on hover, and every bar keeps its own
           * label text, so nothing here depends on colour alone. This SVG is
           * a decorative rendering of that same data, screen readers get the
           * sr-only list instead. */}
          <div className="min-h-0 flex-1" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
                barCategoryGap="28%"
              >
                <XAxis type="number" domain={[0, "dataMax"]} hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={84}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
                />
                <Tooltip
                  content={<OverviewTooltip metric={metric} currency={amounts.currency} />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
                  {rows.map((row) => (
                    <Cell key={row.key} fill={row.color} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: unknown) => {
                      const n = typeof v === "number" ? v : 0;
                      return metric === "count" ? String(n) : formatCurrency(n, amounts.currency);
                    }}
                    style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="sr-only">
            {rows.map((row) => (
              <li key={row.key}>
                {row.label}:{" "}
                {metric === "count"
                  ? `${row.value} dispute${row.value === 1 ? "" : "s"}`
                  : formatCurrency(row.value, amounts.currency)}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
