"use client";

import { Button, Separator, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PaymentEtaSummary } from "@/features/dashboard/mca-transactions/payment-eta/components/PaymentEtaSummary";
import { PaymentEtaJourney } from "@/features/dashboard/mca-transactions/payment-eta/components/PaymentEtaJourney";
import { PaymentEtaTooltip } from "@/features/dashboard/mca-transactions/payment-eta/components/PaymentEtaTooltip";
import { ETA_SUPPORT_EMAIL } from "@/features/dashboard/mca-transactions/payment-eta/constants";
import {
  useEtaAccounts,
  useEtaHolidays,
} from "@/features/dashboard/mca-transactions/payment-eta/hooks";
import {
  estimateFor,
  etaStatus,
  formatDayMonth,
  formatLongDate,
  formatTrackDay,
  routesFor,
  type EtaEstimate,
  type EtaFormValues,
  type EtaStatus,
} from "@/features/dashboard/mca-transactions/payment-eta/eta";

const STATUS_BADGE: Record<EtaStatus, { variant: "info" | "warning"; label: string }> = {
  "on-the-way": { variant: "info", label: "On its way" },
  "arriving-today": { variant: "info", label: "Arriving today" },
  overdue: { variant: "warning", label: "Should have arrived" },
};

/**
 * The estimate, led by the date itself: a status chip for where the payment
 * should be now, the expected date as the headline, and the day-by-day track
 * underneath that shows why (weekends and bank holidays it waits through).
 * "I don't know" stacks one estimate per route, one below the other. The
 * footer asks for the receipt once every expected date has passed.
 */
/** One route's estimate: where it should be now, the date, and the track. */
function RouteEstimate({ estimate, todayKey }: { estimate: EtaEstimate; todayKey: string }) {
  const status = etaStatus(estimate.expectedDate, todayKey);
  const badge = STATUS_BADGE[status];
  const extraDays = estimate.holidaysSkipped.length;
  const holidayTooltip = estimate.holidaysSkipped
    .map((h) => `Bank holiday on ${formatDayMonth(h.date)}, due to ${h.name}`)
    .join(". ");

  return (
    <section className="rounded-2xl border border-border p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge variant={badge.variant} label={badge.label} size="sm" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {estimate.label}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <p className="text-xs text-muted-foreground">Expected in your PayGlocal account by</p>
        <PaymentEtaTooltip
          label="About this estimate"
          content="An estimate from the details you shared. Actual timing depends on your client's bank."
        />
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
        {status === "arriving-today"
          ? "Today, by end of day"
          : formatLongDate(estimate.expectedDate)}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        via <span className="font-medium text-foreground">{estimate.label}</span> · usually{" "}
        {estimate.window}
        {estimate.anyDay ? ", any day" : ", Mon–Fri"}
      </p>

      <Separator className="my-5" />

      <PaymentEtaJourney days={estimate.journey} />

      {extraDays > 0 && (
        <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
          Includes +{extraDays} {extraDays === 1 ? "day" : "days"} due to bank holiday
          <PaymentEtaTooltip label="About the bank holiday" content={holidayTooltip} />
        </p>
      )}
    </section>
  );
}

export function PaymentEtaResult({
  values,
  todayKey,
  onDone,
}: {
  values: EtaFormValues;
  todayKey: string;
  onDone: () => void;
}) {
  const mode = values.paymentMode || "unknown";
  // The form only lets a complete set through (etaBlocker), so a currency is set.
  const currency = values.currency || "USD";
  // That currency's live bank holidays around the sent date.
  const {
    holidays,
    isLoading: isHolidaysLoading,
    isError: isHolidaysError,
  } = useEtaHolidays(currency, values.initiatedDate);
  // Only the chosen currency's own rails: "I don't know" quotes each of them.
  const estimates = routesFor(mode, values.currency).map((route) =>
    estimateFor(route, values.initiatedDate, holidays)
  );
  const allOverdue =
    estimates.length > 0 &&
    estimates.every((e) => etaStatus(e.expectedDate, todayKey) === "overdue");

  // Same cached list the form picked from (same query key), so no new request.
  const { accounts } = useEtaAccounts(values.currency);
  const account = accounts.find((a) => a.id === values.accountId);
  const sent = formatTrackDay(values.initiatedDate);
  const summary = [values.currency, account?.accountType, `Sent ${sent.weekday}, ${sent.day}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 sm:px-8">
        <PaymentEtaSummary text={summary} />

        {/* No estimate until the holidays are in: a date computed without them
            could move once they arrive. */}
        {isHolidaysLoading ? (
          estimates.map((estimate) => (
            <Shimmer key={estimate.route} className="h-56 w-full rounded-2xl" />
          ))
        ) : (
          <>
            {isHolidaysError && (
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Icon name="alert-circle" size={14} className="mt-0.5 shrink-0" aria-hidden />
                We couldn&apos;t check bank holidays, so this estimate counts weekends only.
              </p>
            )}
            {estimates.map((estimate) => (
              <RouteEstimate key={estimate.route} estimate={estimate} todayKey={todayKey} />
            ))}
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {allOverdue ? (
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
            <Icon name="mail" size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Not in your account yet? Send the payment receipt to{" "}
              <a
                href={`mailto:${ETA_SUPPORT_EMAIL}`}
                className="font-medium text-primary underline underline-offset-2"
              >
                {ETA_SUPPORT_EMAIL}
              </a>
            </span>
          </p>
        ) : (
          <span aria-hidden />
        )}
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onDone}
          className="self-end px-5 sm:self-auto"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
