// TODO(integration): this whole dashboard is mock data only, wire it up to
// the real MCA analytics endpoints per the CLAUDE.md migration checklist
// before shipping, endpoint URL, request payload and response shape must all
// be copied from pg-dashboard (or the eventual MCA analytics service), not
// guessed.

import type { McaStatWidgetId } from "@/features/dashboard/mca-home/widget-catalog";

export interface RevenuePoint {
  x: string;
  current: number;
  previous: number;
}

/** Revenue trend, current (solid) vs previous period (dashed), base ("1M")
 * dataset, "1W"/"3M" scale off this, see REVENUE_TIMEFRAME_SCALE. */
export const revenueSeries: RevenuePoint[] = [
  { x: "Feb", current: 118000, previous: 12000 },
  { x: "Mar", current: 128000, previous: 15000 },
  { x: "Apr", current: 132000, previous: 18000 },
  { x: "May", current: 372000, previous: 22000 },
  { x: "Jun", current: 248000, previous: 20000 },
  { x: "Jul", current: 42000, previous: 16000 },
  { x: "Aug", current: 48000, previous: 17000 },
];

export const revenueSummary = {
  total: 930000,
  currency: "INR",
  trendPct: 14.1,
};

export type RevenueTimeframe = "1W" | "1M" | "3M";

export const revenueTimeframes: { value: RevenueTimeframe; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
];

export const REVENUE_TIMEFRAME_SCALE: Record<RevenueTimeframe, number> = {
  "1W": 0.23,
  "1M": 1,
  "3M": 3.1,
};

export const upcomingSettlement = {
  amount: 124890,
  currency: "INR",
  cycle: "T+1",
  settlesAtLabel: "12:00AM IST",
  bankAccountLabel: "Bank ****4521",
};

export interface ClientAnalyticsRow {
  name: string;
  amount: number;
}

export const clientAnalytics: ClientAnalyticsRow[] = [
  { name: "Acme Corp", amount: 163000 },
  { name: "GlobalTech Ltd", amount: 123000 },
  { name: "Nordic Solutions", amount: 97800 },
  { name: "Pacific Trade Co", amount: 88000 },
  { name: "Meridian Exports", amount: 61400 },
];

export interface NeedsAttentionRow {
  id: string;
  clientName: string;
  /** ISO 3166-1 alpha-2, or "EU" for the supranational flag (not in COUNTRIES). */
  countryCode: string;
  currency: string;
  amount: number;
  invoiceId: string;
  statusLabel: string;
  statusTone: "danger" | "warning";
  actionLabel: string;
}

export const needsAttention: NeedsAttentionRow[] = [
  {
    id: "att_1",
    clientName: "Nordic Solutions",
    countryCode: "EU",
    currency: "EUR",
    amount: 850,
    invoiceId: "INV-2026-0087",
    statusLabel: "Overdue",
    statusTone: "danger",
    actionLabel: "Remind",
  },
  {
    id: "att_2",
    clientName: "Acme Corp",
    countryCode: "US",
    currency: "USD",
    amount: 1200,
    invoiceId: "INV-2026-0091",
    statusLabel: "Due in 2 days",
    statusTone: "warning",
    actionLabel: "View",
  },
];

export interface QuickAccessItem {
  id: string;
  label: string;
  icon: "file-text" | "globe-2" | "download" | "users" | "circle-dollar-sign" | "sliders-horizontal";
}

export const mcaQuickAccessItems: QuickAccessItem[] = [
  { id: "invoice-links", label: "Invoice", icon: "file-text" },
  { id: "international-accounts", label: "International accounts", icon: "globe-2" },
  { id: "platform-withdrawal", label: "Platform withdrawal", icon: "download" },
  { id: "client-management", label: "Client management", icon: "users" },
  { id: "forex-calculator", label: "Forex calculator", icon: "circle-dollar-sign" },
  { id: "customise-dashboard", label: "Customise dashboard", icon: "sliders-horizontal" },
];

export interface InvoiceOriginRow {
  countryCode: string;
  countryName: string;
  amount: number;
  invoiceCount: number;
}

