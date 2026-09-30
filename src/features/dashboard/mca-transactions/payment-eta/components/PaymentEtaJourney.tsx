"use client";

import { cn } from "@/lib/utils";
import {
  formatTrackDay,
  type EtaJourneyDay,
} from "@/features/dashboard/mca-transactions/payment-eta/eta";

const KIND_LABEL: Record<EtaJourneyDay["kind"], string> = {
  sent: "Sent",
  transit: "In transit",
  weekend: "Weekend",
  holiday: "Bank holiday",
  arrives: "Arrives",
};

/** The dot for each kind of day. Days the payment waits through (weekends,
 *  holidays) are drawn smaller and off-brand, so the working days read as
 *  the path. */
const NODE_CLASS: Record<EtaJourneyDay["kind"], string> = {
  sent: "h-2.5 w-2.5 bg-primary",
  transit: "h-2.5 w-2.5 border-2 border-primary bg-card",
  weekend: "h-2 w-2 bg-muted-foreground/30",
  holiday: "h-2.5 w-2.5 bg-amber-500 ring-4 ring-amber-500/15",
  arrives: "h-3.5 w-3.5 bg-primary ring-4 ring-primary/15",
};

/**
 * Day by day from the day the client sent it to the day it lands: one column
 * per calendar day, joined by a line. Makes the estimate explain itself: a
 * weekend or a bank holiday in the way is right there on the track, rather
 * than folded into a number of business days.
 */
export function PaymentEtaJourney({ days }: { days: EtaJourneyDay[] }) {
  const columns = days.length;

  return (
    <ol
      aria-label="Payment journey"
      className="relative grid"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {/* The line runs between the first and last dots' centres, under them.
          top-10: the 32px date block plus half the 16px dot row. */}
      <span
        aria-hidden
        className="absolute top-10 h-px -translate-y-1/2 bg-border"
        style={{ left: `${50 / columns}%`, right: `${50 / columns}%` }}
      />
      {days.map((day) => {
        const { weekday, day: dayLabel } = formatTrackDay(day.date);
        const isEnd = day.kind === "sent" || day.kind === "arrives";
        return (
          <li
            key={day.date}
            className="relative flex flex-col items-center text-center"
            title={day.holidayName}
          >
            <span className="flex h-8 flex-col justify-center text-[11px] leading-4">
              <span className="text-muted-foreground">{weekday}</span>
              <span
                className={cn(
                  "tabular-nums",
                  isEnd ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {dayLabel}
              </span>
            </span>
            <span className="flex h-4 items-center justify-center">
              <span className={cn("rounded-full", NODE_CLASS[day.kind])} aria-hidden />
            </span>
            <span
              className={cn(
                "mt-1.5 px-1 text-[11px] leading-tight",
                day.kind === "arrives" && "font-semibold text-primary",
                day.kind === "sent" && "font-medium text-foreground",
                day.kind === "holiday" && "font-medium text-amber-700 dark:text-amber-400",
                (day.kind === "transit" || day.kind === "weekend") && "text-muted-foreground"
              )}
            >
              {KIND_LABEL[day.kind]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
