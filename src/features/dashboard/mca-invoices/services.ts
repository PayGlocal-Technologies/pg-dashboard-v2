import { BASE_URL_V3 } from "@/api";

// Endpoint URL builders only. Paths copied verbatim from
// pg-dashboard/src/features/mca-invoices/services.ts.
//
// Every per-row action takes the MID off the row rather than from the current
// selection: a multi-MID merchant's list spans MIDs, so the row's own `mid` is
// the only correct one to address.

/** POST an OpenSearch-style body; returns `{ data: { data, totalCount } }`. */
export const allInvoicesApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/search` : "";

export const duplicateInvoiceApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/duplicate-invoice` : "";

export const deleteInvoiceApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/delete` : "";

export const markInvoicePaidApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/mark-invoice-paid` : "";

/** Returns `{ data: { url } }`, a presigned link to the generated document. */
export const viewInvoiceApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/view-invoice` : "";

/**
 * Counts for the summary cards. Takes a unix-SECONDS window as query params,
 * not millis, matching pg-dashboard's McaInvoiceSummary.
 */
export const invoiceSummaryApi = (mid: string, startTime: number, endTime: number): string =>
  mid
    ? `${BASE_URL_V3}/mca-invoice/${mid}/get-invoice-summary?startTime=${startTime}&endTime=${endTime}`
    : "";

// ── Link transaction ────────────────────────────────────────────────────────
// Copied from pg-dashboard/src/features/mca-link-transaction/service.ts.

/** Transactions this invoice may be attached to. */
export const linkableTransactionsApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/get-transactions` : "";

/**
 * The inverse read: invoices this TRANSACTION may be attached to.
 *
 * Copied from pg-dashboard/src/features/mca-link-invoice/service.ts. Same link
 * POST below settles either direction — only the list differs, because the two
 * entry points start from opposite ends (an invoice looking for its
 * transaction, or a transaction looking for its invoice).
 */
export const linkableInvoicesApi = (mid: string, gid: string): string =>
  mid && gid ? `${BASE_URL_V3}/mca-invoice/${mid}/${gid}/get-invoices` : "";

/** POST with body `{ userLinkConsent }` to attach the invoice to a transaction. */
export const linkInvoiceToTransactionApi = (mid: string, invoiceId: string, gid: string): string =>
  mid && invoiceId && gid
    ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/link-invoice/${gid}`
    : "";

// ── Upload invoice ──────────────────────────────────────────────────────────
// "Upload Invoice" on this page, ported from pg-dashboard's UploadInvoiceDrawer
// (src/features/mca-invoices/components + hooks.tsx). A merchant who already
// has an invoice of their own does not have to re-key it into the editor: the
// PDF is uploaded, the server extracts it, and the merchant confirms what was
// read before the invoice record is created.
//
// Three legs, in order:
//   1. PUT  upload-invoice?disableInvoice=false -> { upload_url, metaData }
//   2. PUT  the file to upload_url (S3, signed against the x-amz-meta headers)
//   3. GET  get-invoice, polled until extraction lands, then POST
//      add-client-invoice with the confirmed fields.
//
// `disableInvoice` is what separates this from the transaction-side scan in
// mca-transactions/services.ts: true there means "read it, but do not create an
// invoice record"; false here means the upload IS the invoice.

/** Leg 1: asks for an S3 upload URL plus the invoiceId extraction is keyed by. */
export const uploadInvoiceApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/upload-invoice?disableInvoice=false` : "";

/** Leg 3: what extraction read off the PDF, plus the merchant's client list.
 *  Returns `{ data: null }` until extraction finishes, so it is polled. */
export const scannedInvoiceApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/get-invoice` : "";

/** Leg 3: POST the confirmed fields; this is what creates the invoice. */
export const addClientInvoiceApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/add-client-invoice` : "";
