import { currencySymbol, formatTransactionTimestamp } from "@/lib/utils/format";

/**
 * Number formatting for timeline/breakdown money, matching pg-dashboard's
 * formatNumberReadable: INR groups the Indian way (1,23,456), everything else
 * the Western way, and trailing zeros are dropped rather than padded to two
 * decimals — these are server-supplied amounts shown alongside a symbol, not
 * the table's fixed-width currency column.
 */
export function formatAmount(
  value: number | string | null | undefined,
  currency: string | null | undefined
): string {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";

  const locale = currency?.toUpperCase() === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/** "$1,234.5 USD" — symbol, grouped amount, then the code. */
export function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined
): string {
  const code = currency ?? "";
  return `${currencySymbol(code)}${formatAmount(value, code)} ${code}`.trim();
}

/**
 * Timeline event timestamps. The API sends these as "DD/MM/YYYY HH:mm:ss";
 * formatTransactionTimestamp already parses that shape (and ISO, as a
 * fallback) and renders the app-wide "24 Jul '26, 03:32 PM" form, so timeline
 * times read identically to the table's Date & Time column.
 *
 * `show` exists because several steps carry a timestamp that isn't meaningful
 * yet — an in-progress upload, a pending FIRC — where the caller wants the
 * line omitted rather than a misleading time rendered.
 */
export function formatEventTime(value: string | null | undefined, show = true): string {
  if (!show || !value) return "";
  const formatted = formatTransactionTimestamp(value);
  return formatted === "—" ? "" : formatted;
}

/** Epoch millis → the same display format, for valueDateTime. */
export function formatEpochMillis(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const millis = Number(value);
  if (Number.isNaN(millis)) return "";
  return formatTransactionTimestamp(new Date(millis).toISOString());
}

/** Strips any path prefix the API includes on an uploaded file's name. */
export function fileNameFrom(value: string | null | undefined): string {
  if (!value) return "";
  return value.split("/").pop() || value;
}
