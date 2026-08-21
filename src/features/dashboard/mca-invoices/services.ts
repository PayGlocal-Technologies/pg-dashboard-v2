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

/** POST with body `{ userLinkConsent }` to attach the invoice to a transaction. */
export const linkInvoiceToTransactionApi = (mid: string, invoiceId: string, gid: string): string =>
  mid && invoiceId && gid
    ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/link-invoice/${gid}`
    : "";
