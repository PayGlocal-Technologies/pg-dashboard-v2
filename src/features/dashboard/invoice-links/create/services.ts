import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

/**
 * Invoice Links editor endpoints.
 *
 * Verbatim from pg-dashboard/src/features/create-mca-payment-invoice/services.ts,
 * `page="INVOICE"` entries only. All on the v1 customer-data tree.
 */

/**
 * Create. POST the full request body.
 *
 * Also the bulk path: the same URL takes an optional `clients[]`, and when it
 * is non-empty the backend issues one link per client from one shared
 * `invoiceRequestData`, answering with `data.results[]` instead of a single
 * link. See buildBulkInvoiceRequest in helpers.ts.
 */
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

// ── Templates and clients (shared with MCA invoices) ─────────────────────────
//
// Invoice links reuse the MCA invoice template and client book as-is; there are
// no invoice-link-specific routes (backend: feature/invoice-link-templates).
// Paths are the ones create-invoice/services.ts and client-management/
// services.ts already call. The MID in the path is this editor's PA MID: the
// MCA_INVOICE entitlement now covers PA contracts as well as PACB.

/** GET lists this merchant's templates; POST creates one. */
export const invoiceTemplatesApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/templates` : "";

/**
 * One template: GET reads it (line items hydrated live from the SKU catalogue,
 * and `lastUsedAt` bumped as a side effect), PUT replaces it wholesale, DELETE
 * removes it.
 */
export const invoiceTemplateApi = (mid: string, templateId: string): string =>
  mid && templateId ? `${invoiceTemplatesApi(mid)}/${templateId}` : "";

/** Client book search. A POST, but a read. */
export const clientSearchApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-client/${mid}/search` : "";

/** One client in full, used to pick up a client just added from the picker. */
export const clientByIdApi = (mid: string, clientId: string): string =>
  mid && clientId ? `${BASE_URL_V3}/mca-client/${mid}/${clientId}` : "";

// ── Merchant configuration ───────────────────────────────────────────────────
// One of the configs gcc-ui-temp's invoice editor loads (features/Invoice/
// helper.js fetchInitialData); pg-dashboard reads none for invoice links. gcc's
// other two, …/payment-link-form/config (required addresses) and
// …/invoice/default-values, are deliberately not ported (decided 2026-10-08).

/**
 * GET: `{ merchantInvoiceEnabled, invoiceCustomerSharing }`. The first gates
 * Create on the list; the second says whether a created link is also sent to
 * the customer. From gcc's `getInvoiceLinkConfig`.
 */
export const invoiceLinkConfigApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/merchants/${mid}/invoice/config` : "";
