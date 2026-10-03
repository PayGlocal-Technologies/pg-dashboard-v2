/**
 * DESIGN MOCK data for the Partner Dashboard, in the shape the page reads,
 * so swapping in real endpoints changes this file and the hook, not the
 * components. Businesses and figures are illustrative, not real merchants.
 *
 * TODO(integration): partner summary, onboarding pipeline, action items,
 * payouts, top merchants and referral links endpoints, confirmed against
 * pg-dashboard.
 */

export type PartnerPeriod = "month" | "quarter" | "year";
export type PartnerProduct = "PA" | "MCA";

export interface PartnerKpi {
  value: number;
  /** The same figure by product. For money and transactions the two add up
   *  to `value`; merchants on both products count under each, so live
   *  merchants can sum to more than the total. */
  split: { pa: number; mca: number };
  /** % change against the previous equivalent period. */
  changePct: number;
  /** Sparkline series, oldest first. */
  spark: number[];
}

export interface PartnerSummary {
  /** "vs Aug", "vs previous 3 months". */
  comparisonLabel: string;
  commissionEarned: PartnerKpi;
  grossVolume: PartnerKpi;
  transactionCount: PartnerKpi;
  liveMerchants: PartnerKpi;
}

export interface OnboardingCounts {
  invited: number;
  signedUp: number;
  documentsPending: number;
  underReview: number;
  live: number;
}

/** What the partner can do about a stalled merchant; drives the CTA. */
export type ActionKind = "send-reminder" | "complete-for-merchant" | "resend-invite";

export interface ActionItem {
  id: string;
  merchant: string;
  product: PartnerProduct;
  issue: string;
  waitingDays: number;
  action: ActionKind;
}

export interface Payout {
  /** YYYY-MM-DD */
  date: string;
  amount: number;
  status: "processing" | "paid";
  /** The month of commission it pays, e.g. "September". */
  forMonth: string;
  breakdown?: { product: string; amount: number }[];
}

export interface TopMerchant {
  id: string;
  merchant: string;
  products: PartnerProduct[];
  status: "live";
  grossVolume: number;
  transactions: number;
  /** % change against last month. */
  changePct: number;
  commission: number;
}

export interface ReferralLink {
  id: string;
  product: string;
  url: string;
}

export interface PartnerDashboardData {
  summary: Record<PartnerPeriod, PartnerSummary>;
  onboarding: OnboardingCounts;
  actionItems: ActionItem[];
  nextPayout: Payout | null;
  previousPayouts: Payout[];
  topMerchants: TopMerchant[];
  referralLinks: ReferralLink[];
}

const kpi = (
  value: number,
  split: [pa: number, mca: number],
  changePct: number,
  spark: number[]
): PartnerKpi => ({ value, split: { pa: split[0], mca: split[1] }, changePct, spark });

export const PARTNER_DASHBOARD_MOCK: PartnerDashboardData = {
  summary: {
    month: {
      comparisonLabel: "vs Aug",
      commissionEarned: kpi(48250, [31400, 16850], 18.2, [31, 33, 36, 35, 39, 42, 48]),
      grossVolume: kpi(
        18_400_000,
        [11_200_000, 7_200_000],
        12.6,
        [12, 13, 13.5, 14.8, 15.2, 16.9, 18.4]
      ),
      transactionCount: kpi(6412, [5380, 1032], 9.1, [48, 51, 50, 55, 58, 60, 64]),
      liveMerchants: kpi(12, [9, 6], 33.3, [7, 8, 8, 9, 9, 10, 12]),
    },
    quarter: {
      comparisonLabel: "vs previous 3 months",
      commissionEarned: kpi(124_070, [80_640, 43_430], 21.4, [88, 92, 97, 101, 108, 116, 124]),
      grossVolume: kpi(48_600_000, [29_800_000, 18_800_000], 15.8, [36, 38, 40, 42, 44, 46, 48.6]),
      transactionCount: kpi(17_480, [14_620, 2_860], 11.2, [140, 145, 151, 156, 162, 168, 175]),
      liveMerchants: kpi(12, [9, 6], 50, [6, 7, 8, 8, 9, 11, 12]),
    },
    year: {
      comparisonLabel: "vs last year",
      commissionEarned: kpi(398_600, [262_100, 136_500], 46.5, [210, 240, 268, 300, 330, 362, 398]),
      grossVolume: kpi(
        152_000_000,
        [96_400_000, 55_600_000],
        38.1,
        [82, 94, 104, 116, 128, 140, 152]
      ),
      transactionCount: kpi(54_900, [46_300, 8_600], 29.7, [320, 360, 395, 430, 470, 510, 549]),
      liveMerchants: kpi(12, [9, 6], 140, [3, 4, 6, 7, 9, 10, 12]),
    },
  },
  onboarding: { invited: 24, signedUp: 18, documentsPending: 3, underReview: 3, live: 12 },
  actionItems: [
    {
      id: "a1",
      merchant: "Kaveri Textiles",
      product: "PA",
      issue: "GST certificate missing from KYB",
      waitingDays: 6,
      action: "send-reminder",
    },
    {
      id: "a2",
      merchant: "Northwind SaaS",
      product: "MCA",
      issue: "Website and business details incomplete",
      waitingDays: 4,
      action: "complete-for-merchant",
    },
    {
      id: "a3",
      merchant: "Aranya Handicrafts",
      product: "PA",
      issue: "Invite not opened yet",
      waitingDays: 3,
      action: "resend-invite",
    },
  ],
  nextPayout: {
    date: "2026-10-07",
    amount: 48250,
    status: "processing",
    forMonth: "September",
    breakdown: [
      { product: "Payment Gateway", amount: 31400 },
      { product: "MCA", amount: 16850 },
    ],
  },
  previousPayouts: [
    { date: "2026-09-07", amount: 41120, status: "paid", forMonth: "August" },
    { date: "2026-08-07", amount: 34600, status: "paid", forMonth: "July" },
    { date: "2026-07-07", amount: 30200, status: "paid", forMonth: "June" },
  ],
  topMerchants: [
    {
      id: "m1",
      merchant: "Meridian Exports",
      products: ["PA", "MCA"],
      status: "live",
      grossVolume: 4_620_000,
      transactions: 1284,
      changePct: 22,
      commission: 11950,
    },
    {
      id: "m2",
      merchant: "Lumen Learning",
      products: ["PA"],
      status: "live",
      grossVolume: 3_180_000,
      transactions: 2106,
      changePct: 9,
      commission: 8420,
    },
    {
      id: "m3",
      merchant: "Saffron Trails Travel",
      products: ["PA"],
      status: "live",
      grossVolume: 2_450_000,
      transactions: 612,
      changePct: 14,
      commission: 6310,
    },
    {
      id: "m4",
      merchant: "Bluepeak Software",
      products: ["MCA"],
      status: "live",
      grossVolume: 2_100_000,
      transactions: 58,
      changePct: -4,
      commission: 5040,
    },
  ],
  // Placeholder partner code; production builds these per partner.
  referralLinks: [
    {
      id: "pg",
      product: "Payment Gateway",
      url: "https://dashboard.payglocal.in/app/prt/DEMOPT/pg",
    },
    {
      id: "mca",
      product: "Multi-currency account",
      url: "https://dashboard.payglocal.in/app/mca/DEMOPT/mca",
    },
    {
      id: "amazon",
      product: "Amazon Global Selling",
      url: "https://dashboard.payglocal.in/app/prt/DEMOPT/amazon",
    },
  ],
};
