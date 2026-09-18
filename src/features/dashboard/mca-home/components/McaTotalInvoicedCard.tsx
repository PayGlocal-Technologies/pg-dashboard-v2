"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CompactAmount } from "@/components/common/CompactAmount";
import { useInvoiceOrigins } from "@/features/dashboard/mca-transactions/hooks";

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
 * invoice-origins totals (no time-series endpoint — invoice-origins returns one
 * figure for the whole range, so there's no real sparkline to draw).
 */
export function McaTotalInvoicedCard() {
  const [range] = useState(buildLast30Range);
  const { origins } = useInvoiceOrigins(range.startDate, range.endDate);
  const totals = origins?.totals;
  const currency = origins?.reportingCurrency ?? "INR";

  const trendPct = totals?.totalInvoicedTrendPct;
  // No trend beside a zero (or absent) figure — a percentage change against
  // nothing invoiced reads as broken.
  const hasTrend = trendPct !== undefined && (totals?.totalInvoiced ?? 0) > 0;
  const positive = hasTrend && trendPct >= 0;

  return (
    <Card className="h-full gap-2 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Total invoiced{" "}
        <span className="text-xs font-normal text-muted-foreground">· Last 30 days</span>
      </h2>

      <div>
        {totals ? (
          <CompactAmount
            amount={totals.totalInvoiced}
            currency={currency}
            className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
        ) : (
          <span className="block text-2xl font-bold tracking-tight text-foreground tabular-nums">
            —
          </span>
        )}
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
    </Card>
  );
}
