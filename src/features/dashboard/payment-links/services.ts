import { BASE_URL_V1 } from "@/api";

// Endpoint URL builders only. Ported verbatim from pg-dashboard's
// src/features/create-mca-payment-invoice/services.ts (the PAYMENT path of the
// shared create-link screen).

/**
 * The merchant's payment link settings: GET → SI enabled, max/default expiry,
 * required customer fields, preferred currency. Read unwrapped upstream
 * (`config.merchantSIEnabled`), see usePaymentLinkConfig.
 */
export const paymentLinkConfigApi = (mid: string): string =>
  `${BASE_URL_V1}/merchants/${mid}/payment-link-form/config`;

/** Create a payment link: POST the request body → `{ data: { paymentLink } }`. */
export const createPaymentLinkApi = (mid: string): string =>
  `${BASE_URL_V1}/customer-data/payment-link/${mid}`;

/** Every currency a payment link can be raised in: GET → `{ data: { currencyMap } }`. */
export const currencyMapApi = `${BASE_URL_V1}/static/iso/currencyMap`;

/** Countries for the address sections: GET → `{ data: { countryCurrencyMap } }`. */
export const countryCurrencyMapApi = `${BASE_URL_V1}/static/iso/countryCurrencyMap`;

/** One country's states: GET → `{ data: { countryCodeModel: { statesList } } }`. */
export const countryStatesApi = (iso2: string): string =>
  `${BASE_URL_V1}/static/iso/countryData/${iso2}`;

/** Dial codes for the phone field: GET → `{ data: { countryCallingCodes } }`. */
export const countryCallingCodesApi = `${BASE_URL_V1}/static/iso/countryCallingCodes`;

// ── List ─────────────────────────────────────────────────────────────────────
// From pg-dashboard's src/features/mca-payment-invoice-links/services.ts.

/** The payment links list: POST a TableReqBody → `{ data: { data, totalCount } }`. */
export const paymentLinksSearchApi = `${BASE_URL_V1}/search/payment-link`;

/** The list export: POST `{ startTime, endTime, ... }` → a CSV file. */
export const paymentLinksReportApi = (mid: string): string =>
  `${BASE_URL_V1}/search/payment-link/${mid}/download`;

/** Disable (deactivate) an Active link: PUT, no body. */
export const paymentLinkDisableApi = (mid: string, paymentLinkId: string): string =>
  `${BASE_URL_V1}/customer-data/payment-link/disable/${mid}/plId/${paymentLinkId}`;
