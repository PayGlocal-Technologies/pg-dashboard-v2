"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Shimmer,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
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

/** How the selected period reads inside a sentence ("Total amount collected,
 *  this month", "GBP is a small second currency this month"). */
const PERIOD_PHRASE: Record<TimeRange, string> = {
  today: "today",
  week: "this week",
  month: "this month",
  year: "year to date",
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

/** Currencies that don't get their own row — their amount + count are folded
 *  into REST_OF_WORLD instead. */
const FOLD_INTO_REST = new Set(["AED", "SGD"]);

/** Collapse AED + SGD into the REST_OF_WORLD bucket, leaving every other
 *  currency as its own row. */
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

/** Compact ₹ for the row value columns (amounts share one reporting
 *  currency — they sum to totalAmount). */
function formatBarAmount(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

/** "$8,377,994" for large native amounts, "A$308.09" for sub-thousand ones.
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

/** "USD Account" → "USD"; "Rest of world" is left as-is. */
function shortAccountLabel(label: string): string {
  return label.replace(/ Account$/, "");
}

/** "US Dollar" for "USD", from the browser's own currency names; the
 *  rest-of-world bucket reads "Several currencies". */
function currencyName(code: string): string {
  if (code === "REST_OF_WORLD") return "Several currencies";
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** The average INR rate a row was converted at: its INR amount over its
 *  native amount. Null for the rest-of-world bucket (no native amount). */
function averageRate(row: AccountBarRowData): number | null {
  if (!row.currencyAmount || row.currencyAmount <= 0) return null;
  return row.amount / row.currencyAmount;
}

interface AccountBarRowData {
  accountId: string;
  label: string;
  iso2: string;
  value: number;
  valueLabel: string;
  /** The settlement in this account's own currency. Independent of
   *  `value`/`valueLabel`, which switch to a transaction count in count mode.
   *  Absent on the rest-of-world bucket, which has no single native
   *  currency. */
  currencyAmount?: number;
  /** Settled amount in the reporting currency (INR), whatever the mode. */
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

/** Small round flag; the rest-of-world bucket (no ISO2) gets a globe. */
function RowFlag({ row, className }: { row: AccountBarRowData; className?: string }) {
  if (!row.iso2) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          className
        )}
        aria-hidden
      >
        <Icon name="globe" className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <CountryFlagAvatar
      iso2={row.iso2}
      countryName={row.label}
      className={cn("shrink-0", className)}
    />
  );
}

/** Two series colours: the split bar's segments and the matching row dots. */
const SPLIT_COLORS = ["var(--chart-1)", "var(--chart-2)"];

/** Two currencies: a split bar (with a minimum sliver so the small side stays
 *  visible) over two compact rows, plus a plain-language note when one side
 *  is 95% or more. No trend line: two near-identical curves where one is
 *  thousands of times the other said nothing. */
function TwoCurrencies({
  rows,
  totalValue,
  isAmountMode,
  timeRange,
}: {
  rows: AccountBarRowData[];
  totalValue: number;
  isAmountMode: boolean;
  timeRange: TimeRange;
}) {
  const [a, b] = rows as [AccountBarRowData, AccountBarRowData];
  const shareA = totalValue > 0 ? a.value / totalValue : 0;
  const shareB = totalValue > 0 ? b.value / totalValue : 0;
  return (
    <div className="space-y-3">
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${shortAccountLabel(a.label)} ${formatSharePct(shareA)}, ${shortAccountLabel(b.label)} ${formatSharePct(shareB)}`}
      >
        <span
          className="block h-full"
          style={{ flex: `${shareA} 1 0`, background: SPLIT_COLORS[0] }}
        />
        <span
          className="block h-full min-w-1.5"
          style={{ flex: `${shareB} 0 0`, background: SPLIT_COLORS[1] }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row, i) => {
          const rate = averageRate(row);
          const native = formatNativeAmount(row.accountId, row.currencyAmount);
          const detail =
            isAmountMode && native
              ? `${native}${rate ? ` at ₹${rate.toFixed(2)}` : ""}`
              : currencyName(row.accountId);
          return (
            <div
              key={row.accountId}
              className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: SPLIT_COLORS[i] }}
                aria-hidden
              />
              <RowFlag row={row} className="h-7 w-7" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {shortAccountLabel(row.label)}
                </span>
                <span className="block truncate text-xs tabular-nums text-muted-foreground">
                  {detail}
                </span>
              </span>
              <span className="ml-auto shrink-0 text-right">
                <ModeValue
                  isAmountMode={isAmountMode}
                  delay={i * 0.04}
                  className="text-base font-semibold text-foreground"
                >
                  {row.valueLabel}
                </ModeValue>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {formatSharePct(totalValue > 0 ? row.value / totalValue : 0)}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {shareA >= 0.95 && (
        <p className="rounded-lg bg-primary/10 px-3.5 py-2.5 text-sm text-foreground">
          Almost all of {isAmountMode ? "your collections" : "your payments"} (
          {formatSharePct(shareA)}) came in {shortAccountLabel(a.label)}.{" "}
          {shortAccountLabel(b.label)} is a small second currency {PERIOD_PHRASE[timeRange]}.
        </p>
      )}
    </div>
  );
}

/** Three to six currencies: comparison is now the job, so ranked bars, sorted
 *  by size, measured against the top currency (it fills the track), each
 *  with a visible stub however small. The native amount (amount mode) or the
 *  currency name (count mode) sits beside the code so a row can be tied back
 *  to its invoices. */
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
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const widthPct = Math.max(topValue > 0 ? (row.value / topValue) * 100 : 0, 1.5);
        const detail = isAmountMode
          ? (formatNativeAmount(row.accountId, row.currencyAmount) ?? currencyName(row.accountId))
          : currencyName(row.accountId);
        return (
          <div
            key={row.accountId}
            className="grid grid-cols-[7.5rem_1fr_6rem] items-center gap-3.5 sm:grid-cols-[11rem_1fr_4rem_6.5rem]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <RowFlag row={row} className="h-6 w-6" />
              <span className="text-sm font-semibold text-foreground">
                {shortAccountLabel(row.label)}
              </span>
              <span className="hidden truncate text-xs tabular-nums text-muted-foreground sm:block">
                {detail}
              </span>
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${widthPct}%` }}
              />
            </span>
            <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
              {formatSharePct(totalValue > 0 ? row.value / totalValue : 0)}
            </span>
            <ModeValue
              isAmountMode={isAmountMode}
              delay={Math.min(index, 8) * 0.04}
              className="text-right text-sm font-semibold text-foreground"
            >
              {row.valueLabel}
            </ModeValue>
          </div>
        );
      })}
    </div>
  );
}

