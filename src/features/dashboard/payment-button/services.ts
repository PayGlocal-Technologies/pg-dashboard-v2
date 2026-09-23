import { BASE_URL_V1, BASE_URL_V2 } from "@/api";

// Endpoint URL builders only. Ported verbatim from pg-dashboard's
// src/features/payment-button (PaymentButtonTable / EditPaymentButton), which
// inlines these URLs rather than keeping a services file of its own.

/**
 * Payment button list. POST TableReqBody with
 * `fieldSearch.merchantProductDataSubType: ["PAYMENT_BUTTON"]` and
 * `fieldSearch.mid` → { data: { data, totalCount } }.
 */
export const paymentButtonSearchApi = `${BASE_URL_V1}/search/wqr`;

/** Create a payment button under a MID. POST → { data: ScriptResponse }. */
export const createPaymentButtonApi = (mid: string): string =>
  `${BASE_URL_V1}/merchants/${mid}/payment-button`;

/** One payment button's configuration. GET to read, PUT to update. */
export const paymentButtonApi = (mid: string, productId: string): string =>
  `${BASE_URL_V1}/merchants/${mid}/payment-button/${productId}`;

/** Deactivate a payment button. PUT, empty body. */
export const deactivatePaymentButtonApi = (mid: string, productId: string): string =>
  `${BASE_URL_V1}/merchants/${mid}/payment-button/${productId}/deactivate`;

/** Retrieve the embed script for a payment button. GET. */
export const downloadPaymentButtonApi = (mid: string, productId: string): string =>
  `${BASE_URL_V1}/merchants/${mid}/payment-button/${productId}/download`;

/** Currencies enabled for the MID, for the button's currency picker. GET. */
export const merchantCurrencyApi = (mid: string): string =>
  `${BASE_URL_V2}/merchants/${mid}/currency`;

/** Merchant profile, read for the default merchant URL on create. GET. */
export const merchantProfileApi = (mid: string): string =>
  `${BASE_URL_V1}/merchants/${mid}/profile`;
