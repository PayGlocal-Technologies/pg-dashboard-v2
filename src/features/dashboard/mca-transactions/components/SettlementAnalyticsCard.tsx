"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardContent,
  Shimmer,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { EmptyAxesChart, EMPTY_AXIS_LABELS } from "@/components/common/charts/EmptyAxesChart";
import { currencySymbol, formatNextSettlementDate, formatSharePct } from "@/lib/utils/format";
import { CompactAmount } from "@/components/common/CompactAmount";
import { DecorativeTrendGlyph } from "@/components/common/charts/DecorativeTrendGlyph";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { useMcaOverview, useSettledByAccount } from "@/features/dashboard/mca-transactions/hooks";
import type { SettledAccountRow } from "@/features/dashboard/mca-transactions/types";

type AnalyticsMode = "amount" | "count";

/** The whole Analytics section's time-range values (see
 *  TransactionsAnalyticsCarousel, which owns the control itself now).
 *  Exported so that control can build its options against this same type
 *  without duplicating it. */
export type TimeRange = "year" | "month" | "week" | "today";

/** Order and labels match the reference: Today, then widening windows up to
 *  Year. */
export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "Year to date" },
];

/** The section's TimeRange → the settled-by-account API's timeframe param. */
const TIMEFRAME_BY_RANGE: Record<TimeRange, string> = {
  today: "today",
  week: "week",
  month: "month",
  year: "ytd",
};

/** Account currency → display label + flag ISO2. REST_OF_WORLD has no flag. */
const ACCOUNT_META: Record<string, { label: string; iso2: string }> = {
  USD: { label: "USD Account", iso2: "US" },
  GBP: { label: "GBP Account", iso2: "GB" },
  EUR: { label: "EUR Account", iso2: "EU" },
  CAD: { label: "CAD Account", iso2: "CA" },
  AED: { label: "AED Account", iso2: "AE" },
  SGD: { label: "SGD Account", iso2: "SG" },
  AUD: { label: "AUD Account", iso2: "AU" },
  CNY: { label: "CNY Account", iso2: "CN" },
  REST_OF_WORLD: { label: "Rest of world", iso2: "" },
};

function accountMeta(currency: string): { label: string; iso2: string } {
  return ACCOUNT_META[currency] ?? { label: `${currency} Account`, iso2: "" };
}

/** Currencies that don't get their own bar — their amount + count are folded
 *  into REST_OF_WORLD instead. */
const FOLD_INTO_REST = new Set(["AED", "SGD"]);

/** Collapse AED + SGD into the REST_OF_WORLD bucket, leaving every other
 *  currency as its own bar. */
function foldRestOfWorld(accounts: SettledAccountRow[]): SettledAccountRow[] {
  const kept: SettledAccountRow[] = [];
  let restAmount = 0;
  let restCount = 0;
  let hasRest = false;

  for (const account of accounts) {
    if (account.currency === "REST_OF_WORLD" || FOLD_INTO_REST.has(account.currency)) {
      restAmount += account.amount;
      restCount += account.count;
      hasRest = true;
    } else {
      kept.push(account);
    }
  }

  // No `currencyAmount` on the bucket: it holds several currencies, and their
  // native amounts are in different units — summing them would produce a
  // number in no currency at all. The row shows its reporting-currency total
  // only.
  if (hasRest) kept.push({ currency: "REST_OF_WORLD", amount: restAmount, count: restCount });
  return kept;
}

/** Compact ₹ for the narrow bar-value column (amounts share one reporting
 *  currency — they sum to totalAmount). */
