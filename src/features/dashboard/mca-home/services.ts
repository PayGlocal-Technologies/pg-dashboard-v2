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
