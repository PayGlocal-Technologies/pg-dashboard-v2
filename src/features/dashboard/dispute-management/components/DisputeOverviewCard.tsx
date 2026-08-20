"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";

interface DisputeOverviewSlice {
  key: string;
  label: string;
  count: number;
  color: string;
}

// Matches the warning/info/success/danger StatusBadge variants already used
// for these same statuses elsewhere (see PA_STATUS_META), no theme-aware
// token for these exists yet (see globals.css's --chart-1..5), so plain hex
// is used here, same as McaCurrencySplitCard's donut.
const SLICE_ORDER: { key: DisputeOverviewSlice["key"]; label: string; color: string }[] = [
  { key: "needsAction", label: "Needs action", color: "#f59e0b" },
  { key: "inReview", label: "In review", color: "#3b82f6" },
  { key: "won", label: "Won", color: "#10b981" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];

interface DisputeOverviewCardProps {
  needsActionCount: number;
  inReviewCount: number;
  wonCount: number;
  lostCount: number;
}

export function DisputeOverviewCard({
  needsActionCount,
  inReviewCount,
  wonCount,
  lostCount,
}: DisputeOverviewCardProps) {
  const countByKey: Record<string, number> = {
    needsAction: needsActionCount,
    inReview: inReviewCount,
    won: wonCount,
    lost: lostCount,
  };
  const slices: DisputeOverviewSlice[] = SLICE_ORDER.map((s) => ({
    ...s,
    count: countByKey[s.key] ?? 0,
  }));
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card className="h-full gap-3 p-5">
      <h2 className="text-sm font-semibold text-foreground">Dispute overview</h2>

      <div className="flex flex-1 items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
              >
                {slices.map((slice) => (
                  <Cell key={slice.key} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums text-foreground">{total}</span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
        </div>

        {/* Tighter row spacing than the default (space-y-2) so the legend
         * takes less vertical room, leaving more of the card for the donut.
         * No `justify-between`, the count sits right after the label instead
         * of being pushed to the far edge of this (wide) column. */}
        <ul className="min-w-0 flex-1 space-y-1 text-xs">
          {slices.map((slice) => (
            <li key={slice.key} className="flex items-center gap-2">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                />
                {slice.label}
              </span>
              <span className="font-semibold tabular-nums text-foreground">{slice.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
