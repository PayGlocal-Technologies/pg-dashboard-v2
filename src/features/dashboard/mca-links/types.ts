/** Lifecycle of an MCA payment link, as the Status chip presents it. */
export type McaLinkStatus = "ACTIVE" | "DISABLED" | "EXPIRED";

export interface McaLink {
  /** Stable row id — mirrors the `gid` every other MCA record is keyed by. */
  gid: string;
  /** Decimal string, same shape McaTransaction.amount arrives in. */
  amount: string;
  currency: string;
  status: McaLinkStatus;
  /** ISO2 / ISO3 / full name — CountryCell normalises whichever arrives. */
  customerCountry?: string | null;
  invoiceNumber?: string | null;
  description?: string | null;
  /** "DD/MM/YYYY HH:mm:ss" or ISO 8601 — formatTransactionTimestamp takes both. */
  createdOn?: string | null;
  expiresAt?: string | null;
  /** The shareable payment URL the Copy Link action puts on the clipboard. */
  paymentLink: string;
}
