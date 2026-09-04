import type { AmountRangeValue, MonthRange } from "@/components/common/filters/FilterChips";
import { formatCurrency } from "@/lib/utils/format";
import {
  RECEIPT_DEFAULT_LOOKBACK_MONTHS,
  RECEIPT_MAX_LOOKBACK_MONTHS,
  RECEIPT_PRODUCT_API_VALUE,
} from "@/features/dashboard/receipts/constants";
import type {
  InvoiceDownloadViewRecord,
  InvoiceViewRequestParams,
  Receipt,
  ReceiptProduct,
} from "@/features/dashboard/receipts/types";

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

/** "YYYY-MM" for the month `monthsBack` months before `from`. */
function monthKeyBefore(from: Date, monthsBack: number): string {
  const d = new Date(from.getFullYear(), from.getMonth() - monthsBack, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * The window the page opens on: RECEIPT_DEFAULT_LOOKBACK_MONTHS back through the
 * current month, the same span pg-dashboard's getDefault18MonthRange builds.
 *
 * Call from a `useState` lazy initialiser or an effect, never during render —
 * it reads the clock (see CLAUDE.md hooks purity).
 */
export function defaultReceiptPeriod(): MonthRange {
  const now = new Date();
  return {
    start: monthKeyBefore(now, RECEIPT_DEFAULT_LOOKBACK_MONTHS),
    end: monthKeyBefore(now, 0),
  };
}

/**
 * The outer limits the Period chip lets the merchant navigate within. Wider than
 * the default window, so the range can be widened as well as narrowed — a chip
 * bounded by its own current value could only ever shrink.
 */
export function receiptPeriodBounds(): MonthRange {
  const now = new Date();
  return {
    start: monthKeyBefore(now, RECEIPT_MAX_LOOKBACK_MONTHS),
    end: monthKeyBefore(now, 0),
  };
}

/**
 * The list request body for one product over one month range.
 *
 * Both halves are real filters the endpoint applies, which is the point of
 * building this from the page's state rather than once on mount:
 *
 *  - `products` carries the selected tab. It used to be omitted entirely and the
 *    tabs sliced the response client-side, so every tab fetched every product's
 *    receipts and threw most of them away. pg-dashboard sends this from its
 *    Product Type filter (`products: filters.type`).
 *  - the four service year/month fields carry the Period chip, the same way
 *    pg-dashboard's transformFiltersToInvoiceParams turns its date range into
 *    them.
 */
export function buildReceiptRequestBody(
  product: ReceiptProduct,
  period: MonthRange
): InvoiceViewRequestParams {
  return {
    serviceYearStart: period.start.slice(0, 4),
    serviceMonthStart: period.start.slice(5, 7),
    serviceYearEnd: period.end.slice(0, 4),
    serviceMonthEnd: period.end.slice(5, 7),
    // A one-element array: the field is a multi-select on the wire (see
    // InvoiceViewRequestParams), and these tabs select exactly one product.
    products: [RECEIPT_PRODUCT_API_VALUE[product]],
  };
}

/**
 * The months the given receipts actually cover, as "YYYY-MM". Feeds the chip's
 * "has a receipt" dot: there is exactly one receipt per product per month, so a
 * marked month is one row.
 */
export function receiptMonthsWithData(receipts: Receipt[]): Set<string> {
  return new Set(receipts.map((r) => r.periodMonth).filter(Boolean));
}

export interface ReceiptFilters {
  product: ReceiptProduct;
  search: string;
  amountRange: AmountRangeValue;
}

/**
 * The filters that stay on the client, applied in one pass.
 *
 * Product and period are NOT among them any more: both are in the request body
 * (see buildReceiptRequestBody), so the response already covers one product over
 * one window. Search and amount stay here because the endpoint takes neither.
 *
 * The product test below is kept even so, as a narrowing safety net rather than
 * the primary filter: if a backend ignored `products`, every tab would otherwise
 * show every product's receipts. It is a no-op whenever the server honours the
 * field.
 */
export function filterReceipts(receipts: Receipt[], filters: ReceiptFilters): Receipt[] {
  const query = filters.search.trim().toLowerCase();
  // Blank and non-numeric inputs both mean "no bound", so a half-typed minus sign
  // never silently filters everything out.
  const min = parseFloat(filters.amountRange.min);
  const max = parseFloat(filters.amountRange.max);
  const hasMin = !Number.isNaN(min);
  const hasMax = !Number.isNaN(max);

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

    // Inclusive on both ends, so a range typed to match a figure the merchant can
    // see in the Amount column returns that row.
    if (hasMin || hasMax) {
      const amount = parseFloat(receipt.amount);
      if (Number.isNaN(amount)) return false;
      if (hasMin && amount < min) return false;
      if (hasMax && amount > max) return false;
    }

    return true;
  });
}

// ── API mapping (ported from pg-dashboard invoice-download) ──────────────────

/**
 * Backend productType ("PA" | "MCA" | "FS") → the tab union. The old feature's
 * Fraud value is "FS"; everything else that isn't MCA is treated as PA.
 * OPEN ITEM: confirm no other productType strings appear in a live response.
 */
export function mapProductType(productType: string | null | undefined): ReceiptProduct {
  if (productType === "MCA") return "MCA";
  if (productType === "FS" || productType === "FRAUD") return "FRAUD";
  return "PA";
}

/**
 * "YYYY-MM" for the Month column / filter. Prefers the record's
 * productServicePeriod when it already starts with a year-month; otherwise
 * parses invoiceDate. OPEN ITEM: confirm both formats against a live response.
 */
function toPeriodMonth(servicePeriod?: string | null, invoiceDate?: string | null): string {
  const ym = servicePeriod?.match(/^(\d{4})-(\d{2})/);
  if (ym) return `${ym[1]}-${ym[2]}`;
  if (invoiceDate) {
    const parsed = new Date(invoiceDate);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  return servicePeriod ?? "";
}

/** Maps a backend invoice record onto the Receipt the table renders. */
export function mapInvoiceRecordToReceipt(record: InvoiceDownloadViewRecord): Receipt {
  const merchantId = record.merchantId ?? "";
  const servicePeriod = record.productServicePeriod ?? "";
  return {
    gid: record.invoiceId || `${merchantId}-${servicePeriod}-${record.productType ?? ""}`,
    product: mapProductType(record.productType),
    invoiceNumber: record.invoiceNumber ?? "",
    invoiceId: record.invoiceId ?? "",
    periodMonth: toPeriodMonth(record.productServicePeriod, record.invoiceDate),
    amount: String(record.totalAmount ?? ""),
    // Always INR — the old table has no currency field and these are GST invoices.
    currency: "INR",
    merchantId,
    servicePeriod,
  };
}