/** Rows shown before "Show all" in the 7+ tier; the rest fold into one. */
const COLLAPSED_ROWS = 5;

/** Seven or more currencies: bars stop earning their space, so a two-column
 *  list. By default the top five show and the rest collapse into one "N other
 *  currencies" row, with a button to expand. */
function CurrencyList({
  rows,
  totalValue,
  isAmountMode,
}: {
  rows: AccountBarRowData[];
  totalValue: number;
  isAmountMode: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? rows : rows.slice(0, COLLAPSED_ROWS);
  const tail = rows.slice(COLLAPSED_ROWS);
  const tailValue = tail.reduce((sum, r) => sum + r.value, 0);
  const tailLabel = isAmountMode ? formatBarAmount(tailValue) : tailValue.toLocaleString("en-IN");

  return (
    <div>
      <ul className="grid grid-cols-1 gap-x-9 sm:grid-cols-2">
        {shown.map((row, index) => {
          const native = isAmountMode
            ? formatNativeAmount(row.accountId, row.currencyAmount)
            : null;
          return (
            <li
              key={row.accountId}
              className="flex items-center gap-3 border-b border-border/60 py-2.5"
            >
              <RowFlag row={row} className="h-7 w-7" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {shortAccountLabel(row.label)}
                </span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {formatSharePct(totalValue > 0 ? row.value / totalValue : 0)} of total
                </span>
              </span>
              <span className="shrink-0 text-right">
                <ModeValue
                  isAmountMode={isAmountMode}
                  delay={Math.min(index, 8) * 0.04}
                  className="text-sm font-semibold text-foreground"
                >
                  {row.valueLabel}
                </ModeValue>
                {native && (
                  <span className="block text-xs tabular-nums text-muted-foreground">{native}</span>
                )}
              </span>
            </li>
          );
        })}
        {!showAll && tail.length > 0 && (
          <li className="flex items-center gap-3 border-b border-border/60 py-2.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
              aria-hidden
            >
              <Icon name="globe" className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-muted-foreground">
                {tail.length} other currencies
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {tail.map((r) => shortAccountLabel(r.label)).join(", ")}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {tailLabel}
            </span>
          </li>
        )}
      </ul>
      {tail.length > 0 && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-2 h-auto min-h-0 p-0"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show fewer" : `Show all ${rows.length} currencies`}
        </Button>
      )}
    </div>
  );
}

