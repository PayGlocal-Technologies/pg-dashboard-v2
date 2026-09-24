// Static configuration for the MCA dashboard: values that are fixed properties
// of the UI rather than anything a backend reports.
//
// Nothing here is a stand-in for data. A figure a merchant reads as their own —
// an amount, a count, a rate, a trend — is never a constant; if one has no
// endpoint yet it belongs behind an honest empty state, not in this file.

import type {
  QuickAccessItem,
  RevenueTimeframe,
} from "@/features/dashboard/mca-home/types";

/**
 * McaRevenueCard's period pills. Not data: the labels of the three windows the
 * card asks the live revenue-trend endpoint for (the day counts themselves are
 * TIMEFRAME_DAYS, in the card).
 */
export const revenueTimeframes: { value: RevenueTimeframe; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
];

/**
 * The Quick access tiles, in the order they appear. A fixed navigation menu —
 * the same list for every merchant — so it is authored here rather than
 * fetched. Where each one goes is QUICK_ACCESS_ROUTES, in McaQuickAccess.
 */
export const mcaQuickAccessItems: QuickAccessItem[] = [
  {
    id: "invoice-links",
    label: "Create invoice",
    description: "Create and send an invoice",
    icon: "file-text",
  },
  {
    id: "international-accounts",
    label: "International accounts",
    description: "Manage your global accounts",
    icon: "globe-2",
  },
  {
    id: "platform-withdrawal",
    label: "Platforms",
    description: "Manage your sales platforms",
    icon: "download",
  },
  {
    id: "client-management",
    label: "Client management",
    description: "View and manage clients",
    icon: "users",
  },
  {
    id: "forex-calculator",
    label: "Forex calculator",
    description: "Check live FX rates",
    icon: "circle-dollar-sign",
  },
  // Hidden for now — the dashboard-customise entry point (kept in code):
  // { id: "customise-dashboard", label: "Customise dashboard", description: "Customise this dashboard", icon: "sliders-horizontal" },
];
