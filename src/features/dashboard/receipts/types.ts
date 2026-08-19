/**
 * Which product a receipt belongs to. The tab bar is a switch over exactly these
 * three, and every receipt carries the one it was issued under — so the tab
 * selects a subset of the same record shape rather than three different tables.
 *
 * MCA and PA line up with ProductType's "PACB"/"PA" (see useResolvedMids), but
 * this union is deliberately its own: Fraud screening is not a MID-scoped
 * product, so it has no ProductType to borrow.
 */
export type ReceiptProduct = "MCA" | "PA" | "FRAUD";

/**
 * One month of one product's payment activity, as a receipt.
 *
 * `product` + `periodMonth` is the record's natural key: there is exactly one
 * receipt per product per month, never two (see MOCK_RECEIPTS, which holds that
 * invariant). That is what lets the row's Download action address a document by
 * product and month alone, and why the table needs no per-transaction breakdown —
 * a row already *is* the whole month.
 */
export interface Receipt {
  /** Stable row id — mirrors the `gid` every other record on the dashboard is keyed by. */
  gid: string;
  product: ReceiptProduct;
  /**
   * The merchant-facing document number, and the table's leading column. This is
   * the value that appears on the receipt itself and the one to quote at support;
   * `invoiceId` below is the platform's own handle for the same record.
   */
  invoiceNumber: string;
  /** Opaque platform identifier for the invoice this receipt was raised against. */
  invoiceId: string;
  /**
   * The month the receipt covers, as "YYYY-MM".
   *
   * Not a timestamp: a receipt is issued *for* a calendar month, so the month is
   * the fact, and both the Month column and the date filter derive from it (see
   * formatReceiptMonth and periodMonthRangeMs). Held as a literal string rather
   * than a Date so nothing about rendering it depends on the reader's timezone.
   */
  periodMonth: string;
  /** Decimal string, the same shape McaTransaction.amount arrives in. */
  amount: string;
  /**
   * Always INR today: a receipt is PayGlocal's tax invoice for a month's fees,
   * billed to an Indian merchant, which is what makes it usable for GST input
   * credit. Kept on the record rather than assumed at the call site so the
   * Amount cell never hardcodes a symbol.
   */
  currency: string;
}
