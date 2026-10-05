import { BASE_URL_V1 } from "@/api";

// Endpoint URL builders only, ported verbatim from pg-dashboard's
// src/features/manage-mandates/services.ts (plus the report URL its table
// inlines).

/** Mandate list. POST TableReqBody, MIDs as `fieldSearch.mid`. */
export const mandateSearchApi = `${BASE_URL_V1}/search/mandate`;

/** CSV export of the list for a MID. POST the date-window body, blob back. */
export const mandateReportDownloadApi = (mid: string): string =>
  `${BASE_URL_V1}/search/mandate/${mid}/download`;

/** One mandate's change log. POST `{ hashOfMandateId }`. */
export const mandateHistoryApi = (mid: string): string =>
  `${BASE_URL_V1}/customer-data/mandate/${mid}/history`;

/** PUT `{ hashOfMandateId }`. No step-up verification. */
export const disableMandateApi = (mid: string): string =>
  `${BASE_URL_V1}/customer-data/mandate/status/${mid}/disable`;

/** PUT `{ hashOfMandateId, startDate: "YYYYMMDD" }`, after MFA. */
export const pauseMandateApi = (mid: string): string =>
  `${BASE_URL_V1}/customer-data/mandate/status/${mid}/pause`;

/** PUT `{ hashOfMandateId }`, after MFA. */
export const activateMandateApi = (mid: string): string =>
  `${BASE_URL_V1}/customer-data/mandate/status/${mid}/activate`;

/** GET. `payGlocalScheduler` gates Pause and Activate. */
export const siConfigApi = (mid: string): string => `${BASE_URL_V1}/merchants/${mid}/si/config`;
