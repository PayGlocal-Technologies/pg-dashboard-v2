import type { MetricSparklinePoint } from "@/components/ui";

/**
 * Placeholder figures for the two summary cards above the two-column section.
 * Every value here is dummy data — replace this module with the real API
 * response once a summary endpoint exists. The shapes are deliberately what
 * the cards already consume, so wiring the backend up means swapping the
 * source rather than touching the UI.
 */

/** One currency's settled-amount card: the figures and the series behind them. */
export interface SettledAmountSummary {
  /** Settled total in the account's own currency, e.g. "128,400 USD". */
  value: string;
  /** The same total converted to INR, shown as supporting text beneath it. */
  valueInr: string;
  /** Movement against the previous period, e.g. "+8.6% vs last period". */
  trendLabel: string;
  /**
   * Monthly settled totals behind the chart, in the account's own currency so
   * the Y axis reads in the same unit as the headline figure above it.
   * Hard-coded rather than generated: `Math.random()` during render is a
   * purity violation (see CLAUDE.md), and a fixed series also keeps each
   * card's shape stable across re-renders instead of redrawing on every one.
   */
  trend: MetricSparklinePoint[];
}

/**
 * Keyed by the `currency` on each virtual account, so picking a region on the
 * page swaps the whole card — title, both amounts, the comparison, and the
 * chart — without any of them being derived from one another.
 */
export const SETTLED_AMOUNT_BY_CURRENCY: Record<string, SettledAmountSummary> = {
  USD: {
    value: "128,400 USD",
    valueInr: "1,22,31,384.00 INR",
    trendLabel: "+8.6% vs last period",
    trend: [
      { x: "Jan", y: 92_000 },
      { x: "Feb", y: 89_500 },
      { x: "Mar", y: 98_200 },
      { x: "Apr", y: 95_400 },
      { x: "May", y: 105_800 },
      { x: "Jun", y: 115_600 },
      { x: "Jul", y: 128_400 },
    ],
  },
  GBP: {
    value: "74,600 GBP",
    valueInr: "89,52,000.00 INR",
    trendLabel: "+4.5% vs last period",
    trend: [
      { x: "Jan", y: 61_200 },
      { x: "Feb", y: 58_900 },
      { x: "Mar", y: 64_500 },
      { x: "Apr", y: 67_100 },
      { x: "May", y: 69_800 },
      { x: "Jun", y: 71_400 },
      { x: "Jul", y: 74_600 },
    ],
  },
  EUR: {
    value: "96,200 EUR",
    valueInr: "99,08,600.00 INR",
    trendLabel: "+3.8% vs last period",
    trend: [
      { x: "Jan", y: 78_400 },
      { x: "Feb", y: 81_200 },
      { x: "Mar", y: 79_600 },
      { x: "Apr", y: 86_300 },
      { x: "May", y: 89_100 },
      { x: "Jun", y: 92_700 },
      { x: "Jul", y: 96_200 },
    ],
  },
  AUD: {
    value: "58,300 AUD",
    valueInr: "36,14,600.00 INR",
    trendLabel: "+4.3% vs last period",
    trend: [
      { x: "Jan", y: 44_100 },
      { x: "Feb", y: 46_800 },
      { x: "Mar", y: 45_200 },
      { x: "Apr", y: 49_700 },
      { x: "May", y: 52_300 },
      { x: "Jun", y: 55_900 },
      { x: "Jul", y: 58_300 },
    ],
  },
  CAD: {
    value: "41,900 CAD",
    valueInr: "28,49,200.00 INR",
    trendLabel: "+4.2% vs last period",
    trend: [
      { x: "Jan", y: 33_600 },
      { x: "Feb", y: 32_200 },
      { x: "Mar", y: 35_800 },
      { x: "Apr", y: 37_100 },
      { x: "May", y: 39_400 },
      { x: "Jun", y: 40_200 },
      { x: "Jul", y: 41_900 },
    ],
  },
  // Rest of the World's account carries CHF as a stand-in currency — see the
  // note on that entry in multi-currency/mock-data.ts.
  CHF: {
    value: "22,750 CHF",
    valueInr: "24,11,500.00 INR",
    trendLabel: "+3.9% vs last period",
    trend: [
      { x: "Jan", y: 17_200 },
      { x: "Feb", y: 18_400 },
      { x: "Mar", y: 17_900 },
      { x: "Apr", y: 19_600 },
      { x: "May", y: 20_800 },
      { x: "Jun", y: 21_900 },
      { x: "Jul", y: 22_750 },
    ],
  },
};

/**
 * Outstanding spans every account rather than the selected one, so unlike the
 * settled card it isn't keyed by currency.
 */
export const MCA_V2_SUMMARY = {
  outstanding: {
    value: "14,200 USD",
    note: "3 payers · ACH/Fedwire usually clears in 1–3 business days",
    info: "Payments your clients have initiated that have not settled yet.",
  },
} as const;
