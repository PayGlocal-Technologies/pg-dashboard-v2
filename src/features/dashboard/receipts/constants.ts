import type { FilterChipOption } from "@/components/common/filters/FilterChips";
import type { ReceiptProduct, ReceiptStatus } from "@/features/dashboard/receipts/types";

/** Same page size as the MCA Transactions and MCA Links tables, so all three paginate identically. */
export const RECEIPTS_PAGE_LIMIT = 10;

/**
 * The product tab bar: the three products receipts are issued under, and no
 * others. Unlike the Transactions and SKU tab bars — which are shortcuts onto a
 * status/type filter — this one selects which product's receipts the table is
 * showing at all, so it is a context switch rather than a filter axis.
 *
 * Multi-currency accounts leads because it is the product most receipts are
 * raised under, and it is the page's default selection.
 */
export const RECEIPT_PRODUCT_TABS = [
  { value: "MCA", label: "Multi-currency accounts" },
  { value: "PA", label: "Payment aggregator" },
  { value: "FRAUD", label: "Fraud screening" },
] as const satisfies readonly { value: ReceiptProduct; label: string }[];

/** The tab the page opens on. */
export const DEFAULT_RECEIPT_PRODUCT: ReceiptProduct = "MCA";

/** Options in the Status filter chip's checkbox list. */
export const RECEIPT_STATUS_FILTERS: FilterChipOption[] = [
  { value: "PAID", label: "Paid" },
  { value: "ISSUED", label: "Issued" },
  { value: "PENDING", label: "Pending" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "VOID", label: "Void" },
];

/**
 * Three columns name different things depending on the product the receipt was
 * issued under, so the header travels with the selected tab rather than
 * settling on one generic word for all three. The underlying Receipt fields
 * (`party`, `reference`, `channel`) are the same either way — this only renames
 * them, which is what makes one table serve all three products.
 */
export const RECEIPT_COLUMN_LABELS: Record<
  ReceiptProduct,
  { party: string; reference: string; channel: string }
> = {
  MCA: { party: "Remitter", reference: "Transaction ID", channel: "Rail" },
  PA: { party: "Customer", reference: "Order ID", channel: "Payment method" },
  FRAUD: { party: "Billed to", reference: "Invoice number", channel: "Service" },
};

/**
 * The hints the search box cycles through, exactly as the Transactions page
 * cycles remitter/transaction ID/UTR: each names a field the query is matched
 * against, and the query hits any of them (see filterReceipts). Keyed by
 * product so the hints always name the fields the visible rows actually have.
 * Rendered as "Search by " + hint, so these are lowercase phrases.
 */
export const RECEIPT_SEARCH_HINTS: Record<ReceiptProduct, string[]> = {
  MCA: ["receipt number", "remitter", "transaction ID"],
  PA: ["receipt number", "customer", "order ID"],
  FRAUD: ["receipt number", "billed entity", "invoice number"],
};

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
