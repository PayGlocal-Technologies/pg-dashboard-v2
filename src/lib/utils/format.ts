// The app's month and day names, spelled out rather than read from Intl.
//
// Every date this app renders is built from these four tables, and none of them
// go through toLocaleDateString. That is deliberate: Intl output varies with the
// reader's locale and timezone, so a server-rendered date and the client's
// rehydration of it can disagree and trigger a hydration mismatch. Fixed English
// strings render identically in both places.
//
// Exported because features kept declaring their own copies (the settlement
// calendar had a second month table and a second weekday table of its own) and
// then drifting — abbreviate one list differently and two screens disagree about
// what August is called.

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTHS_LONG = [
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
] as const;

export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const DAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** 1st/2nd/3rd/4th..., with the 11th-13th exception. */
function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  // Major Global Currencies
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
  CHF: "CHF",
  HKD: "HK$",
  SEK: "kr",
  // Additional Major Currencies
  KRW: "₩",
  SGD: "S$",
  NOK: "kr",
  NZD: "NZ$",
  MXN: "Mex$",
  TWD: "NT$",
  ZAR: "R",
  BRL: "R$",
  DKK: "kr",
  // European Currencies
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RON: "lei",
  BGN: "лв",
  HRK: "kn",
  RSD: "дин",
  UAH: "₴",
  BYN: "Br",
  ALL: "L",
  // Middle Eastern Currencies
  // Latin code rather than the د.إ glyph: the dashboard is LTR throughout, and
  // the RTL mark reorders badly against the Latin digits it prefixes. Also
  // affects the AED figures on Multi-Currency and Transactions.
  AED: "AED ",
  SAR: "﷼",
  BHD: ".د.ب",
  QAR: "﷼",
  OMR: "﷼",
  KWD: "د.ك",
  JOD: "د.أ",
  ILS: "₪",
  IRR: "﷼",
  EGP: "£",
  // Asian Currencies
  THB: "฿",
  IDR: "Rp",
  PHP: "₱",
  MYR: "RM",
  VND: "₫",
  PKR: "₨",
  BDT: "৳",
  LKR: "රු",
  NPR: "₨",
  KZT: "₸",
  // Latin American Currencies
  ARS: "ARS$",
  CLP: "CLP$",
  COP: "COL$",
  PEN: "S/",
  UYU: "$U",
  PYG: "₲",
  BOB: "Bs",
  CRC: "₡",
  DOP: "RD$",
  GTQ: "Q",
  // African Currencies
  NGN: "₦",
  KES: "KSh",
  ETB: "Br",
  GHS: "GH₵",
  MAD: "د.م.",
  TZS: "TSh",
  UGX: "USh",
  XAF: "FCFA",
  XOF: "CFA",
  ZMW: "ZK",
  // Other Currencies
  RUB: "₽",
  TRY: "₺",
  ISK: "kr",
  FJD: "FJ$",
  JMD: "J$",
  BSD: "B$",
  BBD: "Bds$",
  BZD: "BZ$",
  BMD: "BD$",
  KYD: "CI$",
  // Not an ISO code: the Rest of the World virtual account is dollar-
  // denominated but needs a currency value distinct from the US account's
  // "USD" (see multi-currency/mock-data.ts), and this is what keeps its
  // amounts rendering with a real symbol rather than the word falling through
  // as its own prefix.
  Dollar: "$",
  // The real accounts endpoint's SWIFT catch-all bucket, renamed "GLOBAL" for
  // display (see multi-currency/mapAccounts.ts) — the live counterpart to
  // "Dollar" above. Without this entry the Rest of the World account's
  // settled-amount figure fell back to showing "GLOBAL" itself as the
  // fallback prefix instead of a real symbol.
  GLOBAL: "$",
};

/**
 * The bare symbol for a currency code, e.g. "EUR" → "€". Falls back to the
 * code itself when there's no symbol for it, so callers never render an empty
 * string. Exposed for the few places that show a symbol beside a code rather
 * than beside an amount (the Create MCA Link currency selector); anything
 * rendering an amount should use formatCurrency below instead.
 */
export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/**
 * Single source of truth for currency formatting (replaces the ~8 ad-hoc
 * symbol ternaries that existed in the prototype). Symbol + grouped amount.
 */
