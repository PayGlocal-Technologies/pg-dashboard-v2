export const DASHBOARD_LAYOUT_STORAGE_KEY = "payglocal_dashboard_layout_v2";

export const MIN_DASHBOARD_WIDGETS = 2;

export type WidgetCategory =
  | "Payments"
  | "Settlements"
  | "Customers"
  | "India & growth"
  | "Risk & Disputes"
  | "Charts";

export type WidgetId =
  | "payments_successful_kpi"
  | "payments_attempts_kpi"
  | "payments_success_rate_kpi"
  | "payments_avg_ticket_kpi"
  | "payments_refunds_kpi"
  | "payments_failed_kpi"
  | "charts_monthly_volume"
  | "charts_gross_volume_split"
  | "charts_hourly_traffic"
  | "charts_payment_split"
  | "charts_upi_vs_card_weekly"
  | "charts_net_vs_gross"
  | "charts_inr_fx_split"
  | "charts_settlement_lag"
  | "charts_decline_reasons"
  | "settlements_due_kpi"
  | "settlements_today_kpi"
  | "settlements_next_date"
  | "customers_active_kpi"
  | "customers_new_kpi"
  | "customers_repeat_kpi"
  | "customers_country_insights"
  | "customers_state_insights"
  | "customers_top_table"
  | "risk_open_disputes_kpi"
  | "risk_dispute_rate_kpi"
  | "risk_blocked_kpi";

export type WidgetCatalogEntry = {
  id: WidgetId;
  name: string;
  category: WidgetCategory;
  iconName: string;
  lgColSpan: 3 | 4 | 5 | 6 | 7 | 8 | 12;
};

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  { id: "payments_successful_kpi", name: "Successful Payments", category: "Payments", iconName: "credit-card", lgColSpan: 4 },
  { id: "payments_attempts_kpi", name: "Payment Attempts", category: "Payments", iconName: "activity", lgColSpan: 4 },
  { id: "payments_success_rate_kpi", name: "Success Rate", category: "Payments", iconName: "trending-up", lgColSpan: 4 },
  { id: "payments_avg_ticket_kpi", name: "Average Ticket Size", category: "Payments", iconName: "wallet", lgColSpan: 4 },
  { id: "payments_refunds_kpi", name: "Refunds", category: "Payments", iconName: "refresh", lgColSpan: 4 },
  { id: "payments_failed_kpi", name: "Failed Payments", category: "Payments", iconName: "shield-alert", lgColSpan: 4 },
  { id: "charts_monthly_volume", name: "Monthly Volume", category: "Charts", iconName: "bar-chart", lgColSpan: 7 },
  { id: "charts_gross_volume_split", name: "Gross Volume Split (Intl vs Domestic)", category: "India & growth", iconName: "globe", lgColSpan: 7 },
  { id: "charts_hourly_traffic", name: "Hourly Traffic", category: "Charts", iconName: "line-chart", lgColSpan: 6 },
  { id: "charts_payment_split", name: "Payment Method Split", category: "Charts", iconName: "pie-chart", lgColSpan: 6 },
  { id: "charts_upi_vs_card_weekly", name: "UPI vs Card (weekly)", category: "India & growth", iconName: "credit-card", lgColSpan: 7 },
  { id: "charts_net_vs_gross", name: "Net vs gross (after fees)", category: "Charts", iconName: "trending-up", lgColSpan: 6 },
  { id: "charts_inr_fx_split", name: "INR vs FX volume", category: "India & growth", iconName: "globe", lgColSpan: 4 },
  { id: "charts_settlement_lag", name: "Settlement speed (T+N)", category: "Settlements", iconName: "timer", lgColSpan: 5 },
  { id: "charts_decline_reasons", name: "Decline reasons", category: "Risk & Disputes", iconName: "alert-triangle", lgColSpan: 6 },
  { id: "settlements_due_kpi", name: "Settlements Due", category: "Settlements", iconName: "wallet", lgColSpan: 4 },
  { id: "settlements_today_kpi", name: "Settled Today", category: "Settlements", iconName: "trending-up", lgColSpan: 4 },
  { id: "settlements_next_date", name: "Next Settlement Date", category: "Settlements", iconName: "activity", lgColSpan: 4 },
  { id: "customers_active_kpi", name: "Active Customers", category: "Customers", iconName: "users", lgColSpan: 4 },
  { id: "customers_new_kpi", name: "New Customers", category: "Customers", iconName: "users", lgColSpan: 4 },
  { id: "customers_repeat_kpi", name: "Repeat Rate", category: "Customers", iconName: "repeat", lgColSpan: 4 },
  { id: "customers_country_insights", name: "Country Insights", category: "Customers", iconName: "globe", lgColSpan: 5 },
  { id: "customers_state_insights", name: "India — state volume", category: "India & growth", iconName: "map-pin", lgColSpan: 6 },
  { id: "customers_top_table", name: "Top Customers", category: "Customers", iconName: "users", lgColSpan: 12 },
  { id: "risk_open_disputes_kpi", name: "Open Disputes", category: "Risk & Disputes", iconName: "alert-triangle", lgColSpan: 4 },
  { id: "risk_dispute_rate_kpi", name: "Dispute Rate", category: "Risk & Disputes", iconName: "shield-alert", lgColSpan: 4 },
  { id: "risk_blocked_kpi", name: "Blocked Transactions", category: "Risk & Disputes", iconName: "ban", lgColSpan: 4 },
];

export const WIDGET_BY_ID: Record<WidgetId, WidgetCatalogEntry> = WIDGET_CATALOG.reduce(
  (acc, e) => {
    acc[e.id] = e;
    return acc;
  },
  {} as Record<WidgetId, WidgetCatalogEntry>
);

export const DEFAULT_DASHBOARD_LAYOUT: WidgetId[] = [
  "charts_monthly_volume",
  "customers_country_insights",
];

const ALL_IDS = new Set<string>(WIDGET_CATALOG.map((w) => w.id));

function isWidgetId(id: string): id is WidgetId {
  return ALL_IDS.has(id);
}

export function parseStoredLayout(raw: string | null): WidgetId[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: WidgetId[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string" || !isWidgetId(item) || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    if (out.length < MIN_DASHBOARD_WIDGETS) return null;
    return out;
  } catch {
    return null;
  }
}

export function readDashboardLayout(): WidgetId[] {
  if (typeof window === "undefined") return [...DEFAULT_DASHBOARD_LAYOUT];
  const parsed = parseStoredLayout(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY));
  return parsed ?? [...DEFAULT_DASHBOARD_LAYOUT];
}

export function writeDashboardLayout(layout: WidgetId[]): void {
  if (typeof window === "undefined") return;
  if (layout.length < MIN_DASHBOARD_WIDGETS) return;
  localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export const CATEGORY_ORDER: WidgetCategory[] = [
  "Payments",
  "Charts",
  "India & growth",
  "Settlements",
  "Customers",
  "Risk & Disputes",
];