/** Base ("1M") dataset, "1W"/"3M" scale off this, see INVOICE_ORIGIN_TIMEFRAME_SCALE.
 * Already sorted descending by amount, that order doubles as each market's rank. */
export const invoiceOrigins: InvoiceOriginRow[] = [
  { countryCode: "US", countryName: "United States", amount: 118400, invoiceCount: 30 },
  { countryCode: "GB", countryName: "United Kingdom", amount: 59200, invoiceCount: 18 },
  { countryCode: "SG", countryName: "Singapore", amount: 44600, invoiceCount: 14 },
  { countryCode: "DE", countryName: "Germany", amount: 33100, invoiceCount: 10 },
  { countryCode: "AE", countryName: "UAE", amount: 24800, invoiceCount: 7 },
  { countryCode: "AU", countryName: "Australia", amount: 17500, invoiceCount: 5 },
];

export type InvoiceOriginTimeframe = "1W" | "1M" | "3M";

export const invoiceOriginTimeframes: { value: InvoiceOriginTimeframe; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
];

export const INVOICE_ORIGIN_TIMEFRAME_SCALE: Record<InvoiceOriginTimeframe, number> = {
  "1W": 0.23,
  "1M": 1,
  "3M": 3.1,
};

export const invoiceOriginTotals = {
  totalInvoiced: 298000,
  totalInvoicedTrendPct: 18,
  avgPerCountry: 50000,
  avgPerCountryTrendPct: 6,
  unitedStatesSharePct: 40,
  unitedStatesShareTrendPct: -3,
  activeMarkets: 6,
};

export interface McaStatCardData {
  title: string;
  valueLabel: string;
  /** Trend row (colored icon + "X% vs last month"). Mutually exclusive with
   * captionLabel, exactly one of the two is set per stat. */
  trendPct?: number;
  /** Plain muted caption shown instead of the trend row, for stats that
   * aren't a month-over-month comparison (e.g. "Settles Jul 3, 12:00AM IST"). */
  captionLabel?: string;
  spark: number[];
  accentColor: string;
}

export const mcaSavedAmount = {
  valueLabel: "₹8,240.25",
  description: "Amount saved on transaction fees through PayGlocal.",
};

/** Contrasts PayGlocal's actual average settlement time against the
 * standard T+1 cycle merchants are quoted, the point of this widget is to
 * show settlements clearing well inside that window, not just report a
 * number, see McaSettlementSpeedCard. */
export const settlementSpeed = {
  valueLabel: "18h",
  slaLabel: "T+1 (24h) standard",
  fasterByLabel: "6h",
  spark: [22, 21.5, 21, 20, 20, 19, 19, 18.5, 19, 18, 18, 18],
};

/** Every "stat"-kind dashboard widget's data, keyed by its widget id, see
 * widget-catalog.ts. "total-invoiced" and "outstanding-amount" are shown by
 * default, the rest are opt-in via the "Add widgets" picker. */
