import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

/**
 * Settlement report endpoints, ported verbatim from pg-dashboard's `reports`
 * feature (inline URLs in ReportTable.tsx / FfmsReportTable.tsx — the old
 * feature had no services.ts). Two product families:
 *   - PA  (Payments)              → GET  summary + GET  per-date download URL
 *   - FFMS (Multi-Currency / PACB) → POST summary + POST per-date presigned URL
 */

/**
 * PA settlement summary. `dateRange` is a pre-joined "YYYY-MM-DD/YYYY-MM-DD"
 * string (old code builds it with `formatYYYYMMDD().replaceAll("/", "-")`).
 */
export const paSettlementReportsApi = (mid: string, dateRange?: string): string =>
  `${BASE_URL_V3}/settlements/reports/merchants/${mid}${dateRange ? `/${dateRange}` : ""}`;

/** PA per-settlement report download → { data: { downloadUrl } }. */
export const paSettlementDownloadApi = (mid: string, date: string): string =>
  `${BASE_URL_V1}/settlements/reports/merchants/${mid}/${date}`;

/** FFMS (PACB) settlement summary → { data: { summary } }. POST TableReqBody. */
export const ffmsSettlementSummaryApi = (mid: string): string =>
  `${BASE_URL_V1}/ffms/settlement-report/${mid}/summary`;

/** FFMS per-settlement report download → { data: { presignedUrl } }. POST {}. */
export const ffmsSettlementDownloadApi = (mid: string, date: string): string =>
  `${BASE_URL_V1}/ffms/settlement-report/${mid}/${date}`;

/**
 * Settlement overview analytics — total settled + trend + chart series +
 * previous-settlement headline, for a timeframe (week | month | ytd). Backs the
 * Total settled card. Merchant-scoped.
 */
export const settlementOverviewApi = (merchantId: string, timeframe: string): string =>
  merchantId
    ? `${BASE_URL_V3}/analytics/${encodeURIComponent(merchantId)}/merchant/settlement/overview` +
      `?timeframe=${encodeURIComponent(timeframe)}`
    : "";

/**
 * Upcoming settlement — current-state headline (amount, txn count, pending
 * invoices). No query params; always reflects the present. Merchant-scoped.
 */
export const settlementUpcomingApi = (merchantId: string): string =>
  merchantId
    ? `${BASE_URL_V3}/analytics/${encodeURIComponent(merchantId)}/merchant/settlement/upcoming`
    : "";

// ── Settlement list and detail (new contract) ───────────────────────────────
// Replace the PA/FFMS summary pair above once these are deployed. Keyed by
// settlement DATE, not by a settlement id: an account settles at most once a
// day, so (merchantId, settlementDate) is the primary key.

export interface SettlementListParams {
  /** YYYY-MM-DD, optional — omit both bounds for the unfiltered list. */
  startDate?: string;
  endDate?: string;
  /** 1-based. */
  page?: number;
  limit?: number;
}

/** Settlement list → { data: { settlements, totalCount } }. Merchant-scoped;
 *  accepts the UCIC id for a multi-MID account, in which case rows span
 *  merchants and each names its own `merchantId`. */
export const settlementListApi = (
  merchantId: string,
  params: SettlementListParams = {}
): string => {
  if (!merchantId) return "";
  const query = new URLSearchParams();
  if (params.startDate && params.endDate) {
    query.set("startDate", params.startDate);
    query.set("endDate", params.endDate);
  }
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString();
  return (
    `${BASE_URL_V3}/analytics/${encodeURIComponent(merchantId)}/merchant/settlement-list` +
    (suffix ? `?${suffix}` : "")
  );
};

/** One settlement in full → { data: { ...breakup, payments } }. The merchant is
 *  in the path and the date in the query, so a UCIC-scoped list row must pass
 *  its OWN merchantId here rather than the page's scope. */
export const settlementDetailApi = (merchantId: string, settlementDate: string): string =>
  merchantId && settlementDate
    ? `${BASE_URL_V3}/analytics/${encodeURIComponent(merchantId)}/merchant/settlement-detail` +
      `?settlementDate=${encodeURIComponent(settlementDate)}`
    : "";

// ── Bank holiday calendar ───────────────────────────────────────────────────
// Verbatim from pg-dashboard's src/features/BankHolidayCalendar/services.ts.
// Both dates are inclusive YYYY-MM-DD keys; production always asks for whole
// months (getBankHolidayParams snaps to the month's first and last day) and
// caches each month it has already fetched.
//
// Returns "" when either bound is missing so a disabled query cannot build a
// half-formed URL, the same guard the builders above use.
export const bankHolidayCalendarApi = (fromDate: string, toDate: string): string =>
  fromDate && toDate ? `${BASE_URL_V1}/calendar?fromDate=${fromDate}&toDate=${toDate}` : "";
