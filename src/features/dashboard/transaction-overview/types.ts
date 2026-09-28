/** Which book of business a row belongs to: the page's two tabs. */
export type TransactionRail = "PG" | "MCA";

/**
 * One transaction across a partner's merchants, as the Transaction Overview
 * table shows it. DESIGN MOCK shape: fields are named for what the columns
 * need, not for any API. Map the real partner response onto this (or replace
 * it) once that contract is confirmed against pg-dashboard.
 */
export interface PartnerTransaction {
  id: string;
  rail: TransactionRail;
  merchantId: string;
  amount: number;
  currency: string;
  /** Raw status: PA values on "PG" rows, MCA values on "MCA" rows. */
  status: string;
  /** Filter key for the Payment method chip, e.g. "CARD", "UPI", "SWIFT". */
  paymentMethod: string;
  /** PG rows only, for PaymentMethodCell's logo and masked number. */
  paymentInstrument?: string;
  cardBrand?: string;
  maskedCardNumber?: string;
  customerName: string;
  email: string;
  /** ISO2 of the customer's (PG) or remitter's (MCA) country. */
  country: string;
  /** "DD/MM/YYYY HH:mm:ss", the format the transactions API sends. */
  createdAt: string;
  /** MCA rows only, same format: when the funds settle (or settled) in INR. */
  settlementDate?: string;
}
