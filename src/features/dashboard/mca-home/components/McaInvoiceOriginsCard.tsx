"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@payglocal_ui/flux-ui";
import { Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { DecorativeTrendGlyph } from "@/components/common/charts/DecorativeTrendGlyph";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { McaGlobeIllustration } from "@/features/dashboard/mca-home/components/McaGlobeIllustration";
import { useInvoiceOrigins } from "@/features/dashboard/mca-transactions/hooks";
import { useReferralWallet } from "@/features/dashboard/refer-and-earn/hooks";
import { formatCurrencyShort, formatSharePct } from "@/lib/utils/format";

type InvoiceOriginTimeframe = "1W" | "1M" | "3M";

const TIMEFRAMES: { value: InvoiceOriginTimeframe; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
];

const TIMEFRAME_DAYS: Record<InvoiceOriginTimeframe, number> = { "1W": 7, "1M": 30, "3M": 90 };

/**
 * Non-standard country codes the endpoint sends for a country it also sends
 * under its real ISO code — folded onto the canonical alpha-2 so the two rows
 * merge into one (see the row grouping in the component). "UK" is the same
 * country as ISO "GB"; "FA" is a bad code for France, which also arrives as
 * "FR"/"France".
 */
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
  FA: "FR",
};

/**
 * Resolve an API country code to a canonical flux COUNTRIES entry.
 *
 * The invoice-origins endpoint isn't consistent: most rows carry the ISO alpha-2
 * code ("US", "CA"), but some carry the country *name* ("India"), a non-ISO code
 * ("UK", "FA") or another form. Aliases fold the known bad codes onto their real
 * ISO code first; then matching on code OR name (case-insensitive) normalises
 * every row back to a real alpha-2 code so the flag, label, globe highlight —
 * and the row grouping that de-dupes them — all line up.
 */
function resolveCountry(input: string): { code: string; name: string; flag: string } {
  const query = (input ?? "").trim();
  const aliased = COUNTRY_CODE_ALIASES[query.toUpperCase()] ?? query;
  const upper = aliased.toUpperCase();
  const entry =
    COUNTRIES.find((c) => c.code.toUpperCase() === upper) ??
    COUNTRIES.find((c) => c.name.toLowerCase() === aliased.toLowerCase());
  if (entry) return { code: entry.code, name: entry.name, flag: entry.flag };
  return { code: aliased, name: aliased || "Unknown", flag: "🌍" };
}

/** Currency-aware — the invoice-origins API reports its own reportingCurrency. */
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
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

interface OriginRow {
  countryCode: string;
  countryName: string;
  flag: string;
  amount: number;
  invoiceCount: number;
}

/**
 * Median of the rows' amounts, swapped in for "Avg per country" once there's
 * more than one market. A merchant's book is usually dominated by one market
 * (see the 94%+ single-market share the stat cell beside this one reports),
 * and a mean gets dragged toward that outlier — ₹10.60Cr describes no real
 * market on a ten-country card, while the median describes a typical one.
 */
