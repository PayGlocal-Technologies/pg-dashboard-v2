"use client";

import { Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CompactAmount } from "@/components/common/CompactAmount";
import { useSavedAmount } from "@/features/dashboard/mca-transactions/hooks";

/**
 * Reads the same saved-amount endpoint the Transactions page's own
 * SavedAmountCard does (useSavedAmount) — just the overall figure now; the
 * Overall/This month toggle this card used to carry was dropped per explicit
 * ask, so there's no second window left to switch to.
 *
 * Styled after a finance-insight card reference the user supplied: an icon
 * badge, a soft green gradient-blob background instead of a photographic
 * illustration, and a two-line "Overall, you've saved" headline.
 *
 * BACKEND GAP: the design puts a trend chip ("+12.4%") beside the amount,
 * inside the same `flex items-baseline gap-2` row below. The saved-amount
 * endpoint returns only a current figure, with no prior period to compute a
 * trend from, so the chip is left out until it carries one rather than
 * showing a made-up percentage.
 */

export function McaSavedAmountCard() {
  const { saved, isLoading } = useSavedAmount();
  const savedInr = saved?.overallAmount ?? 0;
  const currency = saved?.currency ?? "INR";

  return (
    <Card className="relative isolate flex h-full min-h-36 w-full flex-col overflow-hidden rounded-xl border border-emerald-100 bg-linear-to-br from-white via-white to-emerald-50/80 p-4 dark:border-emerald-900/40 dark:from-card dark:via-card dark:to-emerald-950/30">
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

      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        <Icon name="piggy-bank" className="h-5 w-5" />
      </span>

      <div className="relative mt-3 flex flex-1 flex-col justify-center">
        <p className="text-base font-semibold leading-tight text-foreground">
          Overall,
          <br />
          <span className="text-emerald-700 dark:text-emerald-400">you&apos;ve saved</span>
        </p>

        {isLoading ? (
          <Shimmer className="mt-1.5 h-8 w-28" />
        ) : (
          <div className="mt-1.5 flex items-baseline gap-2">
            <CompactAmount
              amount={savedInr}
              currency={currency}
              className="block text-[26px] font-bold tracking-tight text-foreground tabular-nums"
            />
          </div>
        )}

        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Amount saved on transaction fees through PayGlocal.
        </p>
      </div>
    </Card>
  );
}
