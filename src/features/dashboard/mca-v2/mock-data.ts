import type { MetricSparklinePoint } from "@/components/ui";

/**
 * Placeholder figures for the settled-amount card at the top of the right
 * column. Every value here is dummy data — replace this module with the real
 * API response once a summary endpoint exists. The shape is deliberately what
 * the card already consumes, so wiring the backend up means swapping the
 * source rather than touching the UI.
 *
 * Outstanding beside it has no entry here: OutstandingAmountCard is
 * self-contained and reads the Transactions feature's own mock data.
 */

/**
 * One currency's settled-amount card: the figures and the series behind them.
 *
 * Both totals are numbers, not pre-formatted strings: the card renders them
 * through the same `currencySymbol` / `formatCurrency` helpers the rest of the
 * product uses, so a figure here can't drift from how the same amount is
 * written elsewhere, and the chart's axis and tooltip stay in the same unit as
 * the headline above them.
 */
export interface SettledAmountSummary {
  /** Settled total in this currency's own units, e.g. 128_400 for $128,400. */
  amount: number;
  /** The same total converted to INR. */
  amountInr: number;
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
 * Keyed by currency code, which is what the card's own currency selector
 * chooses — picking one swaps both amounts, the comparison and the chart
 * together, without any of them being derived from one another.
 */
export const SETTLED_AMOUNT_BY_CURRENCY: Record<string, SettledAmountSummary> = {
  USD: {
    amount: 128_400,
    amountInr: 12_231_384,
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
    amount: 74_600,
    amountInr: 8_952_000,
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
    amount: 96_200,
    amountInr: 9_908_600,
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
    amount: 58_300,
    amountInr: 3_614_600,
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
    amount: 41_900,
    amountInr: 2_849_200,
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
  // The Rest of the World account is dollar-denominated and carries "Dollar"
  // as its currency value — see the note on that entry in
  // multi-currency/mock-data.ts for why it isn't the ISO "USD".
  Dollar: {
    amount: 22_750,
    amountInr: 2_411_500,
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
