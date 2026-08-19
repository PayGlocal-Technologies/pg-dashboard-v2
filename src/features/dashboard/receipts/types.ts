/**
 * Which product a receipt belongs to. The page's tab bar is a switch over
 * exactly these three, and every receipt carries the one it was issued under —
 * so the tab selects a subset of the same record shape rather than three
 * different tables.
 *
 * MCA and PA line up with ProductType's "PACB"/"PA" (see useResolvedMids), but
 * this union is deliberately its own: Fraud screening is not a MID-scoped
 * product, so it has no ProductType to borrow.
 */
export type ReceiptProduct = "MCA" | "PA" | "FRAUD";

/** Lifecycle of a receipt, as the Status chip and filter present it. */
export type ReceiptStatus = "PAID" | "ISSUED" | "PENDING" | "REFUNDED" | "VOID";

export interface Receipt {
  /** Stable row id — mirrors the `gid` every other record on the dashboard is keyed by. */
  gid: string;
  product: ReceiptProduct;
  /** Merchant-facing receipt number, the value merchants quote at support. */
  receiptNumber: string;
  /** "DD/MM/YYYY HH:mm:ss" or ISO 8601 — formatTransactionTimestamp takes both. */
  issuedOn: string;
  /**
   * Who the receipt names. Read as the remitter on MCA, the paying customer on
   * PA, and the billed entity on Fraud screening — see RECEIPT_COLUMN_LABELS,
   * which is what actually renames the column per product.
   */
  party: string;
  /** ISO2 / ISO3 / full name — CountryCell normalises whichever arrives. */
  partyCountry?: string | null;
  /** The record this receipt was raised against: a transaction, an order, or an invoice. */
  reference: string;
  /** Decimal string, the same shape McaTransaction.amount arrives in. */
  amount: string;
  currency: string;
  /** How the money moved (or, on Fraud screening, what was billed). */
  channel: string;
  status: ReceiptStatus;
}
