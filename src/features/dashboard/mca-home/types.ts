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
// Backs McaRevenueCard's chart, and is now its only source for all three of the
// card's trend metrics — the placeholder series the other two used have been
// deleted. `label` is what the chart plots on its x-axis; periodStart/periodEnd
// are carried but unused by the chart.

/**
 * Which series revenue-trend returns. The response shape is identical for all
 * three, so the card's metric dropdown is a query-key change and nothing more.
 *
 * `number_of_payments` is the one that is NOT money: its totals are counts, and
 * the `currency` the response still carries does not apply to them.
 */
export type RevenueMetric = "revenue" | "net_volume" | "number_of_payments";

export interface RevenueTrendPoint {
  label: string;
  periodStart: string;
  periodEnd: string;
  current: number;
  previous: number;
}

export interface RevenueTrendData {
  /** Echoes back which metric was asked for. */
  metric: RevenueMetric;
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

// ── Dashboard UI shapes ──────────────────────────────────────────────────────
// Not API contracts: the shapes the dashboard's own widgets are configured and
// rendered with. They live here so nothing has to import a type out of a
// constants file.

/** The windows McaRevenueCard offers. Labels in constants.ts, day counts in
 *  the card (TIMEFRAME_DAYS). */
export type RevenueTimeframe = "1W" | "1M" | "3M";

/** One Quick access tile. See mcaQuickAccessItems in constants.ts. */
export interface QuickAccessItem {
  id: string;
  label: string;
  /** One short line under the label, e.g. "Create and send an invoice". */
  description: string;
  icon:
    | "file-text"
    | "globe-2"
    | "download"
    | "users"
    | "circle-dollar-sign"
    | "sliders-horizontal";
}

/** What the generic stat card renders. A prop shape, not a response: the
 *  figures are pre-formatted for display by whatever supplies them. */
export interface McaStatCardData {
  title: string;
  valueLabel: string;
  /** Trend row (colored icon + "X% vs last month"). Mutually exclusive with
   *  captionLabel: exactly one of the two is set per stat. */
  trendPct?: number;
  /** Plain muted caption shown instead of the trend row, for stats that
   *  aren't a month-over-month comparison (e.g. "Settles Jul 3, 12:00AM IST"). */
  captionLabel?: string;
  spark: number[];
  accentColor: string;
}

/** One month of McaInvoiceTrendCard's paid-vs-outstanding bars. */
export interface InvoiceTrendPoint {
  month: string;
  paid: number;
  outstanding: number;
}
