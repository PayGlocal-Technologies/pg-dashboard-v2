"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import { mcaStatWidgetData } from "@/features/dashboard/mca-home/mock-data";
import { useInvoiceOrigins } from "@/features/dashboard/mca-transactions/hooks";

function formatCompact(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** Last 30 days, once on mount (no `new Date()` in render). */
function buildLast30Range(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

/**
 * "Total invoiced" stat card. Header matches McaCurrencySplitCard (bold title +
 * a muted "· Last 30 days" suffix), since neither card has the timeframe control
 * the Transactions card above them does. Value + trend come from the live
 * invoice-origins totals; the sparkline stays mock (no time-series endpoint —
 * invoice-origins returns one figure for the whole range).
 */
export function McaTotalInvoicedCard() {
  const [range] = useState(buildLast30Range);
  const { origins } = useInvoiceOrigins(range.startDate, range.endDate);
  const totals = origins?.totals;

  const base = mcaStatWidgetData["total-invoiced"];
  const valueLabel = totals
    ? formatCompact(totals.totalInvoiced, origins?.reportingCurrency ?? "INR")
    : "—";
  const trendPct = totals?.totalInvoicedTrendPct;
  const hasTrend = trendPct !== undefined;
  const positive = hasTrend && trendPct >= 0;
  const sparkData = base.spark.map((v, i) => ({ i, v }));
  const gradId = "mca-total-invoiced-fill";

  return (
    <Card className="h-full gap-2 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Total invoiced <span className="font-normal text-muted-foreground">· Last 30 days</span>
      </h2>

      <div>
        <RollingNumber
          value={valueLabel}
          className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
        />
        {hasTrend && (
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-xs font-medium",
              positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
          >
            <Icon name={positive ? "trending-up" : "trending-down"} size={12} aria-hidden />
            <span>
              {positive ? "+" : ""}
              {trendPct}% vs last month
            </span>
          </div>
        )}
      </div>

      <div className="mt-auto h-12 w-full pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={base.accentColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={base.accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={base.accentColor}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