function formatBarAmount(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

/** "$8,377,994" for large native amounts, "A$308.09" for sub-thousand ones —
 *  matches how the reference design varies decimal precision by magnitude.
 *  Null when the row carries no native figure, which is the rest-of-world
 *  bucket: it folds several currencies together, so no single symbol or total
 *  describes it. */
function formatNativeAmount(currency: string, nativeAmount: number | undefined): string | null {
  if (nativeAmount === undefined || !Number.isFinite(nativeAmount)) return null;
  const formatted =
    nativeAmount >= 1_000
      ? Math.round(nativeAmount).toLocaleString("en-US")
      : nativeAmount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return `${currencySymbol(currency)}${formatted}`;
}

/** "USD Account" → "USD"; "Rest of world" is left as-is (it has no trailing
 *  " Account" to strip). The chip grid names the same account the full label
 *  already does — this only shortens how it reads in a compact chip. */
function shortAccountLabel(label: string): string {
  return label.replace(/ Account$/, "");
}

/**
 * Settlement analytics for the Transactions page: a headline KPI beside the
 * amount/count toggle, over a ranked per-account bar list.
 *
 * The time-range control used to live in this card's own header; it's now
 * owned by TransactionsAnalyticsCarousel instead, sitting above the whole
 * Analytics section since it's meant to drive every card in it, so this
 * component just takes the chosen range as a prop.
 */

interface AccountBarRowData {
  accountId: string;
  label: string;
  iso2: string;
  value: number;
  valueLabel: string;
  /** The settlement in this account's own currency, for the subtext under the
   *  reporting-currency figure. Independent of `value`/`valueLabel`, which
   *  switch to a transaction count in count mode. Absent on the rest-of-world
   *  bucket, which has no single native currency. */
  currencyAmount?: number;
  /** Settled amount in the reporting currency (INR), whatever the mode —
   *  count mode's subtext shows it in place of the native figure. */
  amount: number;
}

/** A figure that swaps with a short slide when the amount/count toggle
 *  flips, shared by every tier below so a mode switch reads the same
 *  whichever layout the currency count picked. */
function ModeValue({
  isAmountMode,
  delay = 0,
  className,
  children,
}: {
  isAmountMode: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={isAmountMode ? "amount" : "count"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3, delay, ease: "easeOut" }}
        className={cn("block tabular-nums", className)}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

/** The line under a currency's figure: its native-currency amount in amount
 *  mode ("$8,377,993"), or the INR amount in count mode, since a transaction
 *  count has no currency of its own. Null for the rest-of-world bucket in
 *  amount mode, which has no single native currency. */
function currencySubLabel(row: AccountBarRowData, isAmountMode: boolean): string | null {
  return isAmountMode
    ? formatNativeAmount(row.accountId, row.currencyAmount)
    : formatBarAmount(row.amount);
}

/** One currency's row in the two-column list used past six currencies,
 *  styled like the dashboard Transactions card's 7+ tier: flag, bold
 *  currency code with its share of total beneath it on the left; the INR
 *  amount with its native-currency amount beneath it on the right, and a
 *  hairline rule under each row (set by the caller via `className`). */
function CurrencyChip({
  row,
  sharePct,
  isAmountMode,
  index,
  className,
}: {
  row: AccountBarRowData;
  sharePct: number;
  isAmountMode: boolean;
  /** Row position in its own list — staggers this chip's sweep-in a beat
   *  after the one above it, so a mode switch reads as the whole list
   *  resettling top-to-bottom rather than every value changing at once. */
  index: number;
  className?: string;
}) {
  // Amount mode's subtext is the native-currency figure ("$8,377,993");
  // count mode has no native-currency reading of its own (a transaction
  // count has no currency), so it shows the same INR amount the amount-mode
  // headline uses instead of leaving that line blank — same placement
  // either way, just which figure fills it.
  const subLabel = currencySubLabel(row, isAmountMode);
  const delay = Math.min(index, 8) * 0.04;
  return (
    <li className={cn("flex items-center gap-2.5 py-2.5", className)}>
      <CountryFlagAvatar iso2={row.iso2} countryName={row.label} className="h-7 w-7 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {shortAccountLabel(row.label)}
        </span>
        <span className="block text-[11px] tabular-nums text-muted-foreground">
          {formatSharePct(sharePct)} of total
        </span>
      </span>
      <span className="shrink-0 overflow-hidden text-right">
        <ModeValue
          isAmountMode={isAmountMode}
          delay={delay}
          className="text-sm font-semibold text-foreground"
        >
          {row.valueLabel}
        </ModeValue>
        {subLabel && (
          <motion.span
            key={isAmountMode ? "native" : "inr"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: delay + 0.06, ease: "easeOut" }}
            className="block truncate text-[11px] text-muted-foreground"
          >
            {subLabel}
          </motion.span>
        )}
      </span>
    </li>
  );
}

/** Per-rank bar colours, the same sequence the dashboard Transactions card
 *  (McaInvoiceOriginsCard) uses for its 3-6 market tier. */
const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-3)",
  "var(--chart-4)",
];

