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
import { formatCurrency, formatNextSettlementDate } from "@/lib/utils/format";
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

/** One virtual account's row in the per-account graph: flag + name, a bar
 *  scaled against the ranked list's own top value, then the figure. Shared
 *  between the always-visible first five and the rows Show more reveals, so
 *  the two stay pixel-identical. */
function AccountBarRow({ row, maxValue }: { row: AccountBarRowData; maxValue: number }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      {/* w-24 below sm: as a carousel page the card is narrower than the
          viewport, and the label column, the value column, and the card's
          own padding are all fixed width, so a 144px label would leave the
          bar (the only flexible element in the row) too narrow to read as a
          bar at all. Account names are short enough to still fit, and
          truncate covers the rest. */}
      <div className="flex w-24 min-w-0 shrink-0 items-center gap-2 sm:w-36">
        <CountryFlagAvatar iso2={row.iso2} countryName={row.label} className="h-6 w-6" />
        <span className="truncate font-medium text-foreground">{row.label}</span>
      </div>
      <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${maxValue > 0 ? Math.min(100, (row.value / maxValue) * 100) : 0}%`,
            background: "linear-gradient(90deg, var(--chart-1), var(--chart-3))",
          }}
        />
      </div>
      <span className="w-16 shrink-0 text-left text-xs font-semibold tabular-nums text-foreground">
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

  const maxValue = accountRows[0]?.value ?? 0;
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
      {/* KPI (+ next settlement) on the left, Amount settled/No. of
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
              both use for their own KPI blocks. */}
          <p className="text-sm font-semibold text-foreground">
            {isAmountMode ? "Total amount collected" : "Total transactions"}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            {isLoading ? (
              <Shimmer className="h-9 w-40" />
            ) : (
              <>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  {isAmountMode
                    ? formatCurrency(settledValue, "INR", "en-IN")
                    : settledCount.toLocaleString("en-IN")}
                </p>
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
                Amount settled
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
        {/* Per-account graph, capped at five rows on every breakpoint; the rest
            sit behind Show more. When the selected window has no settled
            accounts at all, an illustration stands in for the empty bar list
            rather than leaving the card body blank. */}
        {!isLoading && accountRows.length === 0 ? (
          <PlaceholderState
            variant="no-settlements"
            size="sm"
            title={isAmountMode ? "No amount settled" : "No settled transactions"}
            description="Nothing has settled in this period yet."
            className="flex-1"
          />
        ) : (
          <ul className="space-y-3">
            {firstFiveRows.map((row) => (
              <AccountBarRow key={row.accountId} row={row} maxValue={maxValue} />
            ))}
          </ul>
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
              <ul className="min-h-0 space-y-3 overflow-hidden">
                {restRows.map((row) => (
                  <AccountBarRow key={row.accountId} row={row} maxValue={maxValue} />
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
