/**
 * A client of the merchant — the business they invoice and collect from, as
 * opposed to the remitter on a single transaction. One row of the Client
 * Management table.
 */
export interface Client {
  id: string;
  /**
   * The merchant this client belongs to, as returned by the search. Carried on
   * the row so update and contract calls can address it: a multi-MID merchant
   * browsing every account at once has clients from several MIDs on screen, and
   * the path segment has to be the row's own MID. Never rendered.
   */
  mid?: string;
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

  /**
   * What this client has been invoiced in total, in `currency`. Straight from the
   * server (`totalInvoiceAmount`), which is authoritative: an earlier revision
   * derived it by summing the transactions the details view lists, and those two
   * figures disagreed with what production reports for the same client.
   */
  totalInvoiceAmount?: number;
  /** How much of that is still owed (`outstandingAmount`). Zero is a real value
   *  — a client fully settled up — not a missing one. */
  outstandingAmount?: number;

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
  /** Street address — the first line of `billingAddress`, kept separately so the
   *  edit form can round-trip the parts rather than re-parsing them. */
  addressLine?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  // ── Shipping address ─────────────────────────────────────────────────────
  // Kept on the record only so the edit form can round-trip it and so the "same
  // as billing address" checkbox can be derived by comparison — the API stores no
  // such flag. Nothing renders these; the details view shows the billing address.
  shippingAddressLine?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipcode?: string;
  shippingCountryName?: string;
  /** ISO2 for the above, resolved through the same country map as `countryIso2`. */
  shippingCountryIso2?: string;

  /** Indian tax registration, where the client has one. */
  gstin?: string;
  /**
   * Where the record came from. A Zoho-imported client is marked as such
   * everywhere it is listed, because it is one the merchant did not enter here
   * and edits to it can be overwritten by the next sync.
   */
  source?: "PAYGLOCAL" | "ZOHO";
  notes?: string;
  /**
   * The attached contract.
   *
   * `size` is optional because the two ways a contract reaches this field know
   * different things about it: a file the merchant just picked in this session
   * comes from the browser, which knows its size, while one loaded from the
   * server does not — the API's contract object carries a filename, a doc type
   * and an id, but no size. The chip renders the size only when it has one.
   *
   * `fileId` is present only on a stored contract, and is what tells the UI this
   * is a document it can ask the server to open (see useClientContractView).
   */
  contract?: { name: string; size?: number; fileId?: string };
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
  /** Second street line, which the API's address has and this form used to send
   *  empty. Optional in practice — most addresses need one line. */
  addressLine2: string;
  city: string;
  zipcode: string;
  /**
   * True when the contact name is the business name. Sends one as a copy of the
   * other, which is what pg-dashboard's `sameAsBusinessName` checkbox does — for
   * a sole trader the two really are the same string and typing it twice is
   * busywork.
   */
  sameAsBusinessName: boolean;
  /** True when the client is shipped to at its billing address, which is the
   *  common case and the default. False reveals the shipping fields below. */
  sameAsBillingAddress: boolean;
  shippingAddressLine: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingZipcode: string;
  /** ISO2, independent of the billing country. */
  shippingCountry: string;
  gstin: string;
  notes: string;
  /**
   * The attached contract. `file` is the picked File itself, which is what the
   * upload actually needs — the endpoint takes the bytes, not a description of
   * them. Absent on an edit form opened over a stored contract: there is a name
   * to show but no local file, and that absence is exactly what stops a save
   * from re-uploading a document the server already has.
   */
  contract: { name: string; size?: number; file?: File } | null;
}

// ── Client API ──────────────────────────────────────────────────────────────
// Mirror of pg-dashboard/src/features/mca-clients/types.ts. These are the wire
// shapes; everything above this line is what the components render. The two are
// deliberately different, and hooks.ts is the only place that knows both.

