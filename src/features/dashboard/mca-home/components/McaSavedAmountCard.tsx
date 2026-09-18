"use client";

import { useState } from "react";
import { Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CompactAmount } from "@/components/common/CompactAmount";
import { useSavedAmount } from "@/features/dashboard/mca-transactions/hooks";

/**
 * The two windows this card shows. "overall" reads the endpoint's overallAmount;
 * "month" indexes the per-timeframe breakdown. "overall" leads and is the
 * default, matching production's Amount Saved card.
 */
const SAVED_AMOUNT_DURATIONS = [
  { value: "overall", label: "Overall" },
  { value: "month", label: "This month" },
] as const;

type SavedAmountDuration = (typeof SAVED_AMOUNT_DURATIONS)[number]["value"];

/** Reads the same window the value does, so the figure and the sentence under it
 *  can never describe different periods. */
const DURATION_CAPTION: Record<SavedAmountDuration, string> = {
  overall: "Amount saved on transaction fees through PayGlocal.",
  month: "Saved on transaction fees this month.",
};

/**
 * Reads the same saved-amount endpoint the Transactions page's own
 * SavedAmountCard does (useSavedAmount), one query shared through react-query's
 * cache. The response carries the overall figure and a per-timeframe breakdown,
 * so the toggle switches between two figures already in hand — no refetch.
 */
export function McaSavedAmountCard() {
  const { saved, isLoading } = useSavedAmount();
  const [duration, setDuration] = useState<SavedAmountDuration>("overall");
  const savedInr =
    duration === "overall"
      ? (saved?.overallAmount ?? 0)
      : (saved?.timeframes.find((t) => t.timeframe === duration)?.amount ?? 0);
  const currency = saved?.currency ?? "INR";

  return (
    <Card className="h-full gap-3 p-5">
      {/* Icon left, toggle right: the same top-row split OutstandingAmountCard
          uses for its icon and pending chip, rather than a second row. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
          <Icon
            name="piggy-bank"
            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
        </div>
        {/* Same segmented-toggle treatment as McaCurrencySplitCard's Volume /
            Count switch, one step tighter because this card is a third the
            width. The widget picker renders it pointer-events-none, so the
            preview shows the control without it being operable there. */}
        <div
          role="group"
          aria-label="Saved amount period"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5"
        >
          {SAVED_AMOUNT_DURATIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={duration === opt.value}
              onClick={() => setDuration(opt.value)}
              className={cn(
                "h-auto min-h-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium",
                duration === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">Saved amount</p>
        {isLoading ? (
          <Shimmer className="mt-1 h-8 w-32" />
        ) : (
          <CompactAmount
            amount={savedInr}
            currency={currency}
            className="mt-1 block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{DURATION_CAPTION[duration]}</p>
    </Card>
  );
}
