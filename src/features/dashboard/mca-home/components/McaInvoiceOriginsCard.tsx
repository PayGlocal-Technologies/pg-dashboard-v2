"use client";

import { useState } from "react";
import { COUNTRIES } from "@payglocal_ui/flux-ui";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import {
  INVOICE_ORIGIN_TIMEFRAME_SCALE,
  invoiceOriginTimeframes,
  invoiceOriginTotals,
  invoiceOrigins,
  type InvoiceOriginTimeframe,
} from "@/features/dashboard/mca-home/mock-data";
import { McaGlobeIllustration } from "@/features/dashboard/mca-home/components/McaGlobeIllustration";

function countryFlag(countryCode: string): string {
  return COUNTRIES.find((c) => c.code === countryCode)?.flag ?? "🌍";
}

function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

function formatCompactUsd(amount: number): string {
  return `$${Math.round(amount / 1000)}K`;
}

const BAR_COLORS = ["var(--chart-1)", "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-3)", "var(--chart-4)"];

interface StatCellProps {
  label: string;
  valueLabel: string;
  trendPct: number;
}

function StatCell({ label, valueLabel, trendPct }: StatCellProps) {
  const positive = trendPct >= 0;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <RollingNumber
          value={valueLabel}
          className="block text-xl font-bold tracking-tight text-foreground tabular-nums"
        />
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          <Icon name={positive ? "trending-up" : "trending-down"} size={11} aria-hidden />
          {positive ? "+" : ""}
          {trendPct}%
        </span>
      </div>
    </div>
  );
}

export function McaInvoiceOriginsCard() {
  const [timeframe, setTimeframe] = useState<InvoiceOriginTimeframe>("1M");
  const scale = INVOICE_ORIGIN_TIMEFRAME_SCALE[timeframe];
  const scaledOrigins = invoiceOrigins.map((o) => ({
    ...o,
    amount: o.amount * scale,
    invoiceCount: Math.max(1, Math.round(o.invoiceCount * scale)),
  }));
  const maxAmount = Math.max(...scaledOrigins.map((o) => o.amount));
  const scaledTotalInvoiced = invoiceOriginTotals.totalInvoiced * scale;
  const globeHighlights = scaledOrigins.map((origin, i) => ({
    countryCode: origin.countryCode,
    color: BAR_COLORS[i % BAR_COLORS.length]!,
    countryName: origin.countryName,
    flag: countryFlag(origin.countryCode),
    amountLabel: formatUsd(origin.amount),
    invoiceCountLabel: `${origin.invoiceCount} invoice${origin.invoiceCount === 1 ? "" : "s"}`,
    sharePct: Math.round((origin.amount / scaledTotalInvoiced) * 100),
    rank: i + 1,
  }));

  return (
    <Card className="@container gap-0 overflow-hidden p-0">
      {/* Container-query breakpoints (@3xl/@2xl), not viewport md:/sm:, this
       * card is also rendered at a fraction of its normal width inside the
       * "Add widgets" picker tile, viewport breakpoints would still fire
       * there (they read the browser viewport, not this card's own width)
       * and squeeze the two-column layout into a sliver, garbling everything. */}
      <div className="grid gap-6 p-5 @3xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Transactions</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Total transaction volume by country</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {invoiceOriginTimeframes.map((opt) => (
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

          <div className="mt-5 flex flex-col gap-3">
            {scaledOrigins.map((origin, i) => (
              <div key={origin.countryCode} className="flex items-center gap-3">
                <div className="flex w-36 shrink-0 items-center gap-1.5">
                  <span className="text-sm leading-none" aria-hidden>
                    {countryFlag(origin.countryCode)}
                  </span>
                  <span className="truncate text-[13px] font-medium text-foreground">{origin.countryName}</span>
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(origin.amount / maxAmount) * 100}%`,
                      backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">
                  {formatUsd(origin.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 @2xl:grid-cols-4">
            <StatCell
              label="Total invoiced"
              valueLabel={formatCompactUsd(invoiceOriginTotals.totalInvoiced * scale)}
              trendPct={invoiceOriginTotals.totalInvoicedTrendPct}
            />
            <StatCell
              label="Avg per country"
              valueLabel={formatCompactUsd(invoiceOriginTotals.avgPerCountry * scale)}
              trendPct={invoiceOriginTotals.avgPerCountryTrendPct}
            />
            <StatCell
              label="United States share"
              valueLabel={`${invoiceOriginTotals.unitedStatesSharePct}%`}
              trendPct={invoiceOriginTotals.unitedStatesShareTrendPct}
            />
            <div>
              <p className="text-xs text-muted-foreground">Active markets</p>
              <RollingNumber
                value={String(invoiceOriginTotals.activeMarkets)}
                className="mt-1 block text-xl font-bold tracking-tight text-foreground tabular-nums"
              />
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-center @3xl:flex">
          <div className="h-80 w-80">
            <McaGlobeIllustration highlights={globeHighlights} />
          </div>
        </div>
      </div>
    </Card>
  );
}