/**
 * Structured address, as the API stores it. v2 renders `billingAddress` as one
 * composed string and keeps the parts for the edit form to round-trip.
 *
 * Every part is nullable on the way out: all six fields are mounted in
 * pg-dashboard's form, so all six are registered and an unfilled one serialises to
 * `null` rather than being dropped. Reads tolerate the same, since that is what
 * comes back.
 */
export interface ClientApiAddress {
  streetAddress1: string | null;
  streetAddress2: string | null;
  city: string | null;
  state: string | null;
  /** Whatever get-country-details keys its map by, which is the ISO2 code ("NZ")
   *  in every environment seen so far — *not* the display name. pg-dashboard's
   *  country select submits that key verbatim; see iso2ToApiCountry. */
  country: string | null;
  zipcode: string | null;
}

/**
 * The stored contract. Note the absence of a size: the chip's file size can only
 * come from a file picked in this session.
 */
export interface ClientApiContract {
  fileName: string;
  name: string;
  docTypeKey: string;
  status: "active" | "success" | "error";
  message: string | null;
  url?: string | null;
  fileId?: string;
  originalFileName?: string;
  docType?: string;
}

export interface ClientApiRecord {
  id: string;
  mid: string;
  businessName: string;
  /** The contact person. v2 calls this primaryContactName, because
   *  `name` beside `businessName` reads as a second name for the business. */
  name: string;
  email: string;
  /** One string, dial code included. v2 holds the code and the number apart so
   *  the table can group every row's digits identically. */
  number: string;
  websiteLink?: string;
  /**
   * The client's country, as a top-level convenience field — pg-dashboard's list
   * column reads this one. Only a fallback here: `address.country` is the copy
   * either app's form actually writes, and this can be absent on a record created
   * through one of them. Whether it holds a name or an ISO2 varies by environment,
   * which is why resolveCountry detects the shape rather than assuming.
   */
  country: string;
  status: string;
  totalInvoiceAmount: number;
  outstandingAmount: number;
  address?: ClientApiAddress;
  shippingAddress?: ClientApiAddress;
  formattedCreationDate?: string;
  notes?: string;
  contract?: ClientApiContract;
  currency?: string;
  createdAt?: string;
  /** Business type — Company, Partnership, and so on. */
  type?: string;
  gstIn?: string;
  tags: string[];
  source?: "PAYGLOCAL" | "ZOHO";
}

export interface ClientSearchResponse {
  status: string;
  message: string;
  data: {
    data: ClientApiRecord[];
    totalCount: number;
  };
}

export interface ClientByIdResponse {
  status: string;
  message: string;
  data: { client: ClientApiRecord };
}

/**
 * Create and update send the same body (POST .../create and PUT .../{id}/update).
 *
 * Two fields are load-bearing in a way the names don't show, both copied from
 * pg-dashboard's submit handler: `shippingAddress` is sent as a *copy of*
 * `address` when the merchant hasn't given a separate one, and `name` is sent as
 * a copy of `businessName` when they haven't given a separate contact name.
 * v2's form collects neither a shipping address nor a "same as" checkbox, so both
 * are always mirrored — see toClientApiPayload.
 */
/**
 * The create/update body, exactly as pg-dashboard sends it — see
 * toClientApiPayload for how each of these is arrived at and why.
 *
 * `null` is a real value throughout, not a stand-in for "omitted": production's
 * form registers every mounted field, so an optional one the merchant left blank
 * goes over the wire as an explicit null. The two genuinely optional keys are
 * `gstIn` and `notes`, which sit behind collapsed accordions there and so are
 * absent rather than null when unfilled.
 *
 * There is no `mid`: it is a path segment on these endpoints.
 */
export interface ClientMutationPayload {
  businessName: string;
  name: string;
  /** Sent because pg-dashboard's checkbox is a registered form field. */
  sameAsBusinessName: boolean;
  email: string;
  number: string;
  websiteLink: string | null;
  /** An API enum code — see CLIENT_BUSINESS_TYPES, not a display label. */
  type: string;
  tags: string[] | null;
  address: ClientApiAddress;
  shippingAddress: ClientApiAddress;
  gstIn?: string;
  notes?: string;
}

