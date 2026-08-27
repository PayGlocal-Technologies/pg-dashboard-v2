import { BASE_URL_V3 } from "@/api";

// Endpoint URL builders only — no fetch/axios logic here. Paths are copied
// verbatim from pg-dashboard's src/features/dashboard/services.ts, which is the
// production source of truth for these contracts.
//
// Note what these do NOT take: a MID. Both analytics endpoints are scoped by the
// session alone and return a map keyed by merchant id, so the caller picks its
// own MIDs out of the response rather than asking for them in the URL. That is
// pg-dashboard's behaviour, not a simplification — see useMcaClientAnalytics.

/**
 * Top clients by amount received. `days` is a plain day count; production's
 * picker offers "1", "7" and "30".
 *
 * Response: `data` keyed by merchant id, each value `{ client, totalAmount }[]`.
 */
export const clientAnalyticsApi = (days: string): string =>
  days ? `${BASE_URL_V3}/analytics/getClientData?days=${days}` : "";

/**
 * Revenue trend for McaRevenueCard's chart — current vs previous period series
 * plus the headline total/trend. Two scopes, as the backend spec gives: the
 * per-merchant path (with `/merchant`) and the UCIC roll-up (without it).
 * Empty dates let the backend default the window.
 */
export const mcaRevenueTrendByMidApi = (mid: string, startDate: string, endDate: string): string =>
  mid
    ? `${BASE_URL_V3}/analytics/${encodeURIComponent(mid)}/merchant/mca/revenue-trend` +
      `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    : "";

export const mcaRevenueTrendByUcicApi = (
  ucicId: string,
  startDate: string,
  endDate: string
): string =>
  ucicId
    ? `${BASE_URL_V3}/analytics/${encodeURIComponent(ucicId)}/mca/revenue-trend` +
      `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    : "";

/**
 * Top clients by amount over a date range — backs the Client analytics list.
 * Two scopes as the spec gives (per-merchant with `/merchant`, UCIC without).
 * `limit` defaults to 5 on the backend but is sent explicitly.
 */
export const mcaTopClientsByMidApi = (
  mid: string,
  startDate: string,
  endDate: string,
  limit: number
): string =>
  mid
    ? `${BASE_URL_V3}/analytics/${encodeURIComponent(mid)}/merchant/mca/top-clients` +
      `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=${limit}`
    : "";

export const mcaTopClientsByUcicApi = (
  ucicId: string,
  startDate: string,
  endDate: string,
  limit: number
): string =>
  ucicId
    ? `${BASE_URL_V3}/analytics/${encodeURIComponent(ucicId)}/mca/top-clients` +
      `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=${limit}`
    : "";
