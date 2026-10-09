import { BASE_URL_V1, BASE_URL_V2 } from "@/api";

/**
 * Dispute management endpoints for the merchant flow, verbatim from
 * pg-dashboard (uat) `src/features/chargebacks/services.ts`, plus the report
 * endpoints from `components/Common/ReportDownload`. Builders that take an id
 * return `""` when it is missing, so a disabled query cannot build a
 * malformed URL.
 *
 * Internal-only endpoints (internal notes, represent docs, notify, edit,
 * debit, close, bulk, AI insights) are not ported: no merchant screen calls
 * them.
 */

const both = (a: string, b: string) => Boolean(a && b);

// ── List + reports ────────────────────────────────────────────────────────────

/** createGetChargebacksApi. A POST that reads. */
export const disputeSearchApi = `${BASE_URL_V1}/search/cb`;

/** The report drawer's "V1" source: a direct CSV (ChargebacksTable's ReportDownload `url`). */
export const disputeReportV1Api = `${BASE_URL_V1}/search/cb/download`;

/** useAsyncReportDownload submit, the drawer's default ("V2") source: returns a reportId. */
export const disputeReportApi = `${BASE_URL_V1}/cb/report/download`;

/** useAsyncReportDownload poll. */
export const disputeReportStatusApi = (reportId: string) =>
  reportId ? `${BASE_URL_V1}/cb/report/download/status/${reportId}` : "";

/** createGetStaticCbCaseDataApi: reason codes and the documents each needs. */
export const cbStaticDataApi = `${BASE_URL_V2}/cb/static/data`;

// ── Case reads ────────────────────────────────────────────────────────────────

export const cbDetailsApi = (mid: string, cbId: string) =>
  both(mid, cbId) ? `${BASE_URL_V2}/cb/details/${mid}/${cbId}` : "";

export const cbTimelineApi = (mid: string, cbId: string) =>
  both(mid, cbId) ? `${BASE_URL_V2}/cb/details/${mid}/${cbId}/timeline` : "";

export const cbUploadedDocsApi = (cbId: string) =>
  cbId ? `${BASE_URL_V2}/cb/${cbId}/doc/details` : "";

export const cbUploadedCdfApi = (cbId: string) =>
  cbId ? `${BASE_URL_V2}/cb/${cbId}/cdf/details` : "";

export const cbMessagesApi = (mid: string, cbId: string) =>
  both(mid, cbId) ? `${BASE_URL_V2}/cb/${mid}/messaging/${cbId}` : "";

export const cbSendMessageApi = (mid: string, cbId: string) =>
  both(mid, cbId) ? `${BASE_URL_V2}/cb/${mid}/messaging/${cbId}/send` : "";

// ── Case writes ───────────────────────────────────────────────────────────────

export const cbAcceptApi = (mid: string, cbId: string) =>
  both(mid, cbId) ? `${BASE_URL_V2}/cb/${mid}/${cbId}/accept` : "";

export const cbContestApi = (mid: string, cbId: string) =>
  both(mid, cbId) ? `${BASE_URL_V2}/cb/${mid}/${cbId}/contest` : "";

export const cbFulfillmentApi = (mid: string, cbId: string) =>
  both(mid, cbId) ? `${BASE_URL_V2}/cb/${mid}/fulfillment/${cbId}` : "";

/** cbFileUploadUrl(cbId, isInternal=false): a merchant's upload goes to `/merchant`. */
export const cbMerchantDocUploadApi = (cbId: string) =>
  cbId ? `${BASE_URL_V2}/cb/${cbId}/doc/update/merchant` : "";

export const cbUploadStatusApi = (cbId: string, fileId: string) =>
  both(cbId, fileId) ? `${BASE_URL_V2}/cb/${cbId}/doc/verify-upload/${fileId}` : "";

/** createRemoveUploadedDocApi: removing a submitted-for-upload proof document. */
export const cbRemoveProofDocApi = (cbId: string) =>
  cbId ? `${BASE_URL_V2}/cb/${cbId}/doc/delete/proof` : "";

export const cbSubmitEvidenceApi = (cbId: string) =>
  cbId ? `${BASE_URL_V2}/cb/${cbId}/doc/submit-evidence` : "";