/**
 * "Total amount collected" analytics card on the Transactions page (the file
 * name is a leftover). Header: the period total beside the amount/count
 * toggle, with a context line beneath. Body, by currency count:
 *   - 1: no breakdown (it would repeat the total); the native amount and
 *     average rate move into the context line, and a decorative trend glyph
 *     fills the space a chart would (settled-by-account has no daily series).
 *   - 2: split bar + two compact rows, and a note when one is 95%+.
 *   - 3-6: ranked bars with share and value.
 *   - 7+: two-column list, top five plus one collapsed row, expandable.
 *
 * BACKEND GAP: the reference design also shows a trend against the previous
 * period beside the total and a daily chart for one currency. The endpoint
 * returns neither, so neither is shown.
 */
export function SettlementAnalyticsCard({
  className,
  timeRange,
}: {
  className?: string;
  /** Chosen by TransactionsAnalyticsCarousel's section-level control. */
  timeRange: TimeRange;
}) {
  // nextSettlement date still comes from the overview; the KPI + breakdown are
  // the settled-by-account endpoint, per the selected timeframe.
  const { overview } = useMcaOverview();
  const { settled, isLoading } = useSettledByAccount(TIMEFRAME_BY_RANGE[timeRange]);

  const [mode, setMode] = useState<AnalyticsMode>("amount");
  const isAmountMode = mode === "amount";

  const accountRows: AccountBarRowData[] = foldRestOfWorld(settled?.accounts ?? [])
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

  // Denominator for every share: the sum of the SAME rows rendered, not the
  // endpoint's totals, so the shares stay consistent with each other.
  const totalValue = accountRows.reduce((sum, row) => sum + row.value, 0);

  const settledValue = settled?.totalAmount ?? 0;
  const settledCount = settled?.totalCount ?? 0;

  // Omitted, not shown as a placeholder, when the backend has no date.
  const nextSettlementLabel = overview?.nextSettlementDate
    ? `Next settlement${overview?.isTodayHoliday ? " (bank holiday)" : ""}: ${formatNextSettlementDate(overview.nextSettlementDate)}`
    : null;

  const only = accountRows.length === 1 ? accountRows[0]! : null;
  const onlyRate = only ? averageRate(only) : null;
  const onlyNative = only ? formatNativeAmount(only.accountId, only.currencyAmount) : null;

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* KPI on the left, Amount collected/No. of transactions on the right:
          stacked below sm, side by side from sm up. */}
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:gap-0">
        <div>
          <p className="text-sm font-normal text-muted-foreground">
            {isAmountMode ? "Total amount collected" : "Total transactions"},{" "}
            {PERIOD_PHRASE[timeRange]}
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
                {nextSettlementLabel && (
                  <span className="text-sm text-muted-foreground">{nextSettlementLabel}</span>
                )}
              </>
            )}
          </div>

          {/* Context line: for one currency, what the total was in that
              currency and the average rate it was converted at; for several,
              how they were combined. */}
          {!isLoading && accountRows.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {only ? (
                <>
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium text-foreground">
                    <RowFlag row={only} className="h-4 w-4" />
                    All in {shortAccountLabel(only.label)}
                  </span>
                  <span className="tabular-nums">
                    {isAmountMode
                      ? onlyNative &&
                        `${onlyNative}${onlyRate ? ` converted at an average ₹${onlyRate.toFixed(2)}` : ""}`
                      : `Every payment ${PERIOD_PHRASE[timeRange]} was in ${shortAccountLabel(only.label)}`}
                  </span>
                </>
              ) : (
                <span>
                  Across {accountRows.length} currencies, converted to INR at each settlement&apos;s
                  rate
                </span>
              )}
            </p>
          )}
        </div>

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
          up), this region absorbs whatever's left. Floored at min-h-32 so the
          empty state doesn't grow or shrink the whole row against Documents
          Pending beside it. */}
      <CardContent className="flex flex-1 flex-col gap-3">
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
          ) : only ? (
            // One currency: a breakdown would repeat the total, so the space
            // becomes the trend. Decorative only: there's no daily series.
            <DecorativeTrendGlyph />
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                By currency
              </p>
              {accountRows.length === 2 ? (
                <TwoCurrencies
                  rows={accountRows}
                  totalValue={totalValue}
                  isAmountMode={isAmountMode}
                  timeRange={timeRange}
                />
              ) : accountRows.length <= 6 ? (
                <RankedCurrencyBars
                  rows={accountRows}
                  totalValue={totalValue}
                  isAmountMode={isAmountMode}
                />
              ) : (
                <CurrencyList
                  rows={accountRows}
                  totalValue={totalValue}
                  isAmountMode={isAmountMode}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
