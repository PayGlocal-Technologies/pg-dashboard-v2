import type { DateRangeValue } from "@/components/common/filters/FilterChips";
import { toEndOfDayMs, toStartOfDayMs } from "@/components/common/filters/FilterChips";
import { formatCurrency } from "@/lib/utils/format";
import type { Receipt, ReceiptProduct } from "@/features/dashboard/receipts/types";

/**
 * INR receipts read 1,24,999.00 and everything else 124,999.00 — the lakh
 * grouping is right for the domestic PA and Fraud screening lines and wrong for
 * every foreign currency an MCA receipt is raised in, so the locale follows the
 * currency rather than being fixed per table (compare SKU_PRICE_LOCALE, which
 * can be fixed because no SKU currency is INR).
 */
export function formatReceiptAmount(receipt: Receipt): string {
  const amount = parseFloat(receipt.amount || "0");
  const currency = receipt.currency || "USD";
  return formatCurrency(amount, currency, currency === "INR" ? "en-IN" : "en-US");
}

// Spelled out rather than read from Intl: a receipt's period is a calendar month,
// not a moment, so the label must not vary with the reader's locale or timezone
// the way toLocaleString would. "2026-08" reads "August 2026" for everyone.
const MONTH_NAMES = [
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

/** "2026-08" → "August 2026". Returns the raw value if it isn't a "YYYY-MM" pair. */
export function formatReceiptMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split("-");
  const name = MONTH_NAMES[Number(month) - 1];
  if (!year || !name) return periodMonth;
  return `${name} ${year}`;
}

/**
 * The span a receipt's period covers, as epoch ms — first instant of the month
 * to last. Used by the date filter, which matches a receipt whose whole month
 * overlaps the chosen range rather than one that starts inside it: a receipt
 * "covers all payments made during the month" (the Month column's own info tip
 * says so), so asking for any few days in August has to return August's receipt.
 */
export function periodMonthRangeMs(periodMonth: string): { start: number; end: number } | null {
  const [year, month] = periodMonth.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return null;

  const start = new Date(year, month - 1, 1).getTime();
  // Day 0 of the following month is the last day of this one — the arithmetic
  // that makes December roll into the next January without a special case.
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  return Number.isNaN(start) || Number.isNaN(end) ? null : { start, end };
}

export interface ReceiptFilters {
  product: ReceiptProduct;
  search: string;
  dateRange: DateRangeValue;
  statusFilters: string[];
}

/**
 * Every filter the page offers, applied in one pass.
 *
 * Client-side because there is no receipts endpoint yet (rows come from
 * MOCK_RECEIPTS). When the endpoint lands, replace this with a request body —
 * mirroring buildTxnRequestBody — and a usePostQuery call; the tabs, chips and
 * columns that feed it need no changes.
 *
 * The product tab is applied here too, and first: it is the page's context, so
 * the search box and every chip only ever see the selected product's rows.
 */
export function filterReceipts(receipts: Receipt[], filters: ReceiptFilters): Receipt[] {
  const query = filters.search.trim().toLowerCase();
  const fromMs = filters.dateRange.from ? toStartOfDayMs(filters.dateRange.from) : null;
  const toMs = filters.dateRange.to ? toEndOfDayMs(filters.dateRange.to) : null;

  return receipts.filter((receipt) => {
    if (receipt.product !== filters.product) return false;

    // The three fields the search hints name, all of them columns the table
    // renders in every tab. The amount is matched on its raw decimal string, so
    // "412500" finds the row the Amount column shows as 412,500.00 — grouping
    // separators and the currency symbol are display-only and never part of the
    // query.
    if (
      query &&
      ![receipt.invoiceNumber, receipt.invoiceId, receipt.amount].some((field) =>
        field.toLowerCase().includes(query)
      )
    ) {
      return false;
    }

    if (filters.statusFilters.length && !filters.statusFilters.includes(receipt.status)) {
      return false;
    }

    if (fromMs !== null || toMs !== null) {
      const period = periodMonthRangeMs(receipt.periodMonth);
      // A row whose period can't be read is dropped rather than kept: a date
      // filter that silently let unparseable rows through would report a range
      // it isn't actually showing.
      if (!period) return false;
      // Overlap, not containment — see periodMonthRangeMs. A range ending before
      // the month starts, or starting after it ends, is the only miss.
      if (toMs !== null && period.start > toMs) return false;
      if (fromMs !== null && period.end < fromMs) return false;
    }

    return true;
  });
}