export function formatCurrency(amount: number, currency: string = "INR", locale = "en-IN"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Always-compact currency, the single short form every dashboard figure uses so
 * they read the same everywhere. For rupees it's the Indian scale — ₹8.5K,
 * ₹9.95L, ₹6.91Cr (two decimals for lakh/crore, one for thousand); for any
 * other reporting currency it's the Western scale — $8.5K, $1.20M, $2.00B —
 * since lakh/crore only make sense against ₹. Below a thousand the exact grouped
 * figure is shown, as there's nothing to shorten.
 *
 * This is for bar labels, axis ticks and inline stat cells. For a standalone
 * headline KPI use formatCurrencyCompact (below) via the CompactAmount
 * component, which keeps small figures exact and reveals the full number on
 * hover.
 */
export function formatCurrencyShort(amount: number, currency: string = "INR"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (currency !== "INR") {
    // Western short scale — lakh/crore would be wrong against a non-rupee code.
    if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
    return `${sign}${symbol}${Math.round(abs).toLocaleString("en-US")}`;
  }

  if (abs >= 10_000_000) return `${sign}${symbol}${(abs / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${sign}${symbol}${(abs / 100_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${symbol}${Math.round(abs).toLocaleString("en-IN")}`;
}

/**
 * Currency for a standalone headline KPI. The full grouped amount up to five
 * digits (₹39,860.28), then the same compact short form as formatCurrencyShort
 * once it reaches a lakh — ₹9.95L, ₹6.91Cr — so a big figure never runs past
 * its card while a small one stays exact.
 *
 * Pair with the CompactAmount component, which shows the exact figure
 * (formatCurrency) in a hover tooltip whenever this compacts.
 */
export function formatCurrencyCompact(
  amount: number,
  currency: string = "INR",
  locale = "en-IN"
): string {
  // Five digits or fewer (under a lakh): the reader wants the exact figure and
  // it fits, so nothing is compacted and no tooltip is warranted.
  if (Math.abs(amount) < 100_000) return formatCurrency(amount, currency, locale);
  return formatCurrencyShort(amount, currency);
}

/** Compact number formatting: 1_500 -> "1.5K", 2_400_000 -> "2.4M". */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// Kept as names for the billing-period callers that already read them. They were
// a second, character-for-character copy of the two tables at the top of this
// file until they were pointed at them — one set of month names per app.
export const MONTH_LABELS = MONTHS_LONG;

/** The same twelve, abbreviated — for anything laying months out in a grid. */
export const MONTH_SHORT_LABELS = MONTHS_SHORT;

/** (2026, 7) → "August 2026". `monthIndex` is 0-based, as Date reports it. */
export function formatMonthYearLabel(year: number, monthIndex: number): string {
  return `${MONTHS_LONG[monthIndex]} ${year}`;
}

/** "2026-08" → "August 2026". Returns the raw value if it isn't a "YYYY-MM" pair. */
export function formatMonthLabel(periodMonth: string): string {
  const [year, month] = periodMonth.split("-");
  const name = MONTHS_LONG[Number(month) - 1];
  if (!year || !name) return periodMonth;
  return formatMonthYearLabel(Number(year), Number(month) - 1);
}

// ── Date keys ────────────────────────────────────────────────────────────────
//
// A "date key" is a calendar day written "YYYY-MM-DD" — the form the settlement
// calendar, the duration filters and the settlement APIs all pass days around
// in. A day, not a moment: no time, no timezone.
//
// These live here rather than beside the settlement calendar because three
// separate files had grown their own private copy of parseDateKey, and the two
// duration filters were reaching into the calendar's own module for the rest.

/**
 * "2026-08-09" → a Date at local midnight on that day.
 *
 * Built from the parts rather than handed to the Date constructor: `new
 * Date("2026-08-09")` parses as UTC midnight, which is the *previous* day for
 * anyone behind UTC, so a date key would render as the day before its own value.
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year!, month! - 1, day);
}

/** The inverse: a Date → "2026-08-09", read in local time. */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "2026-08-09" → "Aug 9", month-first, for the settlement calendar widget. */
export function formatShortDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/**
 * "2026-08-09" → "9 Aug", day-first to match the rest of the dashboard.
 * formatShortDate above is month-first, kept that way for the calendar widget it
 * already powers.
 */
export function formatDayMonth(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** "2026-08-09" → "Saturday, 9 Aug". */
export function formatWeekdayDate(dateKey: string): string {
  return `${DAYS_LONG[parseDateKey(dateKey).getDay()]}, ${formatDayMonth(dateKey)}`;
}

/** "2026-08-09" → "Saturday". */
export function formatWeekdayName(dateKey: string): string {
  return DAYS_LONG[parseDateKey(dateKey).getDay()]!;
}

/**
 * Formats dates for UI. Uses fixed English strings (not Intl) so server and
 * client render identical markup and avoid hydration mismatches.
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const o: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  };

  // A bare call still gets date and time, which is what most callers want. But
  // a caller that spells out the parts it wants and names no time field is
  // asking for a date: spreading its options over the defaults leaves hour and
  // minute standing, so `{day, month, year}` used to render "19 Aug 2026,
  // 05:30 AM". That is wrong for a due date or an invoice issue date, neither of
  // which has a time at all, and callers were passing `hour: undefined,
  // minute: undefined` to opt back out.
  const TIME_KEYS = ["hour", "minute", "second", "hour12", "timeStyle"] as const;
  const callerWantsTime =
    !options || TIME_KEYS.some((key) => options[key as keyof typeof options] !== undefined);

  const includeTime = callerWantsTime && o.hour !== undefined && o.minute !== undefined;

  let datePart: string;
  if (o.month === "long" && o.day === "numeric") {
    const y =
      o.year === "numeric"
        ? String(d.getFullYear())
        : String(d.getFullYear() % 100).padStart(2, "0");
    datePart = `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${y}`;
  } else {
    const day = String(d.getDate()).padStart(2, "0");
    const mon = o.month === "long" ? MONTHS_LONG[d.getMonth()] : MONTHS_SHORT[d.getMonth()];
    const yr =
      o.year === "numeric"
        ? String(d.getFullYear())
        : String(d.getFullYear() % 100).padStart(2, "0");
    datePart = `${day} ${mon} ${yr}`;
  }

  if (!includeTime) return datePart;

  const use12 = o.hour12 !== false;
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  let timePart: string;
  if (use12) {
    const ap = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    timePart = `${String(h12).padStart(2, "0")}:${min} ${ap}`;
  } else {
    timePart = `${String(h).padStart(2, "0")}:${min}`;
  }

  return `${datePart}, ${timePart}`;
}

/**
 * Parses the transactions API's "DD/MM/YYYY HH:mm:ss" display strings.
 * Date.parse can't be trusted with slash-separated dates (it assumes
 * MM/DD/YYYY in en-US), so this is matched manually. Returns null when the
 * input doesn't match that shape (e.g. a date-only value).
 */
export function parseApiDateTime(display: string | null | undefined): Date | null {
  if (!display) return null;
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min, ss] = match;
  const date = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    Number(ss)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The single transaction timestamp format used across the Transactions
 * table and the Transaction Details page, e.g. "24 Jul '26, 03:32 PM".
 */
export function formatTransactionDateTime(date: Date): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  const hh = String(hours12).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} '${yy}, ${hh}:${min} ${ampm}`;
}

