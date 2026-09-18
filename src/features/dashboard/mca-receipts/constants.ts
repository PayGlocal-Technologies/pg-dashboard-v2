import type { ReceiptProduct } from "@/features/dashboard/mca-receipts/types";

/** Rows per page — matches SKU_PAGE_LIMIT so both tables page alike. */
export const RECEIPTS_PAGE_LIMIT = 10;

/**
 * What each product is called wherever it is named to the merchant. Only the MCA
 * entry is reachable now the page is scoped to that product, but the map is kept
 * whole: a response still carries a productType, and mapProductType still reads
 * every value the backend can send.
 */
export const RECEIPT_PRODUCT_LABEL: Record<ReceiptProduct, string> = {
  MCA: "Multi-currency accounts",
  PA: "Payment aggregator",
  FRAUD: "Fraud screening",
};

/**
 * The only product this page shows.
 *
 * Receipts used to be a three-tab table over MCA / PA / Fraud screening. The
 * page now lives under Multi-Currency Accounts and is scoped to that product
 * alone, so the tab bar is gone and this is the single value the list request
 * asks for. The ReceiptProduct union and the mapping either way are kept whole —
 * responses still carry a productType and it is still read back — so restoring
 * another product means asking for it, not rebuilding the shape.
 */
export const RECEIPT_PRODUCT: ReceiptProduct = "MCA";

/**
 * The ReceiptProduct union → the value the list endpoint's `products` field takes.
 *
 * Only Fraud screening differs: the backend calls it "FS" (see pg-dashboard's
 * productTypeDisplayMap and its merchantInvoiceFilters static data), while the
 * union spells it out. The inverse mapping lives in mapProductType, and the two
 * have to agree — send "FS" and read "FS" back — or the page would request one
 * product and then filter the response for another.
 */
export const RECEIPT_PRODUCT_API_VALUE: Record<ReceiptProduct, string> = {
  MCA: "MCA",
  PA: "PA",
  FRAUD: "FS",
};

/**
 * How far back the Period chip lets the merchant navigate, in months from the
 * current one. A navigation bound for the year grid, not an API limit —
 * pg-dashboard's equivalent filter is an unbounded date picker, and the endpoint
 * accepts any range inside one request.
 */
export const RECEIPT_MAX_LOOKBACK_MONTHS = 36;

/**
 * The window the page opens on, in months back from the current one.
 *
 * 15, matching pg-dashboard's getDefault18MonthRange — which despite its name
 * subtracts 15 months, not 18. Kept at the production value rather than the one
 * the name implies, so both dashboards request the same span.
 */
export const RECEIPT_DEFAULT_LOOKBACK_MONTHS = 15;

/** Supporting line under the page title — what these receipts are for. */
export const RECEIPTS_PAGE_SUBTITLE =
  "View monthly payment receipts that you can use to redeem your GST.";

/**
 * What the Month column's info tip says. Lives here rather than inline so the
 * column header and anything else that has to explain the period (an export
 * footer, a help panel) quote one sentence.
 */
export const RECEIPT_MONTH_HINT =
  "This receipt covers all payments made during the selected month.";

/**
 * Assistive line inside the Amount filter's popover. Names what the two inputs
 * are compared against, since a receipt's amount is a whole month's fees rather
 * than any single payment, and every receipt is billed in INR.
 */
export const RECEIPT_AMOUNT_HINT = "Matched against the receipt's total for the month, in INR.";

/**
 * The hints the search box cycles through, exactly as the Transactions page
 * cycles remitter/transaction ID/UTR: each names a field the query is matched
 * against, and the query hits any of them (see filterReceipts). Rendered as
 * "Search by " + hint, so these are lowercase phrases except the ID initialism.
 *
 * All three name a column the table actually renders, in every tab — a receipt
 * found by a field the merchant can't see in the row would read as a mis-match.
 */
export const RECEIPT_SEARCH_HINTS = ["invoice number", "invoice ID", "amount"];

/** Screen-reader label for the search box. */
export const RECEIPT_SEARCH_ARIA_LABEL = "Search multi-currency account receipts";
