import {
  ETA_BANK_HOLIDAYS,
  type EtaCurrency,
  type EtaPaymentMode,
} from "@/features/dashboard/mca-transactions/payment-eta/constants";

/** Everything the merchant tells the form. Empty strings mean "not chosen". */
export interface EtaFormValues {
  /** YYYY-MM-DD */
  initiatedDate: string;
  currency: EtaCurrency;
  accountId: string;
  paymentMode: EtaPaymentMode | "";
}

/** Why Continue is off, derived from the values so the form and the button
 *  can never disagree. `unsupported-mode` is the one shown inline. */
export type EtaBlocker = "missing-date" | "missing-account" | "missing-mode" | "unsupported-mode";

export function etaBlocker(values: EtaFormValues): EtaBlocker | null {
  if (!values.initiatedDate) return "missing-date";
  if (!values.accountId) return "missing-account";
  if (!values.paymentMode) return "missing-mode";
  if (values.paymentMode === "other") return "unsupported-mode";
  return null;
}

/** A route the result can quote an ETA for. */
export type EtaRoute = "ach" | "fedwire";

const ROUTES: Record<EtaRoute, { label: string; maxDays: number; window: string }> = {
  ach: { label: "ACH", maxDays: 2, window: "1–2 business days" },
  fedwire: { label: "FEDWIRE", maxDays: 1, window: "1 business day" },
};

/** The routes a mode resolves to: "I don't know" quotes both. */
export function routesFor(mode: EtaPaymentMode): EtaRoute[] {
  if (mode === "ach") return ["ach"];
  if (mode === "fedwire") return ["fedwire"];
  if (mode === "unknown") return ["ach", "fedwire"];
  return [];
}

export interface EtaEstimate {
  route: EtaRoute;
  label: string;
  /** e.g. "1–2 business days" */
  window: string;
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
  kind: "sent" | "transit" | "weekend" | "holiday" | "arrives";
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
function addBusinessDays(
  startKey: string,
  businessDays: number
): {
  dateKey: string;
  holidaysSkipped: { date: string; name: string }[];
  journey: EtaJourneyDay[];
} {
  const holidays = new Map(ETA_BANK_HOLIDAYS.map((h) => [h.date, h.name]));
  const cursor = parseKey(startKey);
  const holidaysSkipped: { date: string; name: string }[] = [];
  const journey: EtaJourneyDay[] = [{ date: startKey, kind: "sent" }];
  let counted = 0;
  while (counted < businessDays) {
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
    journey.push({ date: key, kind: counted === businessDays ? "arrives" : "transit" });
  }
  return { dateKey: toKey(cursor), holidaysSkipped, journey };
}

export function estimateFor(route: EtaRoute, initiatedDate: string): EtaEstimate {
  const spec = ROUTES[route];
  const { dateKey, holidaysSkipped, journey } = addBusinessDays(initiatedDate, spec.maxDays);
  return {
    route,
    label: spec.label,
    window: spec.window,
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
