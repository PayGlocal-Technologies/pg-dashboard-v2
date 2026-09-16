"use client";

import { useState } from "react";
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
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
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
 * Neutral tones for every segment/chip after the first, cycling if there are
 * more currencies than tones. Opacity steps on `--foreground` rather than a
 * second hue: the brief calls for the smaller segments to stay "subtle,
 * using existing design-system neutrals" instead of a new colour per
 * currency, and the existing bar list already treats `--foreground` at
 * partial opacity as this app's neutral scale (its own track uses `bg-muted`
 * the same way).
 */
const SEGMENT_NEUTRAL_CLASSES = ["bg-foreground/22", "bg-foreground/13", "bg-foreground/7"];

function segmentColorClass(index: number): string | undefined {
  if (index === 0) return undefined; // gradient, applied via inline style below
  return SEGMENT_NEUTRAL_CLASSES[(index - 1) % SEGMENT_NEUTRAL_CLASSES.length];
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
}

/**
 * One segment of the single stacked distribution bar. `widthPct` is the
 * account's raw share of the total (not the rounded display percentage), so
 * segments always sum to exactly 100% regardless of how their labels round —
 * see `formatSharePct` for the display side of that split.
 *
 * `aria-hidden` on the whole bar (set by the caller): the figures it renders
 * are decorative here — CurrencyChip below states the same amount and share
 * as real text, which is what a screen reader (and, per the brief, any
 * reader relying on more than the bar's proportions) actually needs.
 */
function DistributionSegment({ index, widthPct }: { index: number; widthPct: number }) {
  const neutralClass = segmentColorClass(index);
  return (
    <div
      className={cn("h-full", neutralClass)}
      style={{
        width: `${widthPct}%`,
        ...(neutralClass ? {} : { background: "linear-gradient(90deg, var(--chart-1), var(--chart-3))" }),
      }}
    />
  );
}

/** One currency's entry in the compact breakdown grid: an accent bar tying it
 *  to its slice of the stacked bar above, flag, name + share, then the
 *  amount. A plain row rather than a bordered/filled box — boxing every
 *  entry was what read as dated and cluttered when the design was reviewed;
 *  the accent bar is what still gives each row its own identity without
 *  drawing a rectangle around it. Shared between the always-visible first
 *  five and the entries Show more reveals, so the two stay pixel-identical. */
function CurrencyChip({
  row,
  index,
  sharePct,
}: {
  row: AccountBarRowData;
  index: number;
  sharePct: number;
}) {
  const neutralClass = segmentColorClass(index);
  return (
    <li className="flex items-center gap-3 py-1">
      <span
        className={cn("h-8 w-1 shrink-0 rounded-full", neutralClass)}
        style={
          neutralClass
            ? undefined
            : { background: "linear-gradient(180deg, var(--chart-1), var(--chart-3))" }
        }
        aria-hidden="true"
      />
      <CountryFlagAvatar iso2={row.iso2} countryName={row.label} className="h-8 w-8 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {shortAccountLabel(row.label)}
        </span>
        <span className="block text-[11px] tabular-nums text-muted-foreground">
          {formatSharePct(sharePct)} of total
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {row.valueLabel}
      </span>
    </li>
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
      };
    })
    .sort((a, b) => b.value - a.value);

  // Denominator for every segment/chip's share: the sum of the SAME rows the
  // bar and grid render, not `settledValue`/`settledCount` below. Those come
  // straight off the overview endpoint and can differ from the per-account
  // total by whatever rounding or reporting-currency conversion sits between
  // the two — a mismatch here would either leave the stacked bar short of
  // 100% or push it past it. Summing the rows actually being drawn is what
  // guarantees the segments add up to the whole bar.
  const totalValue = accountRows.reduce((sum, row) => sum + row.value, 0);
  // Capped at five on every breakpoint, not just the mobile carousel: the
  // card grows to fit the rest once expanded (see the lg:h-full/grow wiring
  // in TransactionsAnalyticsCarousel, which stretches Outstanding + Saved to
  // match whatever height this card ends up at), so there's no longer a
  // "spare space at lg" case to fill with extra rows by default.
  const firstFiveRows = accountRows.slice(0, VISIBLE_COUNT);
  const restRows = accountRows.slice(VISIBLE_COUNT);
  const canExpand = restRows.length > 0;

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
                {isAmountMode ? (
                  <CompactAmount
                    amount={settledValue}
                    currency="INR"
                    className="text-3xl font-semibold tabular-nums tracking-tight text-foreground"
                  />
                ) : (
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                    {settledCount.toLocaleString("en-IN")}
                  </p>
                )}
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
        {/* Currency distribution: one stacked bar (every account, always —
            the bar does not collapse) plus a compact breakdown list capped
            at five entries, the rest behind the same Show more this card
            already used for its old one-row-per-account list. When the
            selected window has no settled accounts at all, an illustration
            stands in rather than leaving the card body blank.

            No forced minimum height on either branch any more: this card
            used to be height-matched against its left-column neighbour
            (Total settled), which was itself the source of an unrelated bug
            (switching time ranges could resize both cards dramatically —
            see TransactionsAnalyticsCarousel), so that matching was removed
            and each card now simply sizes to its own content. */}
        {!isLoading && accountRows.length === 0 ? (
          <PlaceholderState
            variant="no-settlements"
            size="sm"
            title={isAmountMode ? "No amount settled" : "No settled transactions"}
            description="Nothing has settled in this period yet."
          />
        ) : (
          accountRows.length > 0 && (
            <div className="space-y-4">
              {/* Same uppercase/tracked micro-label PaymentDetailsSection and
                  every other section heading in this feature already uses
                  (see TransactionDetailsPage), rather than the plain small
                  label this had before — one more thing that read as
                  slightly off-house-style on review. */}
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Currency distribution
              </p>

              {/* 10px tall, per the brief's "compact dashboard visualization"
                  range (8–12px). No gap/hairline between segments any more —
                  a seamless bar reads as one continuous gradient rather than
                  a row of tiles, which was part of the same "boxy" feedback
                  the chip-style breakdown below got. Purely decorative:
                  every figure it represents is restated as real text below,
                  which is what a screen reader (and per the brief, any
                  reader who needs more than relative proportions) actually
                  reads. */}
              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                {accountRows.map((row, index) => (
                  <DistributionSegment
                    key={row.accountId}
                    index={index}
                    widthPct={totalValue > 0 ? (row.value / totalValue) * 100 : 0}
                  />
                ))}
              </div>

              {/* Single column for one currency (a two-column grid would
                  leave it hugging the left half with dead space beside it);
                  two columns from sm once there is a second entry to pair it
                  with. */}
              <ul
                className={cn(
                  "grid grid-cols-1 gap-x-4",
                  accountRows.length > 1 && "sm:grid-cols-2"
                )}
              >
                {firstFiveRows.map((row, index) => (
                  <CurrencyChip
                    key={row.accountId}
                    row={row}
                    index={index}
                    sharePct={totalValue > 0 ? row.value / totalValue : 0}
                  />
                ))}
              </ul>
            </div>
          )
        )}

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
              <ul className="grid min-h-0 grid-cols-1 gap-x-4 overflow-hidden sm:grid-cols-2">
                {restRows.map((row, index) => (
                  <CurrencyChip
                    key={row.accountId}
                    row={row}
                    index={VISIBLE_COUNT + index}
                    sharePct={totalValue > 0 ? row.value / totalValue : 0}
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
