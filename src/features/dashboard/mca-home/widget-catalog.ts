export const MCA_DASHBOARD_LAYOUT_STORAGE_KEY = "payglocal_mca_dashboard_layout_v1";

export const MIN_MCA_DASHBOARD_WIDGETS = 2;

export type McaWidgetCategory = "Invoices" | "Payments" | "FX & Currency" | "Clients" | "Charts";

export type McaWidgetId =
  | "transactions"
  | "invoice-trend"
  | "currency-split"
  | "total-invoiced"
  | "outstanding-amount"
  | "saved-amount"
  | "active-invoices"
  | "overdue-invoices"
  | "avg-invoice-value"
  | "avg-payment-time"
  | "next-settlement"
  | "fx-rate-realized"
  | "top-currency"
  | "pending-conversion"
  | "fx-gain-loss"
  | "active-clients"
  | "new-clients"
  | "client-concentration";

/** Widget ids rendered via the generic McaStatCard (everything except the
 * dedicated chart/saved-amount/settlement-speed cards), see
 * McaDashboardWidgetRenderer. */
export type McaStatWidgetId = Exclude<
  McaWidgetId,
  "transactions" | "invoice-trend" | "currency-split" | "saved-amount" | "avg-payment-time"
>;

export type McaWidgetCatalogEntry = {
  id: McaWidgetId;
  name: string;
  category: McaWidgetCategory;
  lgColSpan: 4 | 8 | 12;
};

export const MCA_WIDGET_CATALOG: McaWidgetCatalogEntry[] = [
  { id: "total-invoiced", name: "Total Invoiced", category: "Invoices", lgColSpan: 4 },
  { id: "outstanding-amount", name: "Outstanding Amount", category: "Invoices", lgColSpan: 4 },
  { id: "saved-amount", name: "Saved Amount", category: "Invoices", lgColSpan: 4 },
  { id: "active-invoices", name: "Active Invoices", category: "Invoices", lgColSpan: 4 },
  { id: "overdue-invoices", name: "Overdue Invoices", category: "Invoices", lgColSpan: 4 },
  { id: "avg-invoice-value", name: "Avg Invoice Value", category: "Invoices", lgColSpan: 4 },
  { id: "avg-payment-time", name: "Settlement Speed", category: "Payments", lgColSpan: 4 },
  { id: "next-settlement", name: "Next Settlement", category: "Payments", lgColSpan: 4 },
  { id: "fx-rate-realized", name: "FX Rate Realized", category: "FX & Currency", lgColSpan: 4 },
  { id: "top-currency", name: "Top Currency", category: "FX & Currency", lgColSpan: 4 },
  { id: "pending-conversion", name: "Pending Conversion", category: "FX & Currency", lgColSpan: 4 },
  { id: "fx-gain-loss", name: "FX Gain / Loss", category: "FX & Currency", lgColSpan: 4 },
  { id: "active-clients", name: "Active Clients", category: "Clients", lgColSpan: 4 },
  { id: "new-clients", name: "New Clients", category: "Clients", lgColSpan: 4 },
  { id: "client-concentration", name: "Client Concentration", category: "Clients", lgColSpan: 4 },
  { id: "transactions", name: "Transactions (Globe)", category: "Charts", lgColSpan: 12 },
  { id: "invoice-trend", name: "Invoice Trend", category: "Charts", lgColSpan: 8 },
  { id: "currency-split", name: "Currency Split", category: "Charts", lgColSpan: 4 },
];

export const MCA_WIDGET_BY_ID: Record<McaWidgetId, McaWidgetCatalogEntry> = MCA_WIDGET_CATALOG.reduce(
  (acc, e) => {
    acc[e.id] = e;
    return acc;
  },
  {} as Record<McaWidgetId, McaWidgetCatalogEntry>
);

export const DEFAULT_MCA_DASHBOARD_LAYOUT: McaWidgetId[] = [
  "transactions",
  "total-invoiced",
  // Hidden from the default view for now (kept in the catalog / code):
  // "outstanding-amount",
  "saved-amount",
  // "invoice-trend",
  "currency-split",
];

const ALL_MCA_WIDGET_IDS = new Set<string>(MCA_WIDGET_CATALOG.map((w) => w.id));

function isMcaWidgetId(id: string): id is McaWidgetId {
  return ALL_MCA_WIDGET_IDS.has(id);
}

export function parseStoredMcaLayout(raw: string | null): McaWidgetId[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: McaWidgetId[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string" || !isMcaWidgetId(item) || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    if (out.length < MIN_MCA_DASHBOARD_WIDGETS) return null;
    return out;
  } catch {
    return null;
  }
}

export function readMcaDashboardLayout(): McaWidgetId[] {
  if (typeof window === "undefined") return [...DEFAULT_MCA_DASHBOARD_LAYOUT];
  const parsed = parseStoredMcaLayout(localStorage.getItem(MCA_DASHBOARD_LAYOUT_STORAGE_KEY));
  return parsed ?? [...DEFAULT_MCA_DASHBOARD_LAYOUT];
}

export function writeMcaDashboardLayout(layout: McaWidgetId[]): void {
  if (typeof window === "undefined") return;
  if (layout.length < MIN_MCA_DASHBOARD_WIDGETS) return;
  localStorage.setItem(MCA_DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export const MCA_CATEGORY_ORDER: McaWidgetCategory[] = [
  "Invoices",
  "Payments",
  "FX & Currency",
  "Clients",
  "Charts",
];
