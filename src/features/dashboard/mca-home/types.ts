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

// ── Revenue trend ────────────────────────────────────────────────────────────
// Backs McaRevenueCard's chart. Maps 1:1 onto the mock RevenueSeries in
// mock-data.ts (currency/total/previousTotal/trendPct/comparisonLabel/points),
// so wiring it up is a source swap. The mock RevenuePoint's `x` is this point's
// `label`; periodStart/periodEnd have no mock equivalent (unused by the chart).

export interface RevenueTrendPoint {
  label: string;
  periodStart: string;
  periodEnd: string;
  current: number;
  previous: number;
}

export interface RevenueTrendData {
  currency: string;
  total: number;
  previousTotal: number;
  trendPct: number;
  comparisonLabel: string;
  points: RevenueTrendPoint[];
}

export interface RevenueTrendResponse {
  message?: string;
  errors?: unknown;
  data: RevenueTrendData;
}

// ── Top clients ──────────────────────────────────────────────────────────────
// Backs McaClientAnalyticsCard. `barPct` is the bar width (0–100) relative to
// the top row, so the card no longer has to derive it from the max amount.

export interface TopClientRow {
  client: string;
  amount: number;
  count: number;
  barPct: number;
}

export interface TopClientsData {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
  rows: TopClientRow[];
}

export interface TopClientsResponse {
  message?: string;
  errors?: unknown;
  data: TopClientsData;
}

// ── Needs attention ──────────────────────────────────────────────────────────
// Backs McaNeedsAttentionCard. One row per invoice that is overdue or due soon.
// `attentionStatus` drives the row's tone/label; `daysRemaining` is negative
// once overdue (e.g. -6 = six days past due), positive while still due soon.

export type InvoiceAttentionStatus = "OVERDUE" | "DUE_SOON";

export interface NeedsAttentionInvoice {
  id: string;
  invoiceId: string;
  clientName: string;
  clientBusinessName: string;
  currency: string;
  totalAmount: number;
  invoiceNumber: string;
  dueDate: string;
  attentionStatus: InvoiceAttentionStatus;
  daysRemaining: number;
}

export interface NeedsAttentionData {
  totalCount: number;
  data: NeedsAttentionInvoice[];
}

export interface NeedsAttentionResponse {
  message?: string;
  errors?: unknown;
  data: NeedsAttentionData;
}
