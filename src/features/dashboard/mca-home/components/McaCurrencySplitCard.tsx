"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  currencySplit,
  currencySplitMetrics,
  type CurrencySplitMetric,
} from "@/features/dashboard/mca-home/mock-data";

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
  const dataKey = metric === "volume" ? "volumePct" : "countPct";

  return (
    <Card className="h-full gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Currency split</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {metric === "volume"
              ? "Share of total volume by currency"
              : "Share of total transaction count by currency"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {currencySplitMetrics.map((opt) => (
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

      <div className="flex flex-1 flex-wrap items-center gap-6">
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CurrencySplitTooltip />} cursor={false} />
              <Pie
                data={currencySplit}
                dataKey={dataKey}
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={64}
                paddingAngle={2}
              >
                {currencySplit.map((slice) => (
                  <Cell key={slice.key} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="min-w-35 flex-1 space-y-2.5 text-xs">
          {currencySplit.map((slice) => (
            <li key={slice.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: slice.color }} />
                {slice.label}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {metric === "volume" ? slice.volumePct : slice.countPct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
