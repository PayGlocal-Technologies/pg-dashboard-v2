import { BASE_URL_V1 } from "@/api";

/**
 * Invoice Links endpoints.
 *
 * Every URL here is verbatim from
 * pg-dashboard/src/features/mca-payment-invoice-links/services.ts. They sit on
 * the `v1` customer-data tree, NOT the `v3 mca-invoice` tree that
 * features/dashboard/mca-invoices uses — see types.ts for why that distinction
 * matters.
 */

/**
 * Invoice links search (a POST that reads). Body is built by
 * buildTxnRequestBody; the MID rides in `fieldSearch.mid`, not the path.
 *
 * Verbatim from `getInvoiceLinksApi` (services.ts:32).
 */
export const invoiceLinksSearchApi = (): string => `${BASE_URL_V1}/search/invoice`;

// ── Row actions ──────────────────────────────────────────────────────────────
// Every one of these takes the MID from the ROW, not from the page scope: a
// multi-MID merchant's list spans MIDs, and pg-dashboard passes `record.mid`
// into each handler for exactly that reason.

/** Disable an active invoice link. PUT, empty body. From `disableInvoiceLinkApi`. */
export const invoiceLinkDisableApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId
    ? `${BASE_URL_V1}/customer-data/invoice/disable/${mid}/invoiceId/${invoiceId}`
    : "";

/** Delete a DRAFT invoice. DELETE. From `createDeleteInvoiceLinkApi`. */
export const invoiceLinkDraftApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId
    ? `${BASE_URL_V1}/customer-data/invoice/${mid}/draft?id=${encodeURIComponent(invoiceId)}`
    : "";

/**
 * Invoice preview. POST `{ invoiceRequestData: { invoiceId } }`, responds with
 * a presigned URL to the rendered PDF. From `retrieveInvoiceLinkApi`.
 */
export const invoiceLinkRetrieveApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/customer-data/invoice/retrieve/${mid}` : "";

/**
 * Leg 1 of the proof-of-payment upload: PUT the document manifest, get back a
 * `{ filename: presignedPutUrl }` map. Inline in pg-dashboard's
 * UpdateInvoiceStatusDrawer rather than in its services.ts.
 */
export const invoiceLinkStatusApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId
    ? `${BASE_URL_V1}/customer-data/invoice/${mid}/status?id=${encodeURIComponent(invoiceId)}`
    : "";

/** Leg 3: confirms the uploaded objects landed. */
export const invoiceLinkVerifyUploadApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId
    ? `${BASE_URL_V1}/customer-data/invoice/${mid}/verify-upload?id=${encodeURIComponent(invoiceId)}`
    : "";

/**
 * Invoice links export. POST the same search body the list uses; responds with
 * a file blob. From `downloadInvoiceReportApi`.
 */
export const invoiceLinksReportApi = (mid: string): string =>
  mid ? `${BASE_URL_V1}/search/invoice/${mid}/download` : "";

/** Already-uploaded proof documents, for the read-only view. */
export const invoiceLinkPaymentProofApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId
    ? `${BASE_URL_V1}/customer-data/invoice/${mid}/payment-proof?id=${encodeURIComponent(invoiceId)}`
    : "";