/**
 * Reformats a transaction timestamp into formatTransactionDateTime's display
 * format. The transactions API is inconsistent about the shape it sends
 * these in — formattedCreationDateTime comes as "DD/MM/YYYY HH:mm:ss", but
 * settlementDate comes as a raw ISO 8601 string (e.g.
 * "2026-07-22T09:36:55.553580498Z") — so both are tried before falling back
 * to the raw string rather than showing nothing.
 */
export function formatTransactionTimestamp(raw: string | null | undefined): string {
  if (!raw) return "—";
  const parsed = parseApiDateTime(raw) ?? parseIsoDateTime(raw);
  return parsed ? formatTransactionDateTime(parsed) : raw;
}

function parseIsoDateTime(raw: string): Date | null {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Date-only variant of formatTransactionDateTime, e.g. "24 Jul '26" — same
 * day/month/year formatting, no time-of-day portion.
 */
export function formatTransactionDate(date: Date): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} '${yy}`;
}

/**
 * Reformats a transaction timestamp into formatTransactionDate's date-only
 * display format; same dual DD/MM/YYYY-or-ISO parsing as
 * formatTransactionTimestamp, since settlementDate can arrive in either
 * shape.
 */
export function formatTransactionDateOnly(raw: string | null | undefined): string {
  if (!raw) return "—";
  const parsed = parseApiDateTime(raw) ?? parseIsoDateTime(raw);
  return parsed ? formatTransactionDate(parsed) : raw;
}

