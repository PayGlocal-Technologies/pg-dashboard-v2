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
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { formatNextSettlementDate } from "@/lib/utils/format";
import { CompactAmount } from "@/components/common/CompactAmount";
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

/**
 * TODO(backend): the settled-by-account API only returns the INR-equivalent
 * `amount`, not the native-currency amount. Until that's added to the
 * contract, the native amount line ("$8,377,994") is approximated
 * client-side from a placeholder FX rate table — remove this and read the
 * real field off the row once the API carries it.
 */
const MOCK_FX_RATE: Record<string, number> = {
  USD: 88.52,
  GBP: 112.4,
  EUR: 95.8,
  CAD: 63.35,
  AED: 24.1,
  SGD: 65.9,
  AUD: 58.1,
  CNY: 12.3,
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "C$",
  AED: "AED ",
  SGD: "S$",
  AUD: "A$",
  CNY: "¥",
};

/** "$8,377,994" for large native amounts, "A$308.09" for sub-thousand ones —
 *  matches how the reference design varies decimal precision by magnitude. */
function formatNativeAmount(currency: string, inrAmount: number): string | null {
  const rate = MOCK_FX_RATE[currency];
  const symbol = CURRENCY_SYMBOL[currency];
  if (!rate || !symbol) return null;
  const native = inrAmount / rate;
  const formatted =
    native >= 1_000
      ? Math.round(native).toLocaleString("en-US")
      : native.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

/** "USD Account" → "USD"; "Rest of world" is left as-is (it has no trailing
 *  " Account" to strip). The chip grid names the same account the full label
 *  already does — this only shortens how it reads in a compact chip. */
function shortAccountLabel(label: string): string {
  return label.replace(/ Account$/, "");
}

/**
 * Adaptive precision so a small currency never rounds to a dead "0%": each
 * tier is just enough decimal places to keep a share in that range visibly
 * nonzero. A currency small enough to still round to zero at three decimals
 * gets "<0.001%" instead of a false zero.
 */
function formatSharePct(fraction: number): string {
  if (!(fraction > 0)) return "0%";
  const pct = fraction * 100;
  if (pct >= 0.1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  if (pct >= 0.001) return `${pct.toFixed(3)}%`;
  return "<0.001%";
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

// Matches the reference: five rows visible by default, the rest behind
// Show more.
const VISIBLE_COUNT = 5;

interface AccountBarRowData {
  accountId: string;
  label: string;
  iso2: string;
  value: number;
  valueLabel: string;
  /** Settled amount in INR, independent of `value`/`valueLabel` which switch
   *  to a transaction count in count mode — the native-amount-at-rate
   *  subtext always needs the amount, regardless of the selected mode. */
  amount: number;
}

/** One currency's row in the full-width breakdown list: flag, bold currency
 *  code with its share of total beneath it on the left; the INR amount with
 *  its native-currency amount beneath it on the right. Rows are separated by
 *  dividers (see `className`, set by the caller — a hairline `divide-y` when
 *  stacked, or explicit `border-b`/`border-l` rules forming a grid once
 *  currencies pair up two-to-a-line) rather than a bordered box. Shared
 *  between the always-visible first five and the entries Show more reveals,
 *  so the two stay pixel-identical. */
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
  const subLabel = isAmountMode
    ? formatNativeAmount(row.accountId, row.amount)
    : formatBarAmount(row.amount);
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isAmountMode ? "amount" : "count"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, delay, ease: "easeOut" }}
            className="block text-sm font-semibold tabular-nums text-foreground"
          >
            {row.valueLabel}
          </motion.span>
        </AnimatePresence>
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

/** Divider classes for one cell of the paired (two-up) breakdown grid: a
 *  hairline rule between rows (skipped on the last row, whichever column
 *  it's in) and another between the two columns, via padding rather than
 *  the grid's own `gap` — a `gap-x` leaves the vertical rule floating in
 *  mid-gutter attached to neither column, while `pr-4`/`pl-4` on either
 *  side of a shared column edge (no gap at all) puts it flush against both.
 *  Kept as one small function rather than inlined at each call site since
 *  both the always-visible list and the Show-more-revealed one need the
 *  exact same rule against the exact same denominators (their own row
 *  count). */
function pairedCellClasses(index: number, count: number): string {
  const isLastRow = index >= count - (count % 2 === 0 ? 2 : 1);
  const isRightColumn = index % 2 === 1;
  return cn("border-border", !isLastRow && "border-b", isRightColumn ? "border-l pl-4" : "pr-4");
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
  const [expanded, setExpanded] = useState(false);
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
  // Capped at five on every breakpoint, not just the mobile carousel: the
  // card grows to fit the rest once expanded (see the lg:h-full/grow wiring
  // in TransactionsAnalyticsCarousel, which stretches Outstanding + Saved to
  // match whatever height this card ends up at), so there's no longer a
  // "spare space at lg" case to fill with extra rows by default.
  const firstFiveRows = accountRows.slice(0, VISIBLE_COUNT);
  const restRows = accountRows.slice(VISIBLE_COUNT);
  const canExpand = restRows.length > 0;
  // 1-3 currencies read better stacked (each row's own width to fit the
  // native-amount-at-rate subtext); past that, pairing two per line keeps
  // the list from pushing the card too tall.
  const isPairedLayout = accountRows.length > 3;

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
        {/* Currency breakdown: a compact list capped at five entries, the
            rest behind Show more.

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
            <PlaceholderState
              variant="no-settlements"
              size="xs"
              className="h-full justify-center py-0"
              title={isAmountMode ? "No amount settled" : "No settled transactions"}
              description="Once payments settle, this breaks the total down by the currency each one arrived in."
            />
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

                {/* Stacked, full-width rows with a hairline divider between
                  them while there are three currencies or fewer — each row's
                  extra text (native amount) needs the full width to read
                  comfortably. Past three, pairing rows two-to-a-line keeps a
                  long currency list from pushing the card too tall, with a
                  full grid of dividers (see `pairedCellClasses`) between
                  both rows and columns. */}
                <ul className={isPairedLayout ? "grid grid-cols-2" : "divide-y divide-border"}>
                  {firstFiveRows.map((row, index) => (
                    <CurrencyChip
                      key={row.accountId}
                      row={row}
                      isAmountMode={isAmountMode}
                      index={index}
                      sharePct={totalValue > 0 ? row.value / totalValue : 0}
                      className={
                        isPairedLayout ? pairedCellClasses(index, firstFiveRows.length) : undefined
                      }
                    />
                  ))}
                </ul>
              </div>
            )
          )}
        </div>

        {canExpand && (
          <>
            {/* grid-rows-[0fr]→[1fr] is a plain CSS expand: no measured
                height needed, and it animates cleanly whatever the revealed
                row count is. The card's own height (and with it Outstanding
                + Saved's matched height, see TransactionsAnalyticsCarousel)
                grows along with it rather than clipping. */}
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <ul
                className={cn(
                  "grid min-h-0 overflow-hidden",
                  isPairedLayout ? "grid-cols-2" : "divide-y divide-border"
                )}
              >
                {restRows.map((row, index) => (
                  <CurrencyChip
                    key={row.accountId}
                    row={row}
                    isAmountMode={isAmountMode}
                    index={index}
                    sharePct={totalValue > 0 ? row.value / totalValue : 0}
                    className={
                      isPairedLayout ? pairedCellClasses(index, restRows.length) : undefined
                    }
                  />
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((prev) => !prev)}
                rightIcon={
                  <Icon name={expanded ? "chevron-up" : "chevron-down"} className="h-3.5 w-3.5" />
                }
              >
                {expanded ? "Show less" : "Show more"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
