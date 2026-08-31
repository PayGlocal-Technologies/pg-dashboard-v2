// TODO(integration): everything left in this file is mock data, wire it up to
// the real MCA analytics endpoints per the CLAUDE.md migration checklist
// before shipping, endpoint URL, request payload and response shape must all
// be copied from pg-dashboard (or the eventual MCA analytics service), not
// guessed.
//
// Already migrated off this file, do not re-add:
//   - Client analytics  -> GET /gcc/v3/analytics/getClientData  (see hooks.ts)
//   - Saved amount      -> getPacbOverview.amountSaved          (useMcaOverview)

import type { McaStatWidgetId } from "@/features/dashboard/mca-home/widget-catalog";

export interface RevenuePoint {
  /** Display-ready axis label. Whatever bucket the timeframe uses names itself
   *  here, so the x-axis never has to know which timeframe is showing. Maps 1:1
   *  onto `label` in the revenue-trend response (see the backend spec). */
  x: string;
  current: number;
  previous: number;
}

export type RevenueTimeframe = "1W" | "1M" | "3M";

export const revenueTimeframes: { value: RevenueTimeframe; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
];

/**
 * One timeframe's revenue series and its headline figures.
 *
 * Shaped to mirror the revenue-trend endpoint one field at a time, so wiring it
 * up is a source swap rather than a component change: `points` is that
 * response's `points`, and the three figures are its `total`, `previousTotal`
 * and `trendPct`.
 */
export interface RevenueSeries {
  currency: string;
  total: number;
  previousTotal: number;
  trendPct: number;
  /** What `trendPct` compares against, as the caption says it. Per timeframe,
   *  because "vs last month" is wrong on a one-week view. */
  comparisonLabel: string;
  points: RevenuePoint[];
}

/**
 * Placeholder revenue, one genuine dataset per timeframe.
 *
 * An earlier revision held a single seven-month series and multiplied every
 * point by a constant per timeframe (0.23 / 1 / 3.1). That was wrong twice over:
 * a uniform multiply is a pure vertical scale, so all three tabs drew the
 * identical curve, and the x-axis kept its month labels, so picking "1W" showed
 * a week's total spread across Feb to Aug. Each timeframe now carries its own
 * buckets and its own labels, which is also what the real endpoint will return.
 *
 * Internally consistent on purpose: each `total` is the sum of its own
 * `current` points and each `previousTotal` the sum of its `previous` points, so
 * the headline can never disagree with the chart under it. 1M's four weekly
 * buckets also sum to 3M's first monthly bucket, so switching tabs tells one
 * story rather than three.
 */
export const revenueByTimeframe: Record<RevenueTimeframe, RevenueSeries> = {
  // Seven days. Weekday labels rather than dates: the card is a glance, and a
  // date axis at this width would either truncate or crowd.
  "1W": {
    currency: "INR",
    total: 148_000,
    previousTotal: 130_500,
    trendPct: 13.4,
    comparisonLabel: "vs last week",
    points: [
      { x: "Mon", current: 18_000, previous: 16_000 },
      { x: "Tue", current: 24_500, previous: 21_000 },
      { x: "Wed", current: 21_000, previous: 19_500 },
      { x: "Thu", current: 32_000, previous: 27_000 },
      { x: "Fri", current: 28_500, previous: 25_000 },
      { x: "Sat", current: 15_000, previous: 13_500 },
      { x: "Sun", current: 9_000, previous: 8_500 },
    ],
  },
  // Four weekly buckets, labelled by the week's starting date. Fixed literals,
  // not derived from today, so rendering stays pure (see CLAUDE.md).
  "1M": {
    currency: "INR",
    total: 654_000,
    previousTotal: 588_000,
    trendPct: 11.2,
    comparisonLabel: "vs last month",
    points: [
      { x: "28 Jul", current: 148_000, previous: 139_000 },
      { x: "4 Aug", current: 176_000, previous: 151_000 },
      { x: "11 Aug", current: 132_000, previous: 128_000 },
      { x: "18 Aug", current: 198_000, previous: 170_000 },
    ],
  },
  // Three monthly buckets. Jun is 1M's four weeks summed, so the two tabs agree.
  "3M": {
    currency: "INR",
    total: 1_954_000,
    previousTotal: 1_784_000,
    trendPct: 9.5,
    comparisonLabel: "vs previous 3 months",
    points: [
      { x: "Jun", current: 654_000, previous: 601_000 },
      { x: "Jul", current: 588_000, previous: 545_000 },
      { x: "Aug", current: 712_000, previous: 638_000 },
    ],
  },
};

// upcomingSettlement mock removed — the Revenue card's Upcoming settlement now
// uses the live settlement/upcoming endpoint (see McaRevenueCard +
// useSettlementUpcoming).

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
  { id: "invoice-links", label: "Create invoice", icon: "file-text" },
  { id: "international-accounts", label: "International accounts", icon: "globe-2" },
  { id: "platform-withdrawal", label: "Platform withdrawal", icon: "download" },
  { id: "client-management", label: "Client management", icon: "users" },
  { id: "forex-calculator", label: "Forex calculator", icon: "circle-dollar-sign" },
  { id: "customise-dashboard", label: "Customise dashboard", icon: "sliders-horizontal" },
];

// Invoice-origins mock removed — the card is now backed by the live
// /analytics/{merchantId}/merchant/mca/invoice-origins endpoint
// (see McaInvoiceOriginsCard + useInvoiceOrigins).

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

// Currency-split mock removed — the card is now backed by the live
// /analytics/{merchantId}/merchant/mca/currency-split endpoint
// (see McaCurrencySplitCard + useCurrencySplit).
