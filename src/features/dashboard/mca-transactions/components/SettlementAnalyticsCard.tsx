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
import { formatCurrency, formatNextSettlementDate } from "@/lib/utils/format";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import { SETTLEMENT_ANALYTICS_BY_ACCOUNT } from "@/features/dashboard/mca-transactions/mock-data";
import { toMetricNumber, useMcaOverview } from "@/features/dashboard/mca-transactions/hooks";

type AnalyticsMode = "amount" | "count";

/** The whole Analytics section's time-range values, driving both this
 *  card's own time-range tabs and SavedAmountCard's approximated figure
 *  (see TransactionsAnalyticsCarousel, which owns the shared state). */
export type TimeRange = "year" | "month" | "week" | "today";

/** Order and labels match the reference: Today, then widening windows up to
 *  Year. */
export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "Year" },
];

// SETTLEMENT_ANALYTICS_BY_ACCOUNT is a full year's placeholder figures; every
// other range scales it down by how much of a year it covers, rather than a
// second hand-authored dataset per range. This only affects the per-account
// bars below, which are already placeholder data pending a real endpoint (see
// mock-data.ts's own TODO). The KPI above comes from the live
// business-overview endpoint, which has no period parameter today, so the
// time range can't drive it without a real API change. Nothing else on the
// Analytics section is wired to this multiplier either (an earlier round
// briefly scaled SavedAmountCard's real figure by it, then reverted that at
// the design's request): every live KPI here stays the same regardless of
// the selected range, on purpose, rather than showing an approximated number
// with no real period behind it.
export const TIME_RANGE_MULTIPLIERS: Record<TimeRange, number> = {
  year: 1,
  month: 1 / 12,
  week: 1 / 52,
  today: 1 / 365,
};

/**
 * Settlement analytics for the Transactions page: a headline KPI beside the
 * Today/This week/This month/Year time-range tabs, over the amount/count
 * toggle and a ranked per-account bar list.
 *
 * timeRange is lifted to TransactionsAnalyticsCarousel rather than owned
 * locally, so the state stays in one place even though this is currently its
 * only consumer. The KPI itself never reacts to it, only the per-account
 * bars below do (see TIME_RANGE_MULTIPLIERS' own comment).
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
  onTimeRangeChange,
}: {
  className?: string;
  /** Lifted to TransactionsAnalyticsCarousel; see this module's own doc
   *  comment for why. */
  timeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;
}) {
  const [mode, setMode] = useState<AnalyticsMode>("amount");
  const [expanded, setExpanded] = useState(false);
  const isAmountMode = mode === "amount";
  const { overview, isLoading } = useMcaOverview();

  const rangeMultiplier = TIME_RANGE_MULTIPLIERS[timeRange];

  const accountRows = SETTLEMENT_ANALYTICS_BY_ACCOUNT.map((entry) => {
    const account = MOCK_VIRTUAL_ACCOUNTS.find((a) => a.id === entry.accountId);
    const value = Math.round(
      (isAmountMode ? entry.settledUsd : entry.transactionCount) * rangeMultiplier
    );
    return {
      accountId: entry.accountId,
      label: account?.accountName ?? entry.accountId,
      iso2: account?.iso2 ?? "",
      value,
      valueLabel: isAmountMode
        ? value >= 1000
          ? `$${(value / 1000).toFixed(1)}K`
          : `$${value}`
        : value.toLocaleString("en-US"),
    };
  }).sort((a, b) => b.value - a.value);

  const maxValue = accountRows[0]?.value ?? 0;
  // Capped at five on every breakpoint, not just the mobile carousel: the
  // card grows to fit the rest once expanded (see the lg:h-full/grow wiring
  // in TransactionsAnalyticsCarousel, which stretches Outstanding + Saved to
  // match whatever height this card ends up at), so there's no longer a
  // "spare space at lg" case to fill with extra rows by default.
  const firstFiveRows = accountRows.slice(0, VISIBLE_COUNT);
  const restRows = accountRows.slice(VISIBLE_COUNT);
  const canExpand = restRows.length > 0;

  const settledValue = toMetricNumber(overview?.successfulPayments?.value);
  const settledCount = toMetricNumber(overview?.successfulPayments?.count);

  // Last settled used to sit beside this as its own row; removed at the
  // design's request rather than replaced, so this is the only date shown
  // now. Omitted, not shown as a placeholder, when the backend has no date.
  const nextSettlementLabel = overview?.nextSettlementDate
    ? `Next settlement${overview?.isTodayHoliday ? " (bank holiday)" : ""}: ${formatNextSettlementDate(overview.nextSettlementDate)}`
    : null;

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* KPI (+ next settlement) on the left, the Today/This week/This
          month/Year tabs on the right: stacked below sm (CardHeader's own
          default is two auto rows, so with no column override the tabs just
          fall onto their own row under the KPI, full width via the Tabs
          classes below), side by side from sm up. */}
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:gap-0">
        <div>
          {/* Label belongs to the KPI beneath it, not the other way round:
              it introduces the number rather than captioning it after the
              fact, the same order OutstandingAmountCard and SavedAmountCard
              both use for their own KPI blocks. */}
          <p className="text-sm font-semibold text-foreground">
            {isAmountMode ? "Total settled amount" : "Total transactions"}
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

        {/* Same segmented-pill Tabs styling as the Amount settled/No. of
            transactions toggle below (w-full/flex-1 triggers, no custom
            overrides): this is the slot that toggle used to occupy, and the
            instruction was to match it exactly rather than introduce a
            second visual treatment. */}
        <div className="sm:justify-self-end">
          <Tabs value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRange)}>
            <TabsList className="w-full">
              {TIME_RANGE_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="flex-1">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      {/* flex-1: when className carries h-full (see TransactionsAnalyticsCarousel,
          which stretches this card to match the grid row's height at lg and
          up), CardHeader keeps its own intrinsic height and this region
          absorbs whatever's left. */}
      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Amount settled/No. of transactions: directly below the KPI,
            unchanged styling/behaviour from before, just relocated out of
            the header (which now carries the time-range tabs instead). */}
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

        {/* Per-account graph. Still placeholder-fed, see the module comment
            above and mock-data.ts's TODO. Capped at five rows on every
            breakpoint; the rest sit behind Show more. */}
        <ul className="space-y-3">
          {firstFiveRows.map((row) => (
            <AccountBarRow key={row.accountId} row={row} maxValue={maxValue} />
          ))}
        </ul>

        {canExpand && (
          // gap-2 here, tighter than the gap-3 CardContent uses everywhere
          // else, so Show more sits closer to the rows it reveals than the
          // spacing between this card's other sections.
          <div className="flex flex-col gap-2">
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
              {/* variant="link" reads as plain text, not a button (no
                  background/border/shadow), same treatment
                  buildSettlementTimeline.tsx's RejectionReason already uses
                  for its own Show more/less. */}
              <Button
                type="button"
                variant="link"
                onClick={() => setExpanded((prev) => !prev)}
                className="h-auto min-h-0 px-0 py-0 text-[12px] font-normal"
                rightIcon={
                  <Icon name={expanded ? "chevron-up" : "chevron-down"} className="h-3.5 w-3.5" />
                }
              >
                {expanded ? "Show less" : "Show more"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
