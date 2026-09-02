"use client";

import { useState } from "react";
import { COUNTRIES } from "@payglocal_ui/flux-ui";
import { Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { McaGlobeIllustration } from "@/features/dashboard/mca-home/components/McaGlobeIllustration";
import { useInvoiceOrigins } from "@/features/dashboard/mca-transactions/hooks";

type InvoiceOriginTimeframe = "1W" | "1M" | "3M";

const TIMEFRAMES: { value: InvoiceOriginTimeframe; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
];

const TIMEFRAME_DAYS: Record<InvoiceOriginTimeframe, number> = { "1W": 7, "1M": 30, "3M": 90 };

/**
 * Resolve an API country code to a canonical flux COUNTRIES entry.
 *
 * The invoice-origins endpoint isn't consistent: most rows carry the ISO alpha-2
 * code ("US", "CA"), but some carry the country *name* ("India") or another
 * form. A plain `find(c => c.code === input)` then misses — which is why India
 * showed the globe fallback flag and never lit up on the globe (its highlight is
 * keyed off the alpha-2 code via ALPHA2_TO_NUMERIC_ID). Matching on code OR name
 * (case-insensitive) normalises every row back to a real alpha-2 code so the
 * flag, label, and globe highlight all line up.
 */
function resolveCountry(input: string): { code: string; name: string; flag: string } {
  const query = (input ?? "").trim();
  const upper = query.toUpperCase();
  const entry =
    COUNTRIES.find((c) => c.code.toUpperCase() === upper) ??
    COUNTRIES.find((c) => c.name.toLowerCase() === query.toLowerCase());
  if (entry) return { code: entry.code, name: entry.name, flag: entry.flag };
  return { code: query, name: query || "Unknown", flag: "🌍" };
}

/** Currency-aware — the invoice-origins API reports its own reportingCurrency. */
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-3)",
  "var(--chart-4)",
];

interface StatCellProps {
  label: string;
  valueLabel: string;
  /** null hides the trend chip (e.g. an empty period has no top country). */
  trendPct: number | null;
}

function StatCell({ label, valueLabel, trendPct }: StatCellProps) {
  const positive = (trendPct ?? 0) >= 0;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <RollingNumber
          value={valueLabel}
          className="block text-xl font-bold tracking-tight text-foreground tabular-nums"
        />
        {trendPct !== null && (
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
        )}
      </div>
    </div>
  );
}

/** Date windows for the 1W/1M/3M buttons, computed once on mount so `new Date()`
 *  never runs during render (React Compiler rule, see CLAUDE.md). */
function buildTimeframeRanges(): Record<
  InvoiceOriginTimeframe,
  { startDate: string; endDate: string }
> {
  const end = new Date();
  const toIso = (d: Date): string => d.toISOString().slice(0, 10);
  const back = (days: number): { startDate: string; endDate: string } => {
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return { startDate: toIso(start), endDate: toIso(end) };
  };
  return {
    "1W": back(TIMEFRAME_DAYS["1W"]),
    "1M": back(TIMEFRAME_DAYS["1M"]),
    "3M": back(TIMEFRAME_DAYS["3M"]),
  };
}

