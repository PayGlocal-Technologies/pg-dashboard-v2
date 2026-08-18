"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatTransactionDateOnly } from "@/lib/utils/format";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import { SETTLEMENT_ANALYTICS_BY_ACCOUNT } from "@/features/dashboard/mca-transactions/mock-data";
import { toMetricNumber, useMcaOverview } from "@/features/dashboard/mca-transactions/hooks";

type AnalyticsMode = "amount" | "count";
type TimeRange = "year" | "month" | "week" | "today";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "today", label: "Today" },
];

// SETTLEMENT_ANALYTICS_BY_ACCOUNT is a full year's placeholder figures; every
// other range scales it down by how much of a year it covers, rather than a
// second hand-authored dataset per range. This only affects the per-account
// bars below, which are already placeholder data pending a real endpoint (see
// mock-data.ts's own TODO). The KPI and supporting rows above come from the
// live business-overview endpoint, which has no period parameter today, so
// the time range can't drive them without a real API change.
const TIME_RANGE_MULTIPLIERS: Record<TimeRange, number> = {
  year: 1,
  month: 1 / 12,
  week: 1 / 52,
  today: 1 / 365,
};

/**
 * Settlement analytics for the Transactions page: a headline KPI with an
 * amount/count toggle, over a short list of supporting settlement figures.
 *
 * The KPI and the supporting settlement figures come from the MCA
 * business-overview endpoint (see useMcaOverview). The ranked per-account bar
 * list below them does not: that endpoint reports whole-account totals only,
 * with no per-virtual-account breakdown, so those bars still render against
 * SETTLEMENT_ANALYTICS_BY_ACCOUNT's placeholder figures pending a real
 * per-account endpoint. See that module's own TODO.
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
      <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
        {row.valueLabel}
      </span>
    </li>
  );
}

export function SettlementAnalyticsCard({ className }: { className?: string }) {
  const [mode, setMode] = useState<AnalyticsMode>("amount");
  const [timeRange, setTimeRange] = useState<TimeRange>("year");
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

  const previous = overview?.previous_settlement_data;

  // Only rows the response actually carries a figure for are rendered; a
  // metric the backend omits is left out rather than shown as a zero.
  // Settlements due and funds on hold used to sit in this list too, but now
  // that they're each their own card (Outstanding/Saved's stack beside this
  // one), showing them here as well would be the same figures twice, so this
  // card stays scoped to settlement-timing information instead.
  const supportingRows = [
    {
      key: "next-settlement",
      label: overview?.isTodayHoliday ? "Next settlement (bank holiday)" : "Next settlement",
      value: overview?.nextSettlementDate
        ? formatTransactionDateOnly(overview.nextSettlementDate)
        : null,
    },
    {
      key: "previous-settlement",
      label: previous?.previousSettlementDate
        ? `Last settled · ${formatTransactionDateOnly(previous.previousSettlementDate)}`
        : "Last settled",
      value: previous?.previousSettlementValue
        ? formatCurrency(toMetricNumber(previous.previousSettlementValue), "INR", "en-IN")
        : null,
    },
  ].filter((row) => row.value !== null);

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* KPI on the left, the Year/Month/Week/Today time-range control on the
          right, same row at every width: the control is compact at both its
          mobile (Select) and desktop/tablet (Tabs) sizes, so unlike the old
          Amount settled/Transactions toggle this replaces here, it never
          needs to drop to its own row below sm. */}
      <CardHeader className="grid-cols-[1fr_auto] gap-0">
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
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {isAmountMode
                  ? formatCurrency(settledValue, "INR", "en-IN")
                  : settledCount.toLocaleString("en-IN")}
              </p>
            )}
          </div>
        </div>

        {/* Time-range control: Tabs (hidden below md) on desktop/tablet,
            Select (hidden md and up) on mobile. Both drive the same
            timeRange state, so switching viewport width mid-session never
            desyncs which one "wins". Only the placeholder per-account bars
            below actually redraw against it, see TIME_RANGE_MULTIPLIERS' own
            comment on why the live KPI above can't yet. */}
        <div className="justify-self-end">
          <Tabs
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as TimeRange)}
            className="hidden md:block"
          >
            <TabsList>
              {TIME_RANGE_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-28 md:hidden" aria-label="Time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      {/* flex-1: when className carries h-full (see TransactionsAnalyticsCarousel,
          which stretches this card to match the grid row's height at lg and
          up), CardHeader keeps its own intrinsic height and this region
          absorbs whatever's left.

          gap-6 between the info group and the switcher+graph block below it:
          the same size gap Card itself already puts between CardHeader and
          CardContent (see card.tsx's size="sm" gap-6), so the switcher/graph
          pair reads as clearly apart from the info group above, not squeezed
          against it. */}
      <CardContent className="flex flex-1 flex-col gap-6">
        {/* Virtual account information: kept visually restrained so the KPI
            in the header stays the strongest element on the card. */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Shimmer className="h-3.5 w-32" />
                <Shimmer className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        ) : supportingRows.length > 0 ? (
          <ul className="space-y-3">
            {supportingRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">{row.label}</span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Amount settled/No. of transactions, directly above the graph it
            controls, and the graph itself: gap-3 throughout so that
            relationship reads as obviously connected, distinct from the
            gap-6 above that separates this whole block from the info group. */}
        <div className="flex flex-1 flex-col gap-3">
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

          {/* Per-account graph. Still placeholder-fed, see the module
              comment above and mock-data.ts's TODO. Capped at five rows on
              every breakpoint; the rest sit behind Show more. */}
          <ul className="space-y-3">
            {firstFiveRows.map((row) => (
              <AccountBarRow key={row.accountId} row={row} maxValue={maxValue} />
            ))}
          </ul>

          {canExpand && (
            <>
              {/* grid-rows-[0fr]→[1fr] is a plain CSS expand: no measured
                  height needed, and it animates cleanly whatever the
                  revealed row count is. The card's own height (and with it
                  Outstanding + Saved's matched height, see
                  TransactionsAnalyticsCarousel) grows along with it rather
                  than clipping. */}
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
                    <Icon
                      name={expanded ? "chevron-up" : "chevron-down"}
                      className="h-3.5 w-3.5"
                    />
                  }
                >
                  {expanded ? "Show less" : "Show more"}
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