export interface ClientCreateResponse {
  status: string;
  message: string;
  data: { clientId: string };
}

// ── Reference data ──────────────────────────────────────────────────────────

/** `{ countryCodes: { "United Kingdom": "GB", … } }` — name to ISO2. */
export interface ClientCountryCodesResponse {
  status: string;
  message: string;
  data: { countryCodes: Record<string, string> };
}

/** `{ stateCodes: { "KARNATAKA": "KA", …, "OTHER COUNTRY": … } }`. */
export interface ClientStateCodesResponse {
  status: string;
  message: string;
  data: { stateCodes: Record<string, string> };
}

/** Tag names already in use. The entries are objects with an optional `name`,
 *  so an entry with none has to be filtered out rather than rendered blank. */
export interface ClientTagOptionsResponse {
  status: string;
  message: string;
  data: { McaTags: { name?: string }[] };
}

// ── Contract upload ─────────────────────────────────────────────────────────

/**
 * Leg 1's response. The presigned URL is keyed by the *file's own name*, so it
 * sits alongside `metaData` in the same object rather than under a fixed key —
 * which is why this is an index signature and not a named field.
 */
export interface ClientContractPresignResponse {
  status: string;
  message: string;
  data: {
    metaData?: { gid?: string };
  } & Record<string, string | { gid?: string } | undefined>;
}

/** The document descriptor leg 1 is asked for. `merchantDocType` is fixed to
 *  MCA_CLIENT_ATTRIBUTES, and `fileExtension` carries its leading dot. */
export interface ClientContractDocument {
  merchantDocType: string;
  name: string;
  fileExtension: string;
}

export interface ClientContractViewResponse {
  status: string;
  message: string;
  data: { url: string };
}

// ── Invoice summary ─────────────────────────────────────────────────────────

/** Counts only — no amounts. The KPI row's amounts come from the client
 *  record's own totals instead. Note the double nesting: `data.data`. */
export interface ClientInvoiceSummaryResponse {
  status: string;
  message: string;
  data: {
    data: {
      totalNo: number;
      totalCreated: number;
      totalPaid: number;
      totalOutstanding: number;
      totalActive: number;
    };
  };
}

// ── Client invoice ledger ───────────────────────────────────────────────────
// Mirror of pg-dashboard's McaInvoiceData (mca-invoices/types.ts). The ledger on
// the client details view lists these, filtered to one client.

export type ClientInvoiceStatus = "DRAFT" | "ACTIVE" | "PAID" | "PAID_OUTSIDE" | "OUTSTANDING";

export interface ClientInvoice {
  id: string;
  mid: string;
  clientId: string;
  invoiceNumber: string;
  /** Decimal string, like every other amount on the wire. */
  totalAmount: string;
  currency: string;
  status: ClientInvoiceStatus;
  /** How it was raised — an uploaded PDF, a recurring schedule, or the default
   *  in-product flow. */
  type: "DEFAULT" | "RECURRING" | "UPLOADED";
  invoiceDate: string;
  dueDate: string;
  formattedCreationDate: string;
  /** Zoho-imported invoices carry the same marker clients do. */
  source?: "PAYGLOCAL" | "ZOHO";
}

export interface ClientInvoicesResponse {
  status: string;
  message: string;
  data: {
    data: ClientInvoice[];
    totalCount?: number;
  };
}

/** `{ data: { url } }` — a presigned GET for the invoice PDF. */
export interface InvoiceViewResponse {
  status: string;
  message: string;
  data: { url: string };
}

// Zoho status/pull-sync types now live in
// @/features/dashboard/zoho-integration/types, shared with the integration
// card and the invoice list rather than redeclared here.
