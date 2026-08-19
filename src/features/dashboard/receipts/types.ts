/**
 * Which product a receipt belongs to. The tab bar is a switch over exactly
 * these three, and every receipt carries the one it was issued under — so the
 * tab selects a subset of the same record shape rather than three different
 * tables.
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
  /** The invoice this receipt was raised against, and the row's own identifier in the table. */
  invoiceId: string;
  /** "DD/MM/YYYY HH:mm:ss" or ISO 8601 — formatTransactionTimestamp takes both. */
  issuedOn: string;
  /** Decimal string, the same shape McaTransaction.amount arrives in. */
  amount: string;
  currency: string;
  /**
   * Remitter country. ISO2 / ISO3 / full name — CountryCell normalises whichever
   * arrives.
   *
   * Only Multi-currency account receipts carry one, and only that tab has a
   * Country column (see buildReceiptColumns): a cross-border collection is the
   * one case where where the money came from is part of the record. PA and
   * Fraud screening rows leave it undefined rather than repeating the
   * merchant's own country in a column their tab doesn't render.
   */
  remitterCountry?: string | null;
  status: ReceiptStatus;
}
