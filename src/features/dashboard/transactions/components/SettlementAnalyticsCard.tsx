"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import {
  SETTLEMENT_ANALYTICS_BY_ACCOUNT,
  SETTLEMENT_ANALYTICS_TOTALS,
} from "@/features/dashboard/transactions/mock-data";

type AnalyticsMode = "amount" | "count";

// Matches the reference: five rows visible by default, the rest behind
// Show more.
const VISIBLE_COUNT = 5;

/** Shared with OutstandingAmountCard so both cards format USD figures identically. */
export function formatUsdShort(value: number): string {
  return value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value}`;
}

/**
 * Settlement analytics card for the Transactions page: a KPI (top-left) and
 * an Amount settled/Transactions toggle (top-right, same row), then a ranked
 * horizontal bar per virtual account, directly below with no divider between
 * them. A single accent
 * gradient (chart-1 to chart-3, the same pair flux-ui's own
 * RankedBarListTemplate uses) fills every bar regardless of rank: this is
 * one series (settled volume) ranked by account, not eight distinct
 * categories, so color stays uniform and the account label alone carries
 * identity.
 */
export function SettlementAnalyticsCard() {
  const [mode, setMode] = useState<AnalyticsMode>("amount");
  const [expanded, setExpanded] = useState(false);
  const isAmountMode = mode === "amount";

  const rows = SETTLEMENT_ANALYTICS_BY_ACCOUNT.map((entry) => {
    const account = MOCK_VIRTUAL_ACCOUNTS.find((a) => a.id === entry.accountId);
    const value = isAmountMode ? entry.settledUsd : entry.transactionCount;
    return {
      accountId: entry.accountId,
      label: account?.accountName ?? entry.accountId,
      iso2: account?.iso2 ?? "",
      value,
      valueLabel: isAmountMode ? formatUsdShort(value) : value.toLocaleString("en-US"),
    };
  }).sort((a, b) => b.value - a.value);

  const maxValue = rows[0]?.value ?? 0;
  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_COUNT);
  const canExpand = rows.length > VISIBLE_COUNT;

  return (
    <Card size="sm" className="w-full">
      {/* KPI and the mode toggle: below sm, CardHeader's own two-row grid
          (no CardAction child here, so its has-data-[slot=card-action]
          column split never triggers) stacks them, toggle after the amount,
          matching the mobile reference. At sm and up, grid-cols-[1fr_auto]
          puts the toggle back beside the KPI as before. */}
      <CardHeader className="sm:grid-cols-[1fr_auto]">
        <div>
          {/* Label belongs to the KPI beneath it, not the other way round:
              it introduces the number rather than captioning it after the
              fact, the same order OutstandingAmountCard and SavedAmountCard
              both use for their own KPI blocks. */}
          <p className="text-sm font-semibold text-foreground">
            {isAmountMode ? "Total settled amount" : "Total transactions"}
          </p>
          {/* items-baseline (not center) so the much smaller INR figure
              sits on the same text baseline as the big number beside it,
              rather than looking vertically adrift against it. */}
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {isAmountMode
                ? SETTLEMENT_ANALYTICS_TOTALS.settledUsdLabel
                : SETTLEMENT_ANALYTICS_TOTALS.transactionCountLabel}
            </p>
            {/* Tertiary, amount mode only: a transaction count has no
                currency to convert. */}
            {isAmountMode && (
              <p className="text-sm tabular-nums text-muted-foreground">
                {SETTLEMENT_ANALYTICS_TOTALS.settledInrLabel}
              </p>
            )}
          </div>
        </div>
        <div className="sm:justify-self-end">
          <Tabs value={mode} onValueChange={(v) => setMode(v as AnalyticsMode)}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="amount" className="flex-1 sm:flex-initial">
                Amount settled
              </TabsTrigger>
              <TabsTrigger value="count" className="flex-1 sm:flex-initial">
                No. of transactions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        {/* Supporting tier: kept visually restrained (thin h-2 tracks, small
            text) so the KPI above stays the strongest element on the card. */}
        <ul className="space-y-3">
          {visibleRows.map((row) => (
            <li key={row.accountId} className="flex items-center gap-3 text-sm">
              <div className="flex w-36 min-w-0 shrink-0 items-center gap-2">
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
          ))}
        </ul>

        {/* Utility tier: only present once there's something to reveal. */}
        {canExpand && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((prev) => !prev)}
              rightIcon={<Icon name={expanded ? "chevron-up" : "chevron-down"} className="h-3.5 w-3.5" />}
            >
              {expanded ? "Show less" : "Show more"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
