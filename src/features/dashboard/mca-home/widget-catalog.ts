export const MCA_DASHBOARD_LAYOUT_STORAGE_KEY = "payglocal_mca_dashboard_layout_v1";

export const MIN_MCA_DASHBOARD_WIDGETS = 2;

export type McaWidgetCategory = "Invoices" | "Payments" | "FX & Currency" | "Clients" | "Charts";

/**
 * Only widgets backed by a live endpoint. Every one of them renders real data
 * or its own empty/error state, never a mock figure.
 *
 * BACKEND GAP, deliberately not offered: Invoice Trend (McaInvoiceTrendCard,
 * spec 4.2) and Settlement Speed (McaSettlementSpeedCard, spec 4.5) have their
 * cards built but no endpoint anywhere; Avg Invoice Value, FX Rate Realized,
 * Pending Conversion, FX Gain / Loss, Active Clients, New Clients and Client
 * Concentration have none either (spec 4.6). Add an id back here, and its case
 * to McaDashboardWidgetRenderer, once its endpoint exists. A stored layout
 * that still names a dropped id simply loses it (see parseStoredMcaLayout).
 */
export type McaWidgetId =
  | "transactions"
  | "currency-split"
  | "total-invoiced"
  | "outstanding-amount"
  | "saved-amount"
  | "active-invoices"
  | "overdue-invoices"
  | "next-settlement"
  | "top-currency"
  | "client-analytics";

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
  { id: "next-settlement", name: "Next Settlement", category: "Payments", lgColSpan: 4 },
  { id: "top-currency", name: "Top Currency", category: "FX & Currency", lgColSpan: 4 },
  { id: "client-analytics", name: "Client Analytics", category: "Clients", lgColSpan: 4 },
  { id: "transactions", name: "Transactions (Globe)", category: "Charts", lgColSpan: 12 },
  { id: "currency-split", name: "Currency Split", category: "Charts", lgColSpan: 4 },
];

export const MCA_WIDGET_BY_ID: Record<McaWidgetId, McaWidgetCatalogEntry> =
  MCA_WIDGET_CATALOG.reduce(
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
  // Swapped in for "currency-split", per explicit request — still in the
  // catalog above, so it's still available from "Add widget".
  "client-analytics",
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