function medianAmount(rows: OriginRow[]): number {
  if (rows.length === 0) return 0;
  const sorted = [...rows].map((r) => r.amount).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

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

/** Fills the dead space the distribution bar/chip list leaves behind once
 *  there's only 1-2 countries to show (the region below reserves room for a
 *  typical multi-country result, see the min-h-[148px] wrapper) with a
 *  promotional nudge instead of blank whitespace, linking through to Refer &
 *  Earn like every other MDR-waiver/referral touchpoint in the app.
 *
 *  The countdown is the wallet's own `mdrWaiver`, from the same get-wallet call
 *  that backs the Refer & Earn page this taps through to. Renders nothing when
 *  there is no waiver in progress: filling the space was the original reason
 *  this exists, but not at the price of naming a number that isn't the
 *  merchant's. */
function MdrWaiverCallout() {
  const router = useRouter();
  const { wallet } = useReferralWallet();
  const remaining = wallet?.mdrWaiver ?? 0;

  if (!(remaining > 0)) return null;

  return (
    // Button always wraps its `children` in one auto-generated `<span>`
    // (see DisputeRespondForm's upload dropzone for the same gotcha), and
    // that span itself has no layout classes — nesting a `w-full flex`
    // wrapper INSIDE it doesn't help, since a percentage width can't
    // resolve against a shrink-to-fit ancestor, which is exactly what left
    // the whole icon/text/chevron cluster shrink-wrapped and centered
    // instead of spread edge-to-edge. Styling that exact span directly via
    // `[&>span]` is what actually makes it a full-width flex row: leftIcon/
    // rightIcon are left unused here (they'd render as extra siblings of
    // that span, not inside it) so every visible child — icon, text block,
    // chevron — passes through as plain `children` and lands inside the
    // one span this selector targets.
    <Button
      type="button"
      variant="ghost"
      onClick={() => router.push("/refer-and-earn")}
      className="h-auto w-full rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50 via-blue-100 to-indigo-100 p-4 text-left shadow-sm transition-shadow hover:shadow-md dark:border-blue-900/50 dark:from-blue-950/40 dark:via-blue-900/30 dark:to-indigo-950/30 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
        <Icon name="gift" size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-foreground">
          You&apos;re {remaining.toLocaleString("en-IN")} transaction
          {remaining === 1 ? "" : "s"} away from your MDR waiver
        </span>
        <span className="block text-xs text-muted-foreground">Tap to learn more</span>
      </span>
      <Icon
        name="chevron-right"
        size={16}
        className="shrink-0 text-blue-600 dark:text-blue-400"
        aria-hidden
      />
    </Button>
  );
}

export function McaInvoiceOriginsCard() {
  const [timeframe, setTimeframe] = useState<InvoiceOriginTimeframe>("1M");
  const [ranges] = useState(buildTimeframeRanges);

  const { startDate, endDate } = ranges[timeframe];
  const { origins, isLoading, isError } = useInvoiceOrigins(startDate, endDate);

  const currency = origins?.reportingCurrency ?? "USD";
  // Group by canonical country code, so rows the endpoint splits across an ISO
  // code and a non-ISO alias for the same country (GB + UK, FR + France + FA)
  // collapse into one — their amounts and invoice counts summed — rather than
  // showing as separate near-duplicate bars. Sorted by amount so the merged
  // figures still rank correctly.
  const rowsByCode = new Map<string, OriginRow>();
  for (const r of origins?.rows ?? []) {
    const country = resolveCountry(r.countryCode);
    const existing = rowsByCode.get(country.code);
    if (existing) {
      existing.amount += r.amount;
      existing.invoiceCount += r.invoiceCount;
    } else {
      rowsByCode.set(country.code, {
        // Normalised to the canonical alpha-2 code, so the flag and the globe
        // highlight below both resolve for it.
        countryCode: country.code,
        countryName: country.name,
        flag: country.flag,
        amount: r.amount,
        invoiceCount: r.invoiceCount,
      });
    }
  }
  const rows = [...rowsByCode.values()].sort((a, b) => b.amount - a.amount);
  const totals = origins?.totals;
  const totalInvoiced = totals?.totalInvoiced ?? 0;
  // No fallback: an environment whose totals carry no trend shows no chip,
  // rather than a made-up percentage a merchant would read as real.
  const totalInvoicedTrendPct = totals?.totalInvoicedTrendPct ?? null;
  // Denominator for the distribution bar/chip shares below — the sum of
  // these SAME rows, not totalInvoiced, so the stacked segments always add
  // up to exactly 100% regardless of any rounding/reporting-currency drift
  // between this list and the totals endpoint (see SettlementAnalyticsCard's
  // own totalValue for the same reasoning).
  const rowsAmountSum = rows.reduce((sum, o) => sum + o.amount, 0);

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

          {/* Four tiers by market count, not one layout stretched to fit all
              of them:
                - 1 market: nothing to compare, so no bar — a plain headline
                  figure instead.
                - 2 markets: two headline figures side by side. Still no bar;
                  two numbers is a comparison read faster than two bars.
                - 3-6 markets: ranked bars return, since comparison is now the
                  job. Each bar keeps a minimum visible width so a dominant
                  market (94%+ of volume is typical here) doesn't reduce its
                  competitors to invisible slivers, and row spacing tightens
                  as the list grows so it still fills the same height.
                - 7+ markets: bars stop earning their space at this density,
                  so it drops to the plain two-column list instead.
              The region reserves the height of a full five-row list
              (min-h-[148px]) so the empty and error states, which render a
              single line, don't let the summary stats below slide up into the
              vacated space: the stats stay pinned wherever the full list would
              have put them. */}
          <div className="mt-5 min-h-[148px]">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                <Shimmer className="h-2.5 w-full rounded-sm" />
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Shimmer key={i} className="h-10 w-full" />
                  ))}
                </div>
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
                title="Nothing invoiced in this period"
                description="Once you raise invoices, this shows where your invoiced volume comes from."
                className="h-full py-2"
              />
            ) : rows.length === 1 ? (
              <div className="flex h-full flex-col justify-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <CountryFlagAvatar
                      iso2={rows[0]!.countryCode}
                      countryName={rows[0]!.countryName}
                      className="h-8 w-8 shrink-0"
                    />
                    <p className="text-sm text-muted-foreground">
                      {rows[0]!.countryName}, your only active market
                    </p>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span className="text-[2rem] font-bold leading-none tracking-tight text-foreground tabular-nums">
                      {formatCurrencyShort(rows[0]!.amount, currency)}
                    </span>
                    {rows[0]!.amount > 0 && totalInvoicedTrendPct != null && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 text-xs font-medium",
                          totalInvoicedTrendPct >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        <Icon
                          name={totalInvoicedTrendPct >= 0 ? "trending-up" : "trending-down"}
                          size={12}
                          aria-hidden
                        />
                        {totalInvoicedTrendPct >= 0 ? "+" : ""}
                        {totalInvoicedTrendPct}%
                      </span>
                    )}
                  </div>
                </div>
                <DecorativeTrendGlyph positive={(totalInvoicedTrendPct ?? 0) >= 0} />
              </div>
            ) : rows.length === 2 ? (
              <div className="flex h-full flex-col justify-center gap-4">
                <div className="grid grid-cols-2 gap-6">
                  {rows.map((origin) => {
                    const pct = rowsAmountSum > 0 ? origin.amount / rowsAmountSum : 0;
                    return (
                      <div key={origin.countryCode} className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CountryFlagAvatar
                            iso2={origin.countryCode}
                            countryName={origin.countryName}
                            className="h-6 w-6 shrink-0"
                          />
                          <span className="truncate">{origin.countryName}</span>
                          <span className="ml-auto shrink-0 tabular-nums">
                            {formatSharePct(pct)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xl font-bold tracking-tight text-foreground tabular-nums">
                          {formatCurrencyShort(origin.amount, currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <MdrWaiverCallout />
              </div>
            ) : rows.length <= 6 ? (
              <div className={cn("flex flex-col", rows.length <= 4 ? "gap-5" : "gap-3")}>
                {rows.map((origin, i) => {
                  const pct = rowsAmountSum > 0 ? origin.amount / rowsAmountSum : 0;
                  // Every bar gets a visible stub, however small its share —
                  // a market that's genuinely 0.01% of volume still ran real
                  // transactions, and an empty-looking track reads as "no
                  // data" rather than "very little".
                  const widthPct = Math.max(pct * 100, 1.5);
                  return (
                    <div key={origin.countryCode} className="flex items-center gap-3">
                      <span className="flex w-32 min-w-0 shrink-0 items-center gap-2">
                        <CountryFlagAvatar
                          iso2={origin.countryCode}
                          countryName={origin.countryName}
                          className="h-6 w-6 shrink-0"
                        />
                        <span className="truncate text-sm text-foreground">
                          {origin.countryName}
                        </span>
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                          }}
                        />
                      </span>
                      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {formatSharePct(pct)}
                      </span>
                      <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrencyShort(origin.amount, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {rows.map((origin, i) => (
                  <li key={origin.countryCode} className="flex items-center gap-3 py-1">
                    <span
                      className="h-8 w-1 shrink-0 rounded-sm"
                      style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <CountryFlagAvatar
                      iso2={origin.countryCode}
                      countryName={origin.countryName}
                      className="h-8 w-8 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {origin.countryName}
                      </span>
                      <span className="block text-[11px] tabular-nums text-muted-foreground">
                        {formatSharePct(rowsAmountSum > 0 ? origin.amount / rowsAmountSum : 0)} of
                        total
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrencyShort(origin.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 @2xl:grid-cols-4 @2xl:divide-x @2xl:divide-border">
            {isLoading || !showData ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Shimmer className="h-3 w-20" />
                  <Shimmer className="mt-2 h-6 w-16" />
                </div>
              ))
            ) : rows.length === 1 ? (
              // One market: "avg per market" is meaningless and "median
              // market" is the same figure as "total invoiced" restated, so
              // both are replaced with the pair that's actually informative
              // at n=1 — how many transactions made up that figure, and what
              // a typical one was worth.
              <>
                {/* No trendPct here — the same figure already carries its
                    trend chip in the headline amount above; repeating it
                    here read as a second, redundant trend badge. */}
                <StatCell
                  label="Total amount"
                  valueLabel={formatCurrencyShort(rows[0]!.amount, currency)}
                  trendPct={null}
                />
                <StatCell
                  label="Transactions"
                  valueLabel={String(rows[0]!.invoiceCount)}
                  trendPct={null}
                />
                <StatCell
                  label="Average payment"
                  valueLabel={formatCurrencyShort(
                    rows[0]!.invoiceCount > 0 ? rows[0]!.amount / rows[0]!.invoiceCount : 0,
                    currency
                  )}
                  trendPct={null}
                />
                <div>
                  <p className="text-xs text-muted-foreground">Active markets</p>
                  <RollingNumber
                    value="1"
                    className="mt-1 block text-xl font-bold tracking-tight text-foreground tabular-nums"
                  />
                </div>
              </>
            ) : (
              <>
                {/* No trendPct on "Total amount" — that figure's trend chip
                    already shows in the headline amount above, so repeating
                    it here would just be a second, redundant badge. Trend
                    stays null-when-zero on the other cells below, per the
                    original note: a percentage change against nothing reads
                    as broken. */}
                <StatCell
                  label="Total amount"
                  valueLabel={formatCurrencyShort(totalInvoiced, currency)}
                  trendPct={null}
                />
                <StatCell
                  label="Median market"
                  valueLabel={formatCurrencyShort(medianAmount(rows), currency)}
                  trendPct={null}
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
                    value={String(totals?.activeMarkets ?? rows.length)}
                    className="mt-1 block text-xl font-bold tracking-tight text-foreground tabular-nums"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="hidden items-center justify-center border-l border-border @3xl:flex">
          <div className="h-80 w-80">
            <McaGlobeIllustration highlights={globeHighlights} />
          </div>
        </div>
      </div>
    </Card>
  );
}
