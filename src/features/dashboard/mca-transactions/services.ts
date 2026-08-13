import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

// Endpoint URL builders only — no fetch/axios logic here. Every path below is
// copied verbatim from pg-dashboard (src/components/TransactionDetails/
// services.ts and its TxnDetails index), which is the production source of
// truth for these contracts.

/** MCA (Multi-Currency Accounts) OpenSearch endpoint */
export const mcaTxnSearchApi = (mid: string) => `${BASE_URL_V1}/search/ffms/txn/${mid}`;

/** Settlement timeline for one transaction, keyed by gid alone (no mid). */
export const mcaTxnTimelineApi = (gid: string) =>
  gid ? `${BASE_URL_V1}/ffms/timeline/${gid}/new-flow` : "";

/** Documents already uploaded against a transaction. */
export const mcaTxnDocumentsApi = (mid: string, gid: string) =>
  mid && gid ? `${BASE_URL_V1}/ffms/transaction/${mid}/${gid}/documents` : "";

/**
 * Presigned-URL GET for a single document. `documentPath` is the suffix after
 * `/ffms/transaction/` — either an entry straight out of `documentsPresent`,
 * or a `merchantId/gid/fileName` triple built by mcaTxnFilePath below.
 */
export const mcaTxnDocumentPresignApi = (documentPath: string) =>
  documentPath ? `${BASE_URL_V1}/ffms/transaction/${documentPath}` : "";

export const mcaTxnFilePath = (mid: string, gid: string, fileName: string) =>
  `${mid}/${gid}/${fileName}`;

/** FRM (compliance review) status plus its message thread. */
export const mcaFrmStatusApi = (mid: string, gid: string) =>
  mid && gid ? `${BASE_URL_V1}/ffms/compliance/${mid}/${gid}/frm/status` : "";

/** Ops ↔ merchant thread for additional documents requested on a transaction. */
export const mcaAdditionalDocConversationApi = (mid: string, gid: string) =>
  mid && gid ? `${BASE_URL_V1}/ffms/compliance/${mid}/${gid}/additional-document/conversation` : "";

// Attachment endpoints for the two query threads. Each is used three ways,
// distinguished by verb and query string, exactly as pg-dashboard does:
//   PUT  ?extension=.pdf  -> { fileUUID, presignedUrl, metaData } to upload to
//   GET  ?docUUID=<uuid>  -> { presignedUrl } to download an existing file
export const mcaFrmFileApi = (mid: string, gid: string) =>
  mid && gid ? `${BASE_URL_V1}/ffms/transaction/${mid}/${gid}/frm` : "";

export const mcaAdditionalDocFileApi = (mid: string, gid: string) =>
  mid && gid ? `${BASE_URL_V1}/ffms/transaction/${mid}/${gid}/additional-document` : "";

/** PUT a new message onto the compliance thread. */
export const mcaFrmConversationApi = (mid: string, gid: string) =>
  mid && gid ? `${BASE_URL_V1}/ffms/compliance/${mid}/${gid}/frm/conversation` : "";

/** Returns presigned URLs for the transaction's FIRC/FIRA documents. */
export const mcaFircDownloadApi = (mid: string, gid: string) =>
  mid && gid ? `${BASE_URL_V1}/firc/mca/${mid}/${gid}` : "";

// ── Purpose codes (invoice upload) ──────────────────────────────────────────
// Which RBI purpose codes a merchant may pick from is merchant configuration,
// not a static list, so it is fetched. The code→description text those codes
// are shown with is the static RBI table in purposeCodes.ts.

/** The codes suggested for this merchant: `{ data: { suggestedPurposeCodes } }`. */
export const merchantPurposeCodesApi = (mid: string) =>
  mid ? `${BASE_URL_V1}/merchants/${mid}/purpose-codes` : "";

/** Merchant profile, whose `purposeCode` is the last-selected/default one. */
export const merchantProfileApi = (mid: string) =>
  mid ? `${BASE_URL_V1}/merchants/${mid}/profile` : "";

/** PUT to persist the merchant's chosen purpose code back onto the profile. */
export const merchantProfilePurposeCodeApi = (mid: string, purposeCode: string) =>
  mid && purposeCode ? `${BASE_URL_V1}/merchants/${mid}/profile/${purposeCode}` : "";

// ── Invoice upload ──────────────────────────────────────────────────────────
// Uploading an invoice against a transaction is a two-leg flow, mirroring
// pg-dashboard's TransactionInvoiceUploadFlow:
//
//   Leg 1 (scan)   PUT upload-invoice -> presigned S3 PUT -> poll
//                  invoice-matching until the extracted invoice has been
//                  compared against the transaction.
//   Leg 2 (submit) PUT ffms .../upload with the purpose code -> presigned S3
//                  PUT, which is what actually attaches the invoice.
//
// The file is uploaded twice by design: the first copy feeds extraction and is
// discarded if the merchant re-uploads, the second is the submitted document.

/** Leg 1: asks for an S3 upload URL plus the invoiceId extraction is keyed by.
 *  disableInvoice=true means "scan only, don't create an invoice record". */
export const mcaInvoiceScanUploadApi = (mid: string) =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/upload-invoice?disableInvoice=true` : "";

/** Leg 1: extraction + comparison result, polled until it resolves. */
export const mcaInvoiceMatchingApi = (mid: string, gid: string, invoiceId: string) =>
  mid && gid && invoiceId
    ? `${BASE_URL_V3}/mca-invoice/${mid}/invoice-matching/${gid}/${invoiceId}`
    : "";

/** Asks ops to regenerate the FIRC with the remitter name found on the
 *  invoice, when the merchant opts into that after a name mismatch. */
export const mcaInvoiceNameMismatchEmailApi = (mid: string) =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/invoice-matching/send-email` : "";

/** Leg 2: attaches the invoice to the transaction; returns the S3 URL to PUT
 *  the file to. Takes the purpose code and file extension as form data. */
export const ffmsInvoiceUploadApi = (gid: string) =>
  gid ? `${BASE_URL_V1}/ffms/transaction/${gid}/upload` : "";

// ── MCA (PACB) business overview ────────────────────────────────────────────
// Backs the Transactions page's analytics cards. pg-dashboard picks between
// these two by whether a specific MID is selected: with one, the merchant
// variant; without, the UCIC-level roll-up across the user's merchants.

export const mcaOverviewByMidApi = (mid: string) =>
  mid ? `${BASE_URL_V3}/analytics/${encodeURIComponent(mid)}/merchant/getPacbOverview` : "";

export const mcaOverviewByUcicApi = (ucicId: string) =>
  ucicId ? `${BASE_URL_V3}/analytics/${encodeURIComponent(ucicId)}/getPacbOverview` : "";


/** Transactions export. POST the same OpenSearch body the table uses; the
 *  response is an xlsx blob, not JSON. */
export const mcaTxnReportDownloadApi = (mid: string) =>
  `${BASE_URL_V1}/search/ffms/txn/${mid}/download`;
