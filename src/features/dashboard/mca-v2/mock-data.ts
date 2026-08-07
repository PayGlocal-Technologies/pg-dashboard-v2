import type { MetricSparklinePoint } from "@/components/ui";

/**
 * Placeholder figures for the three summary cards above the receiving-account
 * details. Every value here is dummy data — replace this module with the real
 * API response once a summary endpoint exists. The shape is deliberately what
 * flux-ui's MetricSparklineCard consumes, so wiring the backend up means
 * swapping the source rather than touching the cards.
 */

/**
 * Twelve points of a gently rising series behind Total Earnings. Hard-coded
 * rather than generated: `Math.random()` during render is a purity violation
 * (see CLAUDE.md), and a fixed series also keeps the card's shape stable
 * across re-renders instead of redrawing on every one.
 */
export const TOTAL_EARNING_TREND: MetricSparklinePoint[] = [
  { x: 1, y: 42 },
  { x: 2, y: 46 },
  { x: 3, y: 44 },
  { x: 4, y: 53 },
  { x: 5, y: 51 },
  { x: 6, y: 59 },
  { x: 7, y: 57 },
  { x: 8, y: 66 },
  { x: 9, y: 63 },
  { x: 10, y: 71 },
  { x: 11, y: 69 },
  { x: 12, y: 78 },
];

export const MCA_V2_SUMMARY = {
  totalEarning: {
    value: "128,400 USD",
    trendLabel: "+8.4% vs last month",
    info: "Total received across every virtual account in the last 30 days.",
  },
  outstanding: {
    value: "14,200 USD",
    note: "3 payers · ACH/Fedwire usually clears in 1–3 business days",
    info: "Payments your clients have initiated that have not settled yet.",
  },
  amountSaved: {
    value: "₹8,240.25",
    note: "You've saved 4% on fees compared to typical bank pricing this month.",
    info: "Difference between PayGlocal's fees and typical bank pricing for the same volume.",
  },
} as const;
