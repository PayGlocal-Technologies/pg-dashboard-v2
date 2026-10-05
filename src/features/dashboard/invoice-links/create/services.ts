import { BASE_URL_V1 } from "@/api";

/**
 * Invoice Links editor endpoints.
 *
 * Verbatim from pg-dashboard/src/features/create-mca-payment-invoice/services.ts,
 * `page="INVOICE"` entries only. All on the v1 customer-data tree.
 */

/** Create. POST the full request body. */
export const createInvoiceApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/customer-data/invoice/${mid}` : "";

/** Edit an already-issued invoice. PUT, same body as create. */
export const editInvoiceApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/customer-data/invoice/${mid}/edit` : "";

/**
 * Draft save and draft read share one URL; the verb distinguishes them.
 * POST creates a draft, PUT updates one, GET reads it back for prefill.
 */
export const invoiceDraftApi = (mid: string, invoiceId?: string): string => {
  if (!mid) return "";
  const base = `${BASE_URL_V1}/customer-data/invoice/${mid}/draft`;
  return invoiceId ? `${base}?id=${encodeURIComponent(invoiceId)}` : base;
};

// ── Static reference data ────────────────────────────────────────────────────

/** Currencies the merchant may invoice in. */
export const currencyMapApi = `${BASE_URL_V1}/static/iso/currencyMap`;

/** Country list for the billing/shipping address pickers. */
export const countryCurrencyMapApi = `${BASE_URL_V1}/static/iso/countryCurrencyMap`;

/** States for one country, fetched when a country is picked. */
export const countryStatesApi = (iso2Code: string): string =>
  iso2Code ? `${BASE_URL_V1}/static/iso/countryData/${iso2Code}` : "";

/** Merchant short name, shown on the invoice preview's letterhead. */
export const merchantProfileApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/merchants/${mid}/profile` : "";

/**
 * Leg 1 of the logo upload: POST
 * `{ fileExtension: ".png", merchantDocType: "INVOICE", name: mid }` and get
 * back `{ gid, data: { logo: { [mid]: presignedPutUrl } } }`. Note the `gid`
 * sits on the envelope, not under `data` — it has to ride along as an
 * `X-Amz-Meta-gid` header on leg 2.
 */
export const invoiceLogoApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/customer-data/invoice/${mid}/logo` : "";

/** The merchant's currently stored logo, for display. `{ merchantLogoPublicUrl }`. */
export const merchantAdditionalInfoApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/merchants/${mid}/additionalinfo` : "";