/**
 * Parses epoch milliseconds, which several APIs send as a string rather than a
 * number ("1771329858260").
 *
 * The string form is why this exists as its own step: `new Date("1771329858260")`
 * is an Invalid Date, since the Date constructor reads a string as a date
 * *format*, not as a count of milliseconds. It has to go through Number first,
 * and every caller that forgot got a silently broken date.
 */
export function parseEpochMillis(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const millis = Number(value);
  if (!Number.isFinite(millis)) return null;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Epoch millis → the app-wide transaction timestamp form, "24 Jul '26, 03:32 PM".
 *
 * `fallback` is what an absent or unparseable value renders as. It defaults to
 * the em dash every other formatter here falls back to; the settlement timeline
 * passes "" instead, because a step whose timestamp is not meaningful yet omits
 * the line rather than showing a placeholder inside a sentence.
 */
export function formatEpochDateTime(
  value: string | number | null | undefined,
  fallback = "—"
): string {
  const date = parseEpochMillis(value);
  return date ? formatTransactionDateTime(date) : fallback;
}

/** Epoch millis → date only, "31 Aug 2026". */
export function formatEpochDate(value: string | number | null | undefined, fallback = "—"): string {
  const date = parseEpochMillis(value);
  if (!date) return fallback;
  return formatDate(date, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Weekday, ordinal day, month, no year, e.g. "Mon, 24th Aug". Used for the
 * Analytics card's "Next settlement" line, where naming the day of the week
 * reads better than a bare calendar date this close to the present.
 */
export function formatNextSettlementDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  const parsed = parseApiDateTime(raw) ?? parseIsoDateTime(raw);
  if (!parsed) return raw;
  const day = parsed.getDate();
  return `${DAYS_SHORT[parsed.getDay()]}, ${day}${ordinalSuffix(day)} ${MONTHS_SHORT[parsed.getMonth()]}`;
}

/**
 * Groups a phone number for display, e.g. ("+44", "7911123456") →
 * "+44 791 112 3456". One grouping rule for every country rather than a
 * per-country mask: a table of numbers from a dozen countries reads far better
 * when the digit groups line up than when each row follows its own national
 * convention, and there is no libphonenumber-style dependency in the app to
 * supply those conventions anyway.
 *
 * Digits are taken three at a time from the left while more than five remain,
 * so the number always ends on a group of three to five and never on an orphan
 * digit or pair — the shape that makes "+65 812 345 67" look like a typo.
 */
export function formatPhoneNumber(dialCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, "");
  const groups: string[] = [];
  let rest = digits;
  while (rest.length > 5) {
    groups.push(rest.slice(0, 3));
    rest = rest.slice(3);
  }
  if (rest) groups.push(rest);
  return `${dialCode} ${groups.join(" ")}`.trim();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

/**
 * Shortens from the middle, keeping the head and tail visible, e.g. an IBAN
 * as "DE89 3704 00…130 00".
 *
 * The right shape for identifiers a user verifies rather than reads: with an
 * account number or an IBAN, the leading characters say which rail and bank
 * it is and the trailing ones are what a merchant eyeballs against the copy
 * they already hold, while the middle carries neither. `truncate` above drops
 * the tail entirely, which loses exactly the half that does the checking.
 *
 * Returns the string untouched unless eliding it hides a worthwhile number of
 * characters. A bare `length > head + tail` guard isn't enough: a 20-character
 * account holder's name against a head of 12 and a tail of 6 would come back
 * one character shorter and unreadable, having traded a whole word for an
 * ellipsis. MIN_ELIDED below is what buys that case out.
 */
const MIN_ELIDED = 4;

export function truncateMiddle(str: string, head = 12, tail = 6): string {
  if (str.length <= head + tail + MIN_ELIDED) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

/** Byte count -> human readable size, e.g. 245_000 -> "245 KB", 3_400_000 -> "3.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/**
 * Hands a blob to the browser as a file download. The API returns exports as
 * a blob rather than a URL, so there is nothing to navigate to — an anchor is
 * synthesised, clicked, and torn down. The object URL is revoked afterwards
 * so the blob can be garbage collected.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
