/** One identifier row on a virtual account card (e.g. "ACH Routing" → "026073150"). */
export interface AccountDetail {
  label: string;
  value: string;
}

/** A single virtual receiving account in one of the supported countries. */
export interface VirtualAccount {
  /** Stable key — also used as the clipboard/share subject id. */
  id: string;
  /** ISO 3166-1 alpha-2 country code; drives the flag asset. */
  iso2: string;
  countryName: string;
  currency: string;
  /** Display name shown on the card, e.g. "USD Account". */
  accountName: string;
  /** Region-appropriate identifiers shown on the compact card, in order
   *  (e.g. "Account Number", "ACH Routing"). Reused as-is inside the full
   *  details section below the carousel. */
  details: AccountDetail[];
  /** Fields only shown in the expanded details section, not on the card. */
  paymentMethod: string;
  accountHolderName: string;
  /** e.g. "Business checking account" — shown in the expanded details section. */
  accountType: string;
  bankName: string;
  beneficiaryAddress: string;
  /** Machine-readable routing code type, e.g. "ach_routing_number". Not every
   *  country's rail has one worth surfacing. */
  routingCodeType?: string;
  /**
   * USD accounts reach the same account over two rails and the API returns a
   * separate code for each: `routingCode` is the ACH one, this is the Fedwire
   * one. Only USD has it, which is why it is optional and shown as its own row
   * rather than folded into the generic routing field.
   */
  fedwireRoutingCode?: string;
  /** True for the SWIFT catch-all account (the API's "OTHER" bucket key, shown
   *  as "Rest of the World"). Surfaces that need to single it out test this
   *  rather than a hardcoded id, since real ids are issued by the backend. */
  isGlobal?: boolean;
}

// ── API contracts ───────────────────────────────────────────────────────────
// Everything below mirrors pg-dashboard's src/features/multi-currency-accounts/
// types.ts. The types above are this app's *view* shape, which the mapper in
// hooks.ts produces from ApiVirtualAccount; they are deliberately not the same
// thing, because the API returns no presentation fields (see the API-gap notes
// on the mapper).

/** Currency keys the accounts response is bucketed by. "OTHER" is the SWIFT
 *  catch-all, displayed as "GLOBAL"/Rest of the World. */
export type ApiCurrency = "AUD" | "USD" | "EUR" | "GBP" | "CAD" | "OTHER";

export interface ApiVirtualAccount {
  id: string;
  accountId: string;
  currency: string;
  paymentType: "priority" | "regular";
  accountHolderName: string;
  accountNumber: string;
  accountNumberType: string;
  routingCode: string;
  routingCodeType: string;
  fedwireRoutingCode: string | null;
  bankName: string;
  bankAddress: string;
  bankCountry: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The accounts response carries two independent sets:
 * - `general` — the merchant's own receiving accounts (Virtual accounts page).
 * - `amazon`  — accounts issued for Amazon payouts (Platforms page).
 * Either may be absent for a merchant who has no accounts of that kind.
 */
export interface AccountDataResponse {
  gid: string;
  status: string;
  message: string;
  timestamp: string;
  reasonCode: string;
  data: {
    general?: Record<ApiCurrency, ApiVirtualAccount>;
    amazon?: Record<ApiCurrency, ApiVirtualAccount>;
  };
  errors: unknown;
}

/** Leg 1 of either document download returns this descriptor; leg 2 posts it
 *  back unchanged. `isAmazon` is a string, not a boolean, on the wire. */
export interface GeneratedDocumentPayload {
  fileName: string;
  processor: string;
  isAmazon: string;
  documentType: string;
}

/** Leg 2's response. `url` is absent while generation is still running, which
 *  is the signal to poll again. */
export interface GeneratedDocumentUrlResponse {
  url?: string;
  fileName?: string;
}

/**
 * Body of leg 1 of the transaction report (bank statement) download.
 *
 * Verbatim from pg-dashboard's TransactionReportRequest
 * (multi-currency-accounts/types.ts) — the three fields its Transaction report
 * drawer collects before the statement can be generated. Nothing else is sent:
 * the account itself is identified by the SHA-256 in the URL.
 */
export interface TransactionReportRequest {
  merchantRegisteredName: string;
  contactEmail: string;
  merchantRegisteredAddress: string;
}

/**
 * The slice of GET /merchants/{mid}/profile the two statement drawers prefill
 * from. Flat body, not enveloped — the same shape pg-dashboard's ProfileData
 * reads (platform-withdrawals/types.ts). Envelope-tolerant on the read side,
 * since other callers of this endpoint in the app see it wrapped.
 *
 * `merchantAddress` arrives either pre-joined as `concatAddress` or split into
 * its parts, and pg-dashboard's DownloadReport falls back from the first to the
 * second — see `merchantRegisteredAddressOf` in this feature's utils.
 */
export interface MerchantRegisteredProfile {
  /** The registered legal name. Read-only wherever it is shown. */
  merchantRegisteredName?: string;
  /** The trading/DBA name — what the Amazon statement is issued to. */
  merchantShortName?: string;
  merchantAddress?: MerchantAddress;
}

export interface MerchantAddress {
  concatAddress?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}

export interface ShareLinkRequest {
  currency: string;
}

export interface ShareLinkResponse {
  gid: string;
  status: string;
  message: string;
  data: { url: string };
}

/** `id` is the SHA-256 of the account number, matching pg-dashboard's
 *  McaShareModal. Cc/Bcc are omitted entirely when the merchant leaves them
 *  blank rather than sent as empty arrays. */
export interface SendAccountEmailRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  ccEmails?: string[];
  bccEmails?: string[];
}

/** Verbatim from pg-dashboard's src/features/dashboard/types.ts. Note the
 *  money figures are strings and only `fxRate` is a number. */
export interface ExchangeRateData {
  annualSavingsComparedToBanks: string;
  convertedAmount: string;
  fxRate: number;
  gst: string;
  payGlocalFeeAmount: string;
  payGlocalFeeRate: string;
  payGlocalFeeType: "PERCENTAGE" | "FLAT";
  settlementAmount: string;
}

export interface ExchangeRatesResponse {
  gid: string;
  status: string;
  message: string;
  data: ExchangeRateData;
}

/**
 * Leg 1's payload for the Amazon account-detail statement. Exactly the six
 * fields pg-dashboard sends (AmzAccountDetailReportRequest) — the drawer also
 * shows the registered legal name and the country, which this endpoint does
 * not take.
 */
export interface AmzAccountStatementRequest {
  currency: string;
  routingCode: string;
  accountNumber: string;
  /** The seller's DBA (trading) name, not the registered legal name — the
   *  statement is issued to this. */
  merchantName: string;
  merchantRegisteredAddress: string;
  /** Optional on the wire, but the drawer always collects and sends it, as
   *  pg-dashboard's DownloadReport does. */
  contactEmail?: string;
}

export interface AmzAccountStatementTriggerResponse {
  message?: string;
  data?: { requestTimestamp?: string };
}

export interface AmzAccountStatementPollResponse {
  data?: { presignedUrl?: string };
}
