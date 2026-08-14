/**
 * A client of the merchant — the business they invoice and collect from, as
 * opposed to the remitter on a single transaction. One row of the Client
 * Management table.
 */
export interface Client {
  id: string;
  businessName: string;
  /** The person at that business the merchant actually deals with. */
  primaryContactName: string;
  email: string;
  /**
   * Phone is stored split rather than as one pre-formatted string so the table
   * can group every row's digits the same way (see formatPhoneNumber) instead
   * of rendering whatever shape each record happened to be captured in.
   */
  phoneDialCode: string;
  phoneNumber: string;
  /**
   * Full billing address, as one display string. Kept unstructured because
   * nothing in the UI addresses its parts individually — the Contact section
   * renders it whole and lets it wrap.
   */
  billingAddress: string;
  /** ISO 3166-1 alpha-2, what the flag treatment is keyed by. */
  countryIso2: string;
  /** Display name for that country, so the cell never has to resolve one. */
  countryName: string;
  /**
   * What the client currently owes, in `outstandingCurrency`. Zero is a real
   * value (a client who is fully settled up), not a missing one.
   */
  outstandingAmount: number;
  /** ISO 4217 code the outstanding figure is denominated in. */
  outstandingCurrency: string;
  /** ISO 8601 timestamp the client record was created. */
  createdAt: string;
  /**
   * Completed invoices raised against this client, whatever their payment
   * state — the "Total completed invoices" KPI on the details view.
   */
  totalInvoices: number;
  /**
   * How many of those the client has actually paid. The outstanding count is
   * the difference between the two (see clientInvoiceMetrics) rather than a
   * third stored field, so the three figures can never disagree with each
   * other.
   */
  paidInvoices: number;
}
