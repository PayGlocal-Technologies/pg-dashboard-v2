import type { DateRangeValue, CurrencyOption } from "@/components/common/filters/FilterChips";
import { toEndOfDayMs, toStartOfDayMs } from "@/components/common/filters/FilterChips";
import { formatCurrency, parseApiDateTime } from "@/lib/utils/format";
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

/** Epoch ms for a receipt timestamp, or null when it can't be parsed. */
function timestampMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parsed = parseApiDateTime(raw);
  if (parsed) return parsed.getTime();
  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso.getTime();
}

/**
 * The currencies actually present in one product's receipts, as Currency filter
 * chip options. Derived from the rows rather than from a fixed list, so the chip
 * can only ever offer a currency that has receipts behind it — an MCA merchant
 * never sees INR in the list, and the PA tab never offers AED.
 *
 * No `iso2`, so each option renders the globe glyph instead of a flag: a
 * currency here belongs to a receipt, not to one of the merchant's own
 * country-based receiving accounts (which is what CURRENCY_FILTER_OPTIONS
 * describes, and where the flags come from).
 */
export function receiptCurrencyOptions(receipts: Receipt[]): CurrencyOption[] {
  const codes = Array.from(new Set(receipts.map((r) => r.currency))).sort();
  return codes.map((code) => ({ value: code, label: code }));
}

export interface ReceiptFilters {
  product: ReceiptProduct;
  search: string;
  dateRange: DateRangeValue;
  statusFilters: string[];
  currencyFilters: string[];
}

/**
 * Every filter the page offers, applied in one pass.
 *
 * Client-side because there is no receipts endpoint yet (rows come from
 * MOCK_RECEIPTS). When the endpoint lands, replace this with a request body
 * — mirroring buildTxnRequestBody — and a usePostQuery call; the tabs, chips
 * and columns that feed it need no changes.
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

    // The two fields the search hints name, both of them columns the table
    // renders in every tab. The amount is matched on its raw decimal string, so
    // "24500" finds the row the Amount column shows as 24,500.00 — grouping
    // separators and the currency symbol are display-only and never part of the
    // query.
    if (
      query &&
      ![receipt.invoiceId, receipt.amount].some((field) => field.toLowerCase().includes(query))
    ) {
      return false;
    }

    if (filters.statusFilters.length && !filters.statusFilters.includes(receipt.status)) {
      return false;
    }

    if (filters.currencyFilters.length && !filters.currencyFilters.includes(receipt.currency)) {
      return false;
    }

    if (fromMs !== null || toMs !== null) {
      const issued = timestampMs(receipt.issuedOn);
      // A row whose timestamp can't be read is dropped rather than kept: a date
      // filter that silently lets unparseable rows through would report a
      // range it isn't actually showing.
      if (issued === null) return false;
      if (fromMs !== null && issued < fromMs) return false;
      if (toMs !== null && issued > toMs) return false;
    }

    return true;
  });
}
