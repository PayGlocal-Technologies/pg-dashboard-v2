// MOCK DATA — BACKEND GAP.
//
// Every figure below is invented. Each one backs a card that is built but NOT
// offered anywhere (see the BACKEND GAP note on McaWidgetId): Invoice Trend
// (MCA_API_SPEC_FOR_BACKEND.md 4.2) and Settlement Speed (4.5). Nothing a
// merchant can open renders this file. Delete each block, and return the
// card to the widget catalog, the moment its endpoint lands.
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
//   - The stat widgets (Outstanding amount, Active / Overdue invoices, Next
//     settlement, Top currency) -> McaLiveStatWidgets.tsx, each off an
//     endpoint already in use elsewhere
//   - revenueTimeframes / mcaQuickAccessItems -> constants.ts (fixed UI config,
//     never was mock); their types -> types.ts

import type { InvoiceTrendPoint } from "@/features/dashboard/mca-home/types";

/** MOCK. Contrasts PayGlocal's average settlement time against the standard
 *  T+1 cycle merchants are quoted — the point of the widget is to show
 *  settlements clearing well inside that window. Needs spec 4.5. */
export const settlementSpeed = {
  valueLabel: "18h",
  slaLabel: "T+1 (24h) standard",
  fasterByLabel: "6h",
  spark: [22, 21.5, 21, 20, 20, 19, 19, 18.5, 19, 18, 18, 18],
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
