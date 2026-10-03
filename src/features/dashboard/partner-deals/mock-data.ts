import { DEFAULT_DEAL_VALUES } from "@/features/dashboard/partner-deals/constants";
import type { Deal, DealPricing } from "@/features/dashboard/partner-deals/types";

/**
 * DESIGN MOCK deals: placeholder codes (DEMO..., ONB-DEMO-...) and businesses,
 * not real ones, covering all three statuses. TODO(integration): replace with
 * the partner deals endpoint once its contract is confirmed against
 * pg-dashboard, including where the referral link comes from (it is built
 * server-side there; these are illustrative).
 */

/** The pricing Create Deal starts every deal on. */
const STANDARD_PRICING: DealPricing = {
  global: DEFAULT_DEAL_VALUES.global,
  international: DEFAULT_DEAL_VALUES.international,
  domestic: DEFAULT_DEAL_VALUES.domestic,
};

const link = (code: string) =>
  `https://dashboard.payglocal.in/app/mca/DEMOPT/${code.toLowerCase()}`;

export const MOCK_DEALS: Deal[] = [
  {
    dealId: "DEMO06",
    name: "Test",
    referralType: "MCA",
    status: "ACTIVE",
    referralLink: link("DEMO06"),
    createdAt: "26/09/2026 16:20:05",
    pricing: STANDARD_PRICING,
  },
  {
    dealId: "DEMO05",
    name: "Demo Deal",
    referralType: "PARTNER",
    status: "USED",
    referralLink: link("DEMO05"),
    createdAt: "18/09/2026 11:02:44",
    usedBy: "Demo Exports Pvt Ltd",
    onboardingId: "ONB-DEMO-0105",
    usedAt: "22/09/2026 15:41:10",
    pricing: {
      ...STANDARD_PRICING,
      global: { feeType: "PERCENTAGE", fee: "8" },
      domestic: {
        platform: { feeType: "PERCENTAGE", fee: "1.75" },
        customiseCards: true,
        cards: [
          { rowId: "demo05-amex", brand: "American Express", feeType: "PERCENTAGE", fee: "2" },
          { rowId: "demo05-rupay", brand: "Indian network cards", feeType: "PERCENTAGE", fee: "0" },
        ],
      },
    },
  },
  {
    dealId: "DEMO04",
    name: "Freelancer launch",
    referralType: "FREELANCER",
    status: "ACTIVE",
    referralLink: link("DEMO04"),
    createdAt: "02/09/2026 09:47:12",
    pricing: STANDARD_PRICING,
  },
  {
    dealId: "DEMO03",
    name: "Old Deal",
    referralType: "INFLUENCER",
    status: "DEACTIVATED",
    referralLink: link("DEMO03"),
    createdAt: "21/08/2026 18:15:30",
    deactivatedAt: "29/08/2026 10:12:00",
    pricing: STANDARD_PRICING,
  },
  {
    dealId: "DEMO02",
    name: "Summer partners",
    referralType: "PARTNER",
    status: "USED",
    referralLink: link("DEMO02"),
    createdAt: "07/08/2026 14:33:09",
    usedBy: "Sample Studio LLP",
    onboardingId: "ONB-DEMO-0102",
    usedAt: "12/08/2026 09:05:47",
    pricing: STANDARD_PRICING,
  },
  {
    dealId: "DEMO01",
    name: "Pilot",
    referralType: "MCA",
    status: "DEACTIVATED",
    referralLink: link("DEMO01"),
    createdAt: "19/07/2026 10:05:51",
    pricing: STANDARD_PRICING,
  },
];
