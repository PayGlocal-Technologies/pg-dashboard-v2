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

/** Lifecycle of a receipt, as the Status filter chip presents it. */
export type ReceiptStatus = "PAID" | "ISSUED" | "PENDING" | "REFUNDED" | "VOID";

export interface Receipt {
  /** Stable row id — mirrors the `gid` every other record on the dashboard is keyed by. */
  gid: string;
  product: ReceiptProduct;
  /**
   * The merchant-facing document number, and the table's leading column. This is
   * the value that appears on the receipt itself and the one to quote at
   * support; `invoiceId` below is the platform's own handle for the same record.
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
  currency: string;
  /**
   * The country of the receiving account this month's receipt covers. ISO2 /
   * ISO3 / full name — CountryCell normalises whichever arrives.
   *
   * Only Multi-currency account receipts carry one, and only that tab has a
   * Country column (see buildReceiptColumns): an MCA merchant holds a separate
   * local receiving account per country, so a month produces one receipt per
   * account and the country is what tells them apart. PA and Fraud screening
   * bill a single domestic account, so their rows leave it undefined rather than
   * repeating one country down a column their tab doesn't render.
   */
  remitterCountry?: string | null;
  /**
   * Whether the receipt has been settled. Not a column — the table shows no
   * status (every row a merchant can see is a real, issued receipt) — but the
   * Status filter chip narrows on it.
   */
  status: ReceiptStatus;
}