export const mcaStatWidgetData: Record<McaStatWidgetId, McaStatCardData> = {
  "total-invoiced": {
    title: "Total invoiced",
    valueLabel: "$2,97,600",
    trendPct: 18,
    spark: [40, 44, 42, 48, 52, 50, 58, 55, 62, 60, 66, 70],
    accentColor: "var(--chart-1)",
  },
  "outstanding-amount": {
    title: "Outstanding amount",
    valueLabel: "$41,500",
    trendPct: -8,
    spark: [58, 56, 54, 55, 52, 50, 48, 47, 45, 44, 43, 42],
    accentColor: "var(--chart-3)",
  },
  "active-invoices": {
    title: "Active invoices",
    valueLabel: "34",
    trendPct: 6,
    spark: [28, 29, 30, 31, 32, 33, 33, 34, 34, 34, 34, 34],
    accentColor: "var(--chart-1)",
  },
  "overdue-invoices": {
    title: "Overdue invoices",
    valueLabel: "5",
    trendPct: -2,
    spark: [8, 8, 7, 7, 6, 6, 6, 5, 5, 5, 5, 5],
    accentColor: "var(--chart-3)",
  },
  "avg-invoice-value": {
    title: "Avg invoice value",
    valueLabel: "$4.2K",
    captionLabel: "Per issued invoice",
    spark: [4.0, 4.1, 4.0, 4.2, 4.1, 4.3, 4.2, 4.2, 4.1, 4.2, 4.2, 4.2],
    accentColor: "var(--chart-1)",
  },
  "next-settlement": {
    title: "Next settlement",
    valueLabel: "₹1.2L",
    captionLabel: "Settles Jul 3, 12:00AM IST",
    spark: [70, 74, 78, 76, 82, 88, 90, 92, 96, 100, 104, 110],
    accentColor: "var(--chart-1)",
  },
  "fx-rate-realized": {
    title: "FX rate realized",
    valueLabel: "84.2",
    captionLabel: "USD/INR blended this month",
    spark: [84.0, 84.1, 83.9, 84.2, 84.3, 84.1, 84.2, 84.4, 84.3, 84.2, 84.2, 84.2],
    accentColor: "var(--chart-3)",
  },
  "top-currency": {
    title: "Top currency",
    valueLabel: "USD",
    captionLabel: "52% of total received volume",
    spark: [46, 47, 48, 48, 49, 50, 50, 51, 51, 52, 52, 52],
    accentColor: "var(--chart-1)",
  },
  "pending-conversion": {
    title: "Pending conversion",
    valueLabel: "$18K",
    trendPct: -12,
    spark: [24, 23, 22, 21, 21, 20, 19, 19, 18, 18, 18, 18],
    accentColor: "var(--chart-4)",
  },
  "fx-gain-loss": {
    title: "FX gain / loss",
    valueLabel: "+₹8.4K",
    trendPct: 2.3,
    spark: [4, 5, 4.5, 5.5, 6, 6.5, 7, 7.2, 7.8, 8, 8.2, 8.4],
    accentColor: "var(--chart-2)",
  },
  "active-clients": {
    title: "Active clients",
    valueLabel: "26",
    trendPct: 4,
    spark: [21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 26],
    accentColor: "var(--chart-1)",
  },
  "new-clients": {
    title: "New clients",
    valueLabel: "3",
    captionLabel: "Added this month",
    spark: [1, 2, 1, 2, 2, 3, 2, 3, 3, 3, 3, 3],
    accentColor: "var(--chart-3)",
  },
  "client-concentration": {
    title: "Client concentration",
    valueLabel: "40%",
    captionLabel: "Top client's share of revenue",
    spark: [38, 39, 38, 40, 41, 40, 39, 40, 41, 40, 40, 40],
    accentColor: "var(--chart-2)",
  },
};

export interface InvoiceTrendPoint {
  month: string;
  paid: number;
  outstanding: number;
}

export const invoiceTrend: InvoiceTrendPoint[] = [
  { month: "Jan", paid: 48, outstanding: 11 },
  { month: "Feb", paid: 62, outstanding: 8 },
  { month: "Mar", paid: 55, outstanding: 13 },
  { month: "Apr", paid: 74, outstanding: 9 },
  { month: "May", paid: 81, outstanding: 7 },
  { month: "Jun", paid: 68, outstanding: 10 },
  { month: "Jul", paid: 9, outstanding: 6 },
];

export interface CurrencySplitSlice {
  key: string;
  label: string;
  volumePct: number;
  countPct: number;
  color: string;
}

export const currencySplit: CurrencySplitSlice[] = [
  { key: "usd", label: "USD", volumePct: 52, countPct: 38, color: "var(--chart-1)" },
  { key: "eur", label: "EUR", volumePct: 22, countPct: 30, color: "var(--chart-3)" },
  { key: "gbp", label: "GBP", volumePct: 13, countPct: 15, color: "var(--chart-2)" },
  { key: "sgd", label: "SGD", volumePct: 8, countPct: 12, color: "var(--chart-4)" },
  { key: "other", label: "Other", volumePct: 5, countPct: 5, color: "var(--muted-foreground)" },
];

export type CurrencySplitMetric = "volume" | "count";

export const currencySplitMetrics: { value: CurrencySplitMetric; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "count", label: "Count" },
];
