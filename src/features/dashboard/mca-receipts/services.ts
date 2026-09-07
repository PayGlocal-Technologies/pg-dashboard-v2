import { BASE_URL_V3 } from "@/api";

/**
 * Receipts / GST-invoice endpoints, ported verbatim from pg-dashboard's
 * invoice-download feature (`src/features/invoice-download/service.ts` — the
 * old feature named it `service.ts`, singular).
 *
 * Both are POST, v3. The list is fetched once per MID and merged client-side;
 * the download returns a presigned URL opened in a new tab. No MFA.
 */

/** Invoice list for one MID. POST InvoiceViewRequestParams → { data: { views } }. */
export const merchantInvoicesViewApi = (mid: string): string =>
  `${BASE_URL_V3}/merchant-invoices/${mid}/view`;

/**
 * Download one invoice → { data: { presignedUrl } }. POST, empty body.
 * The path key is the record's `productServicePeriod`, NOT its invoiceNumber
 * (see pg-dashboard's handleDownloadInvoice).
 */
export const merchantInvoiceDownloadApi = (mid: string, servicePeriod: string): string =>
  `${BASE_URL_V3}/merchant-invoices/${mid}/download/${servicePeriod}`;
