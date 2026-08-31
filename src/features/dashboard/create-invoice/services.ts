import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

// Endpoint URL builders only — no fetch/axios logic here. Every path below is
// copied verbatim from pg-dashboard, which is the production source of truth:
//   pg-dashboard/src/features/create-invoice/services.ts
//   pg-dashboard/src/features/mca-clients/services.ts
//   pg-dashboard/src/features/sku-management/services.ts
//
// Builders return "" when a required id is missing so callers can gate on
// `enabled: !!url`, matching the convention in mca-transactions/services.ts.

// ── Invoice draft lifecycle ─────────────────────────────────────────────────

/**
 * Upsert. Production drives this per wizard step, sending the accumulated
 * invoice plus a `currentStep` marker; the flat editor sends the whole
 * document on every autosave instead. Same endpoint, same envelope: the step
 * field is still required because the server persists it as the resume point.
 */
export const createInvoiceApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/create` : "";

export const getInvoiceDetailsApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}` : "";

/** Finalises the draft and renders the PDF server-side. Body: { isGstInvoice }. */
export const generateInvoiceApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/generate-invoice` : "";

/** Returns `{ data: { url } }` — a presigned link to the generated document. */
export const downloadInvoiceApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/view-invoice` : "";

export const sendInvoiceEmailApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/send-email` : "";

// ── Themes ──────────────────────────────────────────────────────────────────

/**
 * The palette the renderer draws with: the theme names it can lay out, plus the
 * named colours and accents it recognises, each with the hex it uses for them.
 *
 * Not scoped by merchant, hence a bare constant rather than a builder. The
 * vocabulary belongs to the renderer, so it is the same for everyone and changes
 * only on a backend release, which is why callers cache it indefinitely.
 */
export const invoiceThemesApi = `${BASE_URL_V3}/mca-invoice/themes`;

// ── Templates ───────────────────────────────────────────────────────────────

/** GET lists this merchant's templates; POST creates one. */
export const invoiceTemplatesApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/templates` : "";

/**
 * One template: GET reads it, PUT replaces it wholesale, DELETE removes it.
 *
 * Note the read has a side effect the other endpoints do not: it bumps the
 * template's `lastUsedAt`, which is how the API records that a template was
 * used. See `markUsed` in hooks.ts.
 */
export const invoiceTemplateApi = (mid: string, templateId: string): string =>
  mid && templateId ? `${invoiceTemplatesApi(mid)}/${templateId}` : "";

// ── Biller ──────────────────────────────────────────────────────────────────

export const billerDetailsApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/get-biller-details` : "";

// ── Clients ─────────────────────────────────────────────────────────────────

/**
 * Client picker options. Scoped by invoiceId because the server also marks
 * which client the draft already points at.
 */
export const clientListApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-client/${mid}/get-client-list/${invoiceId}` : "";

export const getClientByIdApi = (mid: string, clientId: string): string =>
  mid && clientId ? `${BASE_URL_V3}/mca-client/${mid}/${clientId}` : "";

export const createClientApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-client/${mid}/create` : "";

export const updateClientApi = (mid: string, clientId: string): string =>
  mid && clientId ? `${BASE_URL_V3}/mca-client/${mid}/${clientId}/update` : "";

export const clientStateCodesApi = `${BASE_URL_V3}/mca-client/get-state-details`;

export const clientCountryCodesApi = `${BASE_URL_V3}/mca-client/get-country-details`;

// ── Bank accounts ───────────────────────────────────────────────────────────

/** PayGlocal-provisioned accounts: LOCAL, Settlement, and global variants. */
export const suggestedAccountsApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/get-suggested-account` : "";

/** Accounts the merchant added by hand. */
export const addedAccountsApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/bank-details` : "";

export const addBankAccountApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/add-bank` : "";

export const deleteBankAccountApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/delete-account` : "";

// ── Branding assets ─────────────────────────────────────────────────────────
// Two legs: POST { extension } returns a presigned S3 URL, then PUT the file
// to it with an x-amz-meta-merchantId header. Assets are merchant-level, not
// per invoice — the invoice only stores logoEnabled / signatureEnabled.

export const uploadAssetApi = (mid: string, type: "LOGO" | "SIGNATURE"): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/upload/${type}` : "";

export const getAssetApi = (mid: string, type: "LOGO" | "SIGNATURE"): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/asset/${type}` : "";

// ── Line items / SKU catalogue ──────────────────────────────────────────────

/** Autocomplete suggestions for the line-item name field. */
export const getLineItemsApi = (mid: string, currency?: string): string =>
  mid
    ? `${BASE_URL_V3}/mca-invoice/${mid}/get-line-items${currency ? `?currency=${currency}` : ""}`
    : "";

/** Pushes items the merchant ticked "save to catalogue" into SKU management. */
export const skuImportPreviousItemsApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/sku/${mid}/import/previous-items` : "";

// ── Currencies ──────────────────────────────────────────────────────────────
// v1, not v3, and it hangs off /merchants rather than /mca-invoice. Copied from
// getMcaCurrenciesApi in pg-dashboard/src/features/create-mca-payment-invoice/
// services.ts, which is what create-invoice/hooks.ts calls.

export const mcaCurrenciesApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/merchants/${mid}/ffms/currencies` : "";

// ── Linked transaction (?gid= entry point) ──────────────────────────────────

/** OpenSearch lookup for the transaction an invoice is being linked to. */
export const ffmsTxnSearchApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/search/ffms/txn/${mid}` : "";
