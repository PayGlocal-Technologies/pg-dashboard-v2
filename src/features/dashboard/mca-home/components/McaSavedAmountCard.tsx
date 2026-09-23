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

/** Reads the same window the value does, so the headline and caption under it
 *  can never describe different periods. */
const DURATION_HEADLINE: Record<SavedAmountDuration, string> = {
  overall: "Overall,",
  month: "This month,",
};
const DURATION_CAPTION: Record<SavedAmountDuration, string> = {
  overall: "Amount saved on transaction fees through PayGlocal.",
  month: "Saved on transaction fees this month.",
};

/**
 * Reads the same saved-amount endpoint the Transactions page's own
 * SavedAmountCard does (useSavedAmount), one query shared through react-query's
 * cache. The response carries the overall figure and a per-timeframe breakdown,
 * so the toggle switches between two figures already in hand — no refetch.
 *
 * Styled after a finance-insight card reference the user supplied: an icon
 * badge, a soft green gradient-blob background instead of a photographic
 * illustration, and a two-line "<period>, you've saved" headline. No trend
 * arrow/percentage — the saved-amount endpoint returns only a current
 * figure, no prior-period comparison, and inventing an up/down indicator
 * would claim a trend this data can't back.
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
    <Card className="relative isolate flex h-full min-h-36 w-full flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-linear-to-br from-white via-white to-emerald-50/80 p-4 dark:border-emerald-900/40 dark:from-card dark:via-card dark:to-emerald-950/30">
      {/* Soft blurred gradient blobs stand in for the reference's mesh
          background — decorative only, clipped to the card's own radius via
          the parent's `overflow-hidden`. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-emerald-200/60 blur-3xl dark:bg-emerald-500/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl dark:bg-emerald-500/10"
      />

      <div className="relative flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Icon name="piggy-bank" className="h-5 w-5" />
        </span>

        {/* Same segmented-toggle treatment as McaCurrencySplitCard's Volume/
            Count switch. The widget picker renders it pointer-events-none,
            so the preview shows the control without it being operable
            there. */}
        <div
          role="group"
          aria-label="Saved amount period"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-100 bg-white/80 p-0.5 shadow-sm backdrop-blur-sm dark:border-emerald-900/40 dark:bg-card/80"
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
                  ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative mt-3 flex flex-1 flex-col justify-center">
        <p className="text-base font-semibold leading-tight text-foreground">
          {DURATION_HEADLINE[duration]}
          <br />
          <span className="text-emerald-700 dark:text-emerald-400">you&apos;ve saved</span>
        </p>

        {isLoading ? (
          <Shimmer className="mt-1.5 h-8 w-28" />
        ) : (
          <CompactAmount
            amount={savedInr}
            currency={currency}
            className="mt-1.5 block text-[26px] font-bold tracking-tight text-foreground tabular-nums"
          />
        )}

        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {DURATION_CAPTION[duration]}
        </p>
      </div>
    </Card>
  );
}
