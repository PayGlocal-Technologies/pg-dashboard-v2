import {
  ETA_ROUTES,
  ETA_ROUTES_BY_CURRENCY,
  type EtaCurrency,
  type EtaPaymentMode,
  type EtaRoute,
} from "@/features/dashboard/mca-transactions/payment-eta/constants";

export type { EtaRoute };

/** Everything the merchant tells the form. Empty strings mean "not chosen". */
export interface EtaFormValues {
  /** YYYY-MM-DD */
  initiatedDate: string;
  /** Empty until picked. Only currencies the merchant holds an account in are
   *  offered (see useEtaCurrencies). */
  currency: EtaCurrency | "";
  accountId: string;
  paymentMode: EtaPaymentMode | "";
}

/** Why Continue is off, derived from the values so the form and the button
 *  can never disagree. `unsupported-mode` is the one shown inline. */
export type EtaBlocker =
  | "missing-date"
  | "missing-currency"
  | "missing-account"
  | "missing-mode"
  | "unsupported-mode";

export function etaBlocker(values: EtaFormValues): EtaBlocker | null {
  if (!values.initiatedDate) return "missing-date";
  if (!values.currency) return "missing-currency";
  if (!values.accountId) return "missing-account";
  if (!values.paymentMode) return "missing-mode";
  if (values.paymentMode === "other") return "unsupported-mode";
  return null;
}

/** The routes a mode resolves to, within the currency's own rails: one rail
 *  quotes just that one, "I don't know" quotes every rail the currency's
 *  account receives over, and "Others" (or a rail that isn't the currency's,
 *  which only a stale value could produce) quotes none. */
export function routesFor(mode: EtaPaymentMode, currency: EtaCurrency | ""): EtaRoute[] {
  if (!currency) return [];
  const rails = ETA_ROUTES_BY_CURRENCY[currency];
  if (mode === "unknown") return rails;
  if (mode === "other") return [];
  return rails.includes(mode) ? [mode] : [];
}

export interface EtaEstimate {
  route: EtaRoute;
  label: string;
  /** e.g. "1–2 business days" */
  window: string;
  /** Instant rail that runs every day, weekends included. */
  anyDay: boolean;
  /** YYYY-MM-DD, the latest day the payment should land. */
  expectedDate: string;
  /** Weekday bank holidays the walk stepped over, each adding a day. */
  holidaysSkipped: { date: string; name: string }[];
  /** Every day from sending to arrival, in order, for the journey track. */
  journey: EtaJourneyDay[];
}

/** One day on the way: the day it was sent, a working day in transit, a
 *  weekend or bank holiday it waits through, or the day it lands. */
export interface EtaJourneyDay {
  /** YYYY-MM-DD */
  date: string;
  /** "same-day": sent and lands on this one day (an instant rail, or a
   *  same-day rail sent on a business day). */
  kind: "sent" | "transit" | "weekend" | "holiday" | "arrives" | "same-day";
  /** Set on a holiday. */
  holidayName?: string;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function toKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Walks forward from the day after `startKey` until `businessDays` working
 * days have passed. Weekends never count; a bank holiday on a weekday is
 * skipped and recorded, since that is the "+1 day" the result explains.
 */
/** One bank holiday, YYYY-MM-DD local date. */
export interface EtaHoliday {
  date: string;
  name: string;
}

function addBusinessDays(
  startKey: string,
  businessDays: number,
  holidayList: EtaHoliday[],
  anyDay = false
): {
  dateKey: string;
  holidaysSkipped: { date: string; name: string }[];
  journey: EtaJourneyDay[];
} {
  const holidays = new Map(holidayList.map((h) => [h.date, h.name]));
  const holidaysSkipped: { date: string; name: string }[] = [];

  // Instant rails run every day: it lands the day it was sent.
  if (anyDay) {
    return { dateKey: startKey, holidaysSkipped, journey: [{ date: startKey, kind: "same-day" }] };
  }

  const isBusinessDay = (key: string): boolean => {
    const day = parseKey(key).getDay();
    return day !== 0 && day !== 6 && !holidays.has(key);
  };

  // Same-day rails: it lands the day it was sent if that is a business day,
  // otherwise on the next one, after the weekend or holiday it waits through.
  if (businessDays === 0 && isBusinessDay(startKey)) {
    return { dateKey: startKey, holidaysSkipped, journey: [{ date: startKey, kind: "same-day" }] };
  }

  const cursor = parseKey(startKey);
  const journey: EtaJourneyDay[] = [{ date: startKey, kind: "sent" }];
  // A same-day rail sent on a non-business day still needs one business day
  // to come round, so it walks like a one-day rail from here.
  const target = Math.max(1, businessDays);
  let counted = 0;
  while (counted < target) {
    cursor.setDate(cursor.getDate() + 1);
    const key = toKey(cursor);
    const day = cursor.getDay();
    if (day === 0 || day === 6) {
      journey.push({ date: key, kind: "weekend" });
      continue;
    }
    const holidayName = holidays.get(key);
    if (holidayName) {
      holidaysSkipped.push({ date: key, name: holidayName });
      journey.push({ date: key, kind: "holiday", holidayName });
      continue;
    }
    counted += 1;
    journey.push({ date: key, kind: counted === target ? "arrives" : "transit" });
  }
  return { dateKey: toKey(cursor), holidaysSkipped, journey };
}

/** `holidays`: the payment currency's bank holidays around `initiatedDate`,
 *  from the live calendar (see useEtaHolidays). Instant rails ignore them. */
export function estimateFor(
  route: EtaRoute,
  initiatedDate: string,
  holidays: EtaHoliday[]
): EtaEstimate {
  const spec = ETA_ROUTES[route];
  const anyDay = !!spec.anyDay;
  const { dateKey, holidaysSkipped, journey } = addBusinessDays(
    initiatedDate,
    spec.maxDays,
    holidays,
    anyDay
  );
  return {
    route,
    label: spec.label,
    window: spec.window,
    anyDay,
    expectedDate: dateKey,
    holidaysSkipped,
    journey,
  };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

/** "28th September" */
export function formatDayMonth(key: string): string {
  const date = parseKey(key);
  return `${ordinal(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Monday, 28 September 2026", the result's headline date. */
export function formatLongDate(key: string): string {
  const date = parseKey(key);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** { weekday: "Mon", day: "28 Sep" }, one column of the journey track. */
export function formatTrackDay(key: string): { weekday: string; day: string } {
  const date = parseKey(key);
  return {
    weekday: WEEKDAYS[date.getDay()]!.slice(0, 3),
    day: `${date.getDate()} ${MONTHS[date.getMonth()]!.slice(0, 3)}`,
  };
}

/** Where the payment should be now, against today. */
export type EtaStatus = "on-the-way" | "arriving-today" | "overdue";

export function etaStatus(expectedDate: string, todayKey: string): EtaStatus {
  // YYYY-MM-DD keys sort as dates, so a plain comparison is enough.
  if (expectedDate < todayKey) return "overdue";
  if (expectedDate === todayKey) return "arriving-today";
  return "on-the-way";
}

export function todayDateKey(): string {
  return toKey(new Date());
}
