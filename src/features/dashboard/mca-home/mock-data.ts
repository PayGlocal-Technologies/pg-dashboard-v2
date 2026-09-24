// MOCK DATA — BACKEND GAP.
//
// Every figure below is invented. Each one backs a widget the MCA dashboard
// can render but has no endpoint for; the requests are written up in
// MCA_API_SPEC_FOR_BACKEND.md (4.2 invoice-trend, 4.5 settlement-speed,
// 4.6 the stat-widget batch). Delete each block the moment its endpoint
// lands — the components are already shaped to read a response.
//
// None of these widgets is in DEFAULT_MCA_DASHBOARD_LAYOUT; all three are
// opt-in from "Add widget".
//
// Do NOT add to this file, and do not move anything out of it into
// constants.ts: a fixed label or route is a constant, a merchant-facing
// amount, count or rate is data and belongs to an endpoint.
//
// Already migrated off this file, do not re-add:
//   - Client analytics    -> GET /gcc/v3/analytics/getClientData (useMcaClientAnalytics)
//   - Saved amount        -> getPacbOverview.amountSaved         (useMcaOverview)
//   - Needs attention     -> GET .../mca-invoice/{mid}/needs-attention (useNeedsAttention)
//   - revenueByTimeframe  -> GET .../mca/revenue-trend           (useRevenueTrend)
//   - netVolumeByTimeframe     -> the same endpoint, metric=net_volume
//   - paymentsCountByTimeframe -> the same endpoint, metric=number_of_payments
//   - RevenuePoint / RevenueSeries -> RevenueTrendPoint / RevenueTrendData in
//     types.ts; McaRevenueCard renders the response directly
//   - upcomingSettlement  -> the settlement/upcoming endpoint (useSettlementUpcoming)
//   - Invoice origins     -> GET .../mca/invoice-origins         (useInvoiceOrigins)
//   - Currency split      -> GET .../mca/currency-split          (useCurrencySplit)
//   - revenueTimeframes / mcaQuickAccessItems -> constants.ts (fixed UI config,
//     never was mock); their types -> types.ts

import type {
  InvoiceTrendPoint,
  McaStatCardData,
} from "@/features/dashboard/mca-home/types";
import type { McaStatWidgetId } from "@/features/dashboard/mca-home/widget-catalog";

/** MOCK. Contrasts PayGlocal's average settlement time against the standard
 *  T+1 cycle merchants are quoted — the point of the widget is to show
 *  settlements clearing well inside that window. Needs spec 4.5. */
export const settlementSpeed = {
  valueLabel: "18h",
  slaLabel: "T+1 (24h) standard",
  fasterByLabel: "6h",
  spark: [22, 21.5, 21, 20, 20, 19, 19, 18.5, 19, 18, 18, 18],
};

/** MOCK. Every "stat"-kind widget's figures, keyed by widget id (see
 *  widget-catalog.ts). All opt-in via "Add widgets". Needs spec 4.6, which
 *  asks for one batch call keyed by the ids actually on screen. */
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

/** MOCK. Paid vs outstanding invoice counts by month. Needs spec 4.2. */
export const invoiceTrend: InvoiceTrendPoint[] = [
  { month: "Jan", paid: 48, outstanding: 11 },
  { month: "Feb", paid: 62, outstanding: 8 },
  { month: "Mar", paid: 55, outstanding: 13 },
  { month: "Apr", paid: 74, outstanding: 9 },
  { month: "May", paid: 81, outstanding: 7 },
  { month: "Jun", paid: 68, outstanding: 10 },
  { month: "Jul", paid: 9, outstanding: 6 },
];
