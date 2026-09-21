"use client";

import { useState } from "react";
import { Button, Card, Shimmer } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
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
    <Card className="relative isolate h-full min-h-56 w-full overflow-hidden p-5">
      {/* Voucher/ticket illustration — see the Transactions page's own
          SavedAmountCard for the full reasoning. Its blank left half is
          this artwork's own designated text area, so the KPI below is
          positioned into it rather than floating over the cash/sparkle
          imagery around it. */}
      <AppImage
        src="/assets/savedamount.png"
        alt=""
        fill
        sizes="(min-width: 1024px) 24rem, 100vw"
        className="-z-10 object-cover object-center"
      />

      {/* Toggle stays a full-width row at the card's own top edge — the
          voucher's blank rectangle isn't wide enough to hold a label AND a
          two-option switch beside it, and the switch reads fine sitting on
          the artwork's paler upper sky rather than needing the voucher's
          paper behind it. */}
      <div className="flex items-center justify-end gap-2">
        {/* Same segmented-toggle treatment as McaCurrencySplitCard's Volume/
            Count switch. The widget picker renders it pointer-events-none,
            so the preview shows the control without it being operable
            there. */}
        <div
          role="group"
          aria-label="Saved amount period"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card/90 p-0.5 shadow-sm backdrop-blur-sm"
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

      {/* Positioned to the voucher's own blank rectangle — see the
          Transactions page's own SavedAmountCard for how these were
          measured against the artwork. Narrower/lower and a touch more
          conservative (22%/38%/45%) than that card's own box: this one's
          min-h-56 sits inside a much wider dashboard grid column, so the
          artwork crops less top-to-bottom and more side-to-side than in
          the narrower Transactions placement, leaving less safe width
          before the caption runs into the barcode stub. */}
      <div className="absolute inset-y-0 left-[22%] top-[45%] flex w-[38%] flex-col justify-center gap-0.5 pr-1">
        <p className="text-sm font-normal text-muted-foreground">Saved amount</p>
        {isLoading ? (
          <Shimmer className="h-9 w-28" />
        ) : (
          <CompactAmount
            amount={savedInr}
            currency={currency}
            className="block text-3xl font-bold tracking-tight text-foreground tabular-nums"
          />
        )}
        <p className="text-[11px] leading-snug text-muted-foreground">
          {DURATION_CAPTION[duration]}
        </p>
      </div>
    </Card>
  );
}
