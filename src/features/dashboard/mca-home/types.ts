// Real API contracts for the MCA dashboard. Ported verbatim from
// pg-dashboard/src/features/dashboard/types.ts.
//
// Only the client-analytics endpoint is represented here. Every other figure on
// this dashboard is still mock (see mock-data.ts) because no endpoint returns it;
// those shapes live in mock-data.ts until one does.

/** One row of getClientData. `totalAmount` is a decimal string, not a number. */
export interface ClientAnalyticsRecord {
  client: string;
  totalAmount: string;
}

/**
 * Keyed by merchant id, because one session can span several MIDs. A merchant
 * with no activity in the window is absent from the map rather than present with
 * an empty array, so callers must tolerate a missing key.
 */
export interface ClientAnalyticsResponse {
  data: Record<string, ClientAnalyticsRecord[]>;
  message?: string;
}
