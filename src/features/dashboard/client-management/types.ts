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
   * ISO 4217 code this client is billed and settled in — the denomination of
   * its transactions, and so of the Total received column.
   */
  currency: string;
  /** ISO 8601 timestamp the client record was created. */
  createdAt: string;

  // No invoice counts and no received total live on the record. Every one of
  // those figures — Total invoices, Paid invoices, Outstanding invoices, and
  // the table's Total received — is derived from the client's transactions
  // instead (see clientInvoiceMetrics and clientTotalReceived in constants.ts),
  // so a stored count can never contradict the transactions listed beneath it.

  // ── Captured by the Add client form ──────────────────────────────────────
  // Optional on the record, not on the form: several of these are required to
  // create a client (see the validators in schemas.ts), but the seeded client
  // book predates the form and carries none of them, so a reader has to cope
  // with their absence either way. Making them optional here is what says so
  // honestly rather than back-filling placeholder values into every mock row.

  /** Company, Partnership, Sole proprietorship, LLP, Other. */
  businessType?: string;
  website?: string;
  /** Free-form labels the merchant files this client under. */
  tags?: string[];
  /** Street address — the first line of `billingAddress`, kept separately so a
   *  future edit form can round-trip the parts rather than re-parsing them. */
  addressLine?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  /** Indian tax registration, where the client has one. */
  gstin?: string;
  notes?: string;
  /** The uploaded contract's filename and size. Nothing is stored anywhere yet
   *  — there is no document endpoint — so this records what was attached, not
   *  a retrievable file. */
  contract?: { name: string; size: number };
}

/**
 * The Add client form's own values: every field a string (or a list of them),
 * because that is what inputs hold. `toClientFields` in schemas.ts is what
 * turns a validated set of these into the Client shape above.
 */
export interface ClientFormValues {
  businessName: string;
  businessType: string;
  website: string;
  tags: string[];
  primaryContactName: string;
  primaryContactEmail: string;
  /** ISO2 of the country whose dial code prefixes the number. */
  phoneCountry: string;
  phoneNumber: string;
  /** ISO2 — the address country, independent of the phone's. */
  country: string;
  state: string;
  addressLine: string;
  city: string;
  zipcode: string;
  gstin: string;
  notes: string;
  contract: { name: string; size: number } | null;
}
