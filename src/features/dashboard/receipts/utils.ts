import type { AmountRangeValue, MonthRange } from "@/components/common/filters/FilterChips";
import { formatCurrency } from "@/lib/utils/format";
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

/**
 * The billing months the Month chip may offer, taken from the window the list
 * request itself covers (getDefault18MonthRange).
 *
 * Derived from the request rather than from the rows on purpose: the chip used to
 * list only the months the response happened to contain, which meant a product
 * with no receipts yet — or a request that failed — opened an empty popover with
 * nothing in it but Clear and Apply. The shared year-and-month grid it renders
 * now always has something to show, and months without a receipt behind them are
 * marked rather than missing (see MonthFilterChip).
 */
export function receiptMonthRange(params: InvoiceViewRequestParams): MonthRange {
  return {
    start: `${params.serviceYearStart}-${params.serviceMonthStart}`,
    end: `${params.serviceYearEnd}-${params.serviceMonthEnd}`,
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
  monthFilters: string[];
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
 * the search box and both chips only ever see the selected product's rows. The
 * filters compose — an amount range and a set of months applied together match
 * only the rows satisfying both.
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

    // Months are matched as whole periods, not as a range: the chip offers a
    // year-and-month grid and the merchant picks the ones they want, so this is a
    // set membership test rather than a comparison.
    if (filters.monthFilters.length && !filters.monthFilters.includes(receipt.periodMonth)) {
      return false;
    }

    return true;
  });
}

// ── API mapping (ported from pg-dashboard invoice-download) ──────────────────

/**
 * Default service range = the last ~18 months, ported verbatim from the old
 * feature's getDefault18MonthRange. Call from a `useState` lazy initialiser or
 * an effect, never directly during render (uses `new Date()`).
 */
export function getDefault18MonthRange(): InvoiceViewRequestParams {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = String(now.getMonth() + 1).padStart(2, "0");

  const start = new Date(now);
  start.setMonth(start.getMonth() - 15);
  const startYear = start.getFullYear();
  const startMonth = String(start.getMonth() + 1).padStart(2, "0");

  return {
    serviceYearStart: String(startYear),
    serviceMonthStart: startMonth,
    serviceYearEnd: String(endYear),
    serviceMonthEnd: endMonth,
  };
}

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