/** One currency: nothing to compare, so no list. Mirrors the dashboard
 *  Transactions card's 1-market hero: flag and name, the figure, then the
 *  decorative trend glyph filling the space a chart would. The figure is the
 *  row's own reporting-currency value (as in every other tier), with its
 *  native-currency amount beneath it. Settled-by-account returns no series
 *  and no trend figure, so the glyph takes its default (rising) shape. */
function SingleCurrency({ row, isAmountMode }: { row: AccountBarRowData; isAmountMode: boolean }) {
  const subLabel = currencySubLabel(row, isAmountMode);
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <CountryFlagAvatar iso2={row.iso2} countryName={row.label} className="h-8 w-8 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {shortAccountLabel(row.label)}, your only currency
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
          <ModeValue
            isAmountMode={isAmountMode}
            className="text-[2rem] font-bold leading-none tracking-tight text-foreground"
          >
            {row.valueLabel}
          </ModeValue>
          {subLabel && <span className="text-sm text-muted-foreground">{subLabel}</span>}
        </div>
      </div>
      <DecorativeTrendGlyph />
    </div>
  );
}

/** Two currencies: side by side, each with its own figure. Still no bars —
 *  two numbers is a comparison read faster than two bars. */
function DuoCurrencies({
  rows,
  totalValue,
  isAmountMode,
}: {
  rows: AccountBarRowData[];
  totalValue: number;
  isAmountMode: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-6 py-2">
      {rows.map((row, index) => {
        const subLabel = currencySubLabel(row, isAmountMode);
        return (
          <div key={row.accountId} className="min-w-0">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <CountryFlagAvatar
                iso2={row.iso2}
                countryName={row.label}
                className="h-7 w-7 shrink-0"
              />
              <span className="truncate">{shortAccountLabel(row.label)}</span>
              <span className="ml-auto shrink-0 text-xs tabular-nums">
                {formatSharePct(totalValue > 0 ? row.value / totalValue : 0)}
              </span>
            </div>
            <ModeValue
              isAmountMode={isAmountMode}
              delay={index * 0.04}
              className="mt-2 text-[1.75rem] font-bold leading-none tracking-tight text-foreground"
            >
              {row.valueLabel}
            </ModeValue>
            {subLabel && (
              <span className="mt-1.5 block truncate text-xs text-muted-foreground">
                {subLabel}
              </span>
            )}
            {/* The decorative glyph the dashboard's Transactions card uses
                for its 1-market hero. Settled-by-account returns no series
                and no trend figure at all, so it takes the glyph's default
                (rising) shape rather than a direction read from data. */}
            <div className="mt-3">
              <DecorativeTrendGlyph />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Three to six currencies: comparison is now the job, so ranked bars
 *  return. Bars are measured against the top currency (it fills the track)
 *  and keep a visible stub however small, since a dominant USD share (99%+
 *  is typical) would otherwise leave every other track looking empty — the
 *  share column carries the exact figure. Rows sit further apart when there
 *  are fewer of them. */
function RankedCurrencyBars({
  rows,
  totalValue,
  isAmountMode,
}: {
  rows: AccountBarRowData[];
  totalValue: number;
  isAmountMode: boolean;
}) {
  const topValue = rows[0]?.value ?? 0;
  return (
    <div className={cn("flex flex-col py-1", rows.length <= 4 ? "gap-4" : "gap-2.5")}>
      {rows.map((row, index) => {
        const widthPct = Math.max(topValue > 0 ? (row.value / topValue) * 100 : 0, 1.5);
        const subLabel = currencySubLabel(row, isAmountMode);
        return (
          <div key={row.accountId} className="flex items-center gap-3.5">
            <span className="flex w-28 min-w-0 shrink-0 items-center gap-2">
              <CountryFlagAvatar
                iso2={row.iso2}
                countryName={row.label}
                className="h-6 w-6 shrink-0"
              />
              <span className="truncate text-sm text-foreground">
                {shortAccountLabel(row.label)}
              </span>
            </span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {formatSharePct(totalValue > 0 ? row.value / totalValue : 0)}
            </span>
            <span className="w-24 shrink-0 overflow-hidden text-right">
              <ModeValue
                isAmountMode={isAmountMode}
                delay={Math.min(index, 8) * 0.04}
                className="text-sm font-semibold text-foreground"
              >
                {row.valueLabel}
              </ModeValue>
              {subLabel && (
                <span className="block truncate text-[11px] text-muted-foreground">{subLabel}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function SettlementAnalyticsCard({
  className,
  timeRange,
}: {
  className?: string;
  /** Chosen by TransactionsAnalyticsCarousel's section-level control. */
  timeRange: TimeRange;
}) {
  const [mode, setMode] = useState<AnalyticsMode>("amount");
  const isAmountMode = mode === "amount";
  // nextSettlement date still comes from the overview; the KPI + bars are the
  // settled-by-account endpoint, per the selected timeframe.
  const { overview } = useMcaOverview();
  const { settled, isLoading } = useSettledByAccount(TIMEFRAME_BY_RANGE[timeRange]);

  const accountRows = foldRestOfWorld(settled?.accounts ?? [])
    .map((account) => {
      const meta = accountMeta(account.currency);
      return {
        accountId: account.currency,
        label: meta.label,
        iso2: meta.iso2,
        value: isAmountMode ? account.amount : account.count,
        valueLabel: isAmountMode
          ? formatBarAmount(account.amount)
          : account.count.toLocaleString("en-IN"),
        currencyAmount: account.currencyAmount,
        amount: account.amount,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Denominator for every chip's share: the sum of the SAME rows the grid
  // renders, not `settledValue`/`settledCount` below. Those come straight off
  // the overview endpoint and can differ from the per-account total by
  // whatever rounding or reporting-currency conversion sits between the two.
  // Summing the rows actually being drawn is what keeps each row's "% of
  // total" consistent with the others.
  const totalValue = accountRows.reduce((sum, row) => sum + row.value, 0);

  const settledValue = settled?.totalAmount ?? 0;
  const settledCount = settled?.totalCount ?? 0;

  // Last settled used to sit beside this as its own row; removed at the
  // design's request rather than replaced, so this is the only date shown
  // now. Omitted, not shown as a placeholder, when the backend has no date.
  const nextSettlementLabel = overview?.nextSettlementDate
    ? `Next settlement${overview?.isTodayHoliday ? " (bank holiday)" : ""}: ${formatNextSettlementDate(overview.nextSettlementDate)}`
    : null;

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* KPI (+ next settlement) on the left, Amount collected/No. of
          transactions on the right: stacked below sm (CardHeader's own
          default is two auto rows, so with no column override the toggle
          just falls onto its own row under the KPI, full width via the Tabs
          classes below), side by side from sm up. This is the slot the
          time-range control used to occupy before it moved out to the whole
          Analytics section (see TransactionsAnalyticsCarousel). */}
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:gap-0">
        <div>
          {/* Label belongs to the KPI beneath it, not the other way round:
              it introduces the number rather than captioning it after the
              fact, the same order OutstandingAmountCard and SavedAmountCard
              both use for their own KPI blocks. Light/regular weight, not
              bold — matches SavedAmountCard's own label style, which every
              KPI card header on this page was brought in line with. */}
          <p className="text-sm font-normal text-muted-foreground">
            {isAmountMode ? "Total amount collected" : "Total transactions"}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            {isLoading ? (
              <Shimmer className="h-9 w-40" />
            ) : (
              <>
                <AnimatePresence mode="wait" initial={false}>
                  {isAmountMode ? (
                    <motion.div
                      key="amount"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <CompactAmount
                        amount={settledValue}
                        currency="INR"
                        className="text-3xl font-semibold tabular-nums tracking-tight text-foreground"
                      />
                    </motion.div>
                  ) : (
                    <motion.p
                      key="count"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="text-3xl font-semibold tabular-nums tracking-tight text-foreground"
                    >
                      {settledCount.toLocaleString("en-IN")}
                    </motion.p>
                  )}
                </AnimatePresence>
                {/* Visually subordinate to the KPI (muted, smaller, on the
                    same baseline rather than its own row) and wraps beneath
                    it naturally on narrow widths via the flex-wrap above. */}
                {nextSettlementLabel && (
                  <span className="text-sm text-muted-foreground">{nextSettlementLabel}</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* w-full/flex-1: fills whatever width this column ends up with
            (the whole card below sm where the header stacks, just this
            column's auto width from sm up) rather than hugging its own
            trigger text, unlike the time-range control that used to sit
            here. */}
        <div className="sm:justify-self-end">
          <Tabs value={mode} onValueChange={(v) => setMode(v as AnalyticsMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="amount" className="flex-1">
                Amount collected
              </TabsTrigger>
              <TabsTrigger value="count" className="flex-1">
                No. of transactions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      {/* flex-1: when className carries h-full (see TransactionsAnalyticsCarousel,
          which stretches this card to match the grid row's height at lg and
          up), CardHeader keeps its own intrinsic height and this region
          absorbs whatever's left. */}
      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Currency breakdown, laid out by currency count (see the tiers
            below).

            Still no forced height matching against Total settled (see the
            history above — that cross-card coupling is what caused the
            "resizes dramatically on timeframe change" bug in the first
            place).

            This section IS floored at a shared min-height (below), though —
            unlike that removed Total-settled coupling, this floor doesn't
            reach into another card. It exists because this card sits beside
            Documents Pending in the same grid row (see
            TransactionsAnalyticsCarousel's `lg:h-full` on both), which
            stretches both to match whichever is taller. Left unfloored, the
            empty-state illustration (~250px: icon + title + description)
            ran noticeably taller than a loaded 1-4 currency breakdown
            (~100-150px), so switching to a period with no settlements — or
            back — visibly grew or shrank the whole row, not just this
            card's own content. The floor is sized to the common loaded
            case (a handful of currencies) so the illustration shrinks to
            match it instead of the other way around; it doesn't reserve
            room for some worst-case list the way the old min-h-70 floor
            this replaced once did for a hypothetical 5-currency case. */}
        <div className="min-h-32">
          {isLoading ? (
            <div className="space-y-4">
              <Shimmer className="h-3 w-36" />
              <Shimmer className="h-3 w-full" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Shimmer key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : accountRows.length === 0 ? (
            // The same empty chart as Total settled beneath it, so the two
            // cards read alike when a period has nothing. This card is about
            // money coming in, so the copy says so (not "settled").
            <div className="relative h-40">
              <EmptyAxesChart
                labels={EMPTY_AXIS_LABELS[timeRange]}
                title={
                  isAmountMode
                    ? "No payments collected in this period"
                    : "No transactions in this period"
                }
                description="As payments come in, this breaks the total down by the currency each one arrived in."
              />
            </div>
          ) : (
            accountRows.length > 0 && (
              <div className="space-y-3">
                {/* Same uppercase/tracked micro-label PaymentDetailsSection and
                  every other section heading in this feature already uses
                  (see TransactionDetailsPage), rather than the plain small
                  label this had before — one more thing that read as
                  slightly off-house-style on review. */}
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Currency breakdown
                </p>

                {/* Four tiers by currency count, matching the Transactions
                  card on the dashboard (McaInvoiceOriginsCard): one currency
                  is a hero figure, two sit side by side, three to six are
                  ranked bars, and past six bars stop earning their space so
                  it drops to a plain two-column list. Every tier renders
                  every currency, so the old five-row cap and its Show more
                  are gone. */}
                {accountRows.length === 1 ? (
                  <SingleCurrency row={accountRows[0]!} isAmountMode={isAmountMode} />
                ) : accountRows.length === 2 ? (
                  <DuoCurrencies
                    rows={accountRows}
                    totalValue={totalValue}
                    isAmountMode={isAmountMode}
                  />
                ) : accountRows.length <= 6 ? (
                  <RankedCurrencyBars
                    rows={accountRows}
                    totalValue={totalValue}
                    isAmountMode={isAmountMode}
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                    {accountRows.map((row, index) => (
                      <CurrencyChip
                        key={row.accountId}
                        row={row}
                        isAmountMode={isAmountMode}
                        index={index}
                        sharePct={totalValue > 0 ? row.value / totalValue : 0}
                        className="border-b border-border/60 py-2"
                      />
                    ))}
                  </ul>
                )}
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
