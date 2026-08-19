import type { FilterChipOption } from "@/components/common/filters/FilterChips";
import type { ReceiptProduct, ReceiptStatus } from "@/features/dashboard/receipts/types";

/** Rows per page — matches SKU_PAGE_LIMIT so both tables page alike. */
export const RECEIPTS_PAGE_LIMIT = 10;

/**
 * What each product is called wherever it is named to the merchant: the tab that
 * selects it, and the Product type cell on every row it owns. Declared once so a
 * tab and the rows underneath it can never disagree about the product's name.
 */
export const RECEIPT_PRODUCT_LABEL: Record<ReceiptProduct, string> = {
  MCA: "Multi-currency accounts",
  PA: "Payment aggregator",
  FRAUD: "Fraud screening",
};

/**
 * The product tab bar: the three products receipts are issued under, and no
 * others. Unlike the SKU and Transactions tab bars — which are shortcuts onto a
 * type/status filter that the merchant could equally reach from the chips — this
 * one selects which product's receipts the table is showing at all. The columns
 * are the same in every tab (see RECEIPT_COLUMNS); only the rows change.
 *
 * Multi-currency accounts leads because it is the product most receipts are
 * raised under, and it is the page's default selection.
 */
export const RECEIPT_PRODUCT_TABS = [
  { value: "MCA", label: RECEIPT_PRODUCT_LABEL.MCA },
  { value: "PA", label: RECEIPT_PRODUCT_LABEL.PA },
  { value: "FRAUD", label: RECEIPT_PRODUCT_LABEL.FRAUD },
] as const satisfies readonly { value: ReceiptProduct; label: string }[];

/** The tab the page opens on. */
export const DEFAULT_RECEIPT_PRODUCT: ReceiptProduct = "MCA";

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
 * Options in the Status filter chip's checkbox list. The table shows no status
 * column — see Receipt.status — so this chip is the only place a merchant can
 * narrow by it.
 */
export const RECEIPT_STATUS_FILTERS: FilterChipOption[] = [
  { value: "PAID", label: "Paid" },
  { value: "ISSUED", label: "Issued" },
  { value: "PENDING", label: "Pending" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "VOID", label: "Void" },
];

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

/** Screen-reader label for the search box, per product. */
export const RECEIPT_SEARCH_ARIA_LABEL: Record<ReceiptProduct, string> = {
  MCA: "Search multi-currency account receipts",
  PA: "Search payment aggregator receipts",
  FRAUD: "Search fraud screening receipts",
};

export const RECEIPT_STATUS_LABEL: Record<ReceiptStatus, string> = {
  PAID: "Paid",
  ISSUED: "Issued",
  PENDING: "Pending",
  REFUNDED: "Refunded",
  VOID: "Void",
};