export function McaInvoiceOriginsCard() {
  const [timeframe, setTimeframe] = useState<InvoiceOriginTimeframe>("1M");
  const [ranges] = useState(buildTimeframeRanges);

  const { startDate, endDate } = ranges[timeframe];
  const { origins, isLoading, isError } = useInvoiceOrigins(startDate, endDate);

  const currency = origins?.reportingCurrency ?? "USD";
  const rows = (origins?.rows ?? []).map((r) => {
    const country = resolveCountry(r.countryCode);
    return {
      // Normalised to the canonical alpha-2 code, so the flag and the globe
      // highlight below both resolve for it.
      countryCode: country.code,
      countryName: country.name,
      flag: country.flag,
      amount: r.amount,
      invoiceCount: r.invoiceCount,
    };
  });
  const totals = origins?.totals;
  const totalInvoiced = totals?.totalInvoiced ?? 0;
  const maxAmount = Math.max(...rows.map((o) => o.amount), 1);

  const globeHighlights = rows.map((origin, i) => ({
    countryCode: origin.countryCode,
    color: BAR_COLORS[i % BAR_COLORS.length]!,
    countryName: origin.countryName,
    flag: origin.flag,
    amountLabel: formatAmount(origin.amount, currency),
    invoiceCountLabel: `${origin.invoiceCount} invoice${origin.invoiceCount === 1 ? "" : "s"}`,
    sharePct: Math.round((origin.amount / (totalInvoiced || 1)) * 100),
    rank: i + 1,
  }));

  const topCode = totals?.topCountry?.countryCode;
  const topShareLabel = topCode ? `${resolveCountry(topCode).name} share` : "Top country share";
  const showData = !isLoading && !isError;

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
              <p className="mt-0.5 text-xs text-muted-foreground">
                Total transaction volume by country
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {TIMEFRAMES.map((opt) => (
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

          {/* Bar list — loading skeleton, error, empty, or the real rows.
              The region reserves the height of a full five-row list
              (min-h-[148px]) so the empty and error states, which render a
              single line, don't let the summary stats below slide up into the
              vacated space: the stats stay pinned wherever the full list would
              have put them. */}
          <div className="mt-5 min-h-[148px]">
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Shimmer className="h-4 w-36 shrink-0" />
                    <Shimmer className="h-2 flex-1" />
                    <Shimmer className="h-4 w-16 shrink-0" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <PlaceholderState
                variant="error"
                size="sm"
                title="Couldn't load"
                description="Invoice origins didn't load."
                className="h-full py-2"
              />
            ) : rows.length === 0 ? (
              <PlaceholderState
                variant="no-analytics"
                size="sm"
                title="No invoiced volume"
                description="No invoiced volume in this period."
                className="h-full py-2"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {rows.map((origin, i) => (
                  <div key={origin.countryCode} className="flex items-center gap-3">
                    <div className="flex w-36 shrink-0 items-center gap-1.5">
                      <span className="text-sm leading-none" aria-hidden>
                        {origin.flag}
                      </span>
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {origin.countryName}
                      </span>
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
                      {formatAmount(origin.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 @2xl:grid-cols-4">
            {isLoading || !showData ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Shimmer className="h-3 w-20" />
                  <Shimmer className="mt-2 h-6 w-16" />
                </div>
              ))
            ) : (
              <>
                {/* Trend passed as null (hidden) whenever the figure it sits
                    beside is zero — a percentage change against nothing reads as
                    broken. */}
                <StatCell
                  label="Total invoiced"
                  valueLabel={formatCompact(totalInvoiced, currency)}
                  trendPct={totalInvoiced > 0 ? (totals?.totalInvoicedTrendPct ?? null) : null}
                />
                <StatCell
                  label="Avg per country"
                  valueLabel={formatCompact(totals?.avgPerCountry ?? 0, currency)}
                  trendPct={
                    (totals?.avgPerCountry ?? 0) > 0
                      ? (totals?.avgPerCountryTrendPct ?? null)
                      : null
                  }
                />
                <StatCell
                  label={topShareLabel}
                  valueLabel={totals?.topCountry ? `${totals.topCountry.sharePct}%` : "—"}
                  trendPct={
                    totals?.topCountry && totals.topCountry.sharePct > 0
                      ? (totals.topCountry.shareTrendPct ?? null)
                      : null
                  }
                />
                <div>
                  <p className="text-xs text-muted-foreground">Active markets</p>
                  <RollingNumber
                    value={String(totals?.activeMarkets ?? 0)}
                    className="mt-1 block text-xl font-bold tracking-tight text-foreground tabular-nums"
                  />
                </div>
              </>
            )}
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
