// "Check payment ETA" reference data. The currencies, accounts and bank
// holidays all come from the API (see payment-eta/hooks.ts); what stays here
// is the rail table each currency's account accepts.

/** Currencies the ETA check can estimate: the ones with a known rail table
 *  below. A merchant's account in any other currency (AED, SGD, the SWIFT
 *  catch-all) isn't offered, since there is no rail timing to quote for it. */
export type EtaCurrency = "USD" | "GBP" | "EUR" | "CAD" | "AUD";

/** A rail the result can quote an ETA for. */
export type EtaRoute =
  | "ach"
  | "fedwire"
  | "fps"
  | "chaps"
  | "bacs"
  | "sepa"
  | "sepa_instant"
  | "eft"
  | "becs"
  | "npp";

export interface EtaRouteSpec {
  label: string;
  /** Business days after sending until it lands; 0 means the same day. */
  maxDays: number;
  /** e.g. "1–2 business days", shown after "usually". */
  window: string;
  /** Runs every day, weekends and bank holidays included (instant rails).
   *  Otherwise only business days move the payment. */
  anyDay?: boolean;
}

/**
 * Typical timings per rail.
 *
 * ASSUMPTION, to be confirmed by ops: these are the standard scheme timings,
 * not figures from PayGlocal's banking partners. Change a number here and the
 * estimate, the journey track and the copy all follow.
 */
export const ETA_ROUTES: Record<EtaRoute, EtaRouteSpec> = {
  ach: { label: "ACH", maxDays: 2, window: "1–2 business days" },
  fedwire: { label: "FEDWIRE", maxDays: 1, window: "1 business day" },
  fps: { label: "Faster Payments", maxDays: 0, window: "within minutes", anyDay: true },
  chaps: { label: "CHAPS", maxDays: 0, window: "the same business day" },
  bacs: { label: "Bacs", maxDays: 3, window: "3 business days" },
  sepa: { label: "SEPA", maxDays: 1, window: "1 business day" },
  sepa_instant: { label: "SEPA Instant", maxDays: 0, window: "within seconds", anyDay: true },
  eft: { label: "EFT", maxDays: 2, window: "1–2 business days" },
  becs: { label: "BECS (Direct Entry)", maxDays: 1, window: "1 business day" },
  npp: { label: "NPP / Osko", maxDays: 0, window: "within minutes", anyDay: true },
};

/**
 * The rails each currency's account receives over. From production's
 * CURRENCY_PAYMENT_METHOD_MAP (mirrored in multi-currency/mapAccounts.ts as
 * `paymentMethod`): USD "ACH/Fedwire", GBP "FPS/CHAPS/BECS", EUR
 * "SEPA/SEPA Instant", CAD "EFT", AUD "BECS/NPP/Osko". GBP's "BECS" is read
 * as Bacs, the UK scheme; BECS is Australia's.
 */
export const ETA_ROUTES_BY_CURRENCY: Record<EtaCurrency, EtaRoute[]> = {
  USD: ["ach", "fedwire"],
  GBP: ["fps", "chaps", "bacs"],
  EUR: ["sepa", "sepa_instant"],
  CAD: ["eft"],
  AUD: ["becs", "npp"],
};

export function isEtaCurrency(code: string): code is EtaCurrency {
  return code in ETA_ROUTES_BY_CURRENCY;
}

/** What the merchant picks: one of the currency's rails, "I don't know"
 *  (quotes every rail for the currency) or "Others" (not supported). */
export type EtaPaymentMode = EtaRoute | "unknown" | "other";

/** The mode options for one currency, its own rails first. */
export function etaPaymentModesFor(
  currency: EtaCurrency | ""
): { value: EtaPaymentMode; label: string }[] {
  if (!currency) return [];
  return [
    ...ETA_ROUTES_BY_CURRENCY[currency].map((route) => ({
      value: route as EtaPaymentMode,
      label: ETA_ROUTES[route].label,
    })),
    { value: "unknown", label: "I don't know" },
    { value: "other", label: "Others" },
  ];
}

export const ETA_SUPPORT_EMAIL = "merchant.support@payglocal.in";
