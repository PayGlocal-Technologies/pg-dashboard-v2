import type { CreateDealValues, FeeType } from "@/features/dashboard/partner-deals/types";

/**
 * DESIGN MOCK options and starting values for Create Deal.
 *
 * TODO(integration): every list below is a stand-in until the real ones are
 * read from pg-dashboard's Create Deal drawer / its API:
 *  - REFERRAL_TYPES mirrors the referral link families this app already
 *    routes (/prt, /frl, /inf, /mca in constants/publicRoutes.ts).
 *  - The fee starting values are the ones the current drawer shows.
 */

export const DEALS_PATH = "/partner-deals-dashboard";
export const CREATE_DEAL_PATH = "/partner-deals-dashboard/create";

export const REFERRAL_TYPES = [
  { value: "PARTNER", label: "Partner" },
  { value: "FREELANCER", label: "Freelancer" },
  { value: "INFLUENCER", label: "Influencer" },
  { value: "MCA", label: "Multi-Currency Accounts" },
] as const;

export const FEE_TYPES: { value: FeeType; label: string }[] = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FLAT", label: "Flat fee" },
];

export const INTERNATIONAL_BRANDS = [
  "American Express",
  "Diners",
  "Discover",
  "Other debit cards",
  "Other credit cards",
] as const;

export const DOMESTIC_NETWORKS = [
  { value: "VISA", label: "Visa" },
  { value: "MASTERCARD", label: "Mastercard" },
  { value: "RUPAY", label: "RuPay" },
  { value: "AMEX", label: "American Express" },
  { value: "DINERS", label: "Diners" },
];

export const CARD_TYPES = [
  { value: "DEBIT", label: "Debit" },
  { value: "CREDIT", label: "Credit" },
];

export const DEAL_LABEL_MAX = 50;

export const DEFAULT_DEAL_VALUES: CreateDealValues = {
  referralType: "",
  dealLabel: "",
  global: { feeType: "PERCENTAGE", fee: "10" },
  international: INTERNATIONAL_BRANDS.map((brand) => ({
    brand,
    feeType: "PERCENTAGE" as const,
    fee: "2.65",
  })),
  domestic: {
    platform: { feeType: "PERCENTAGE", fee: "1.75" },
    customiseCards: false,
    cards: [],
  },
};

export function feeTypeLabel(type: FeeType) {
  return FEE_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** "10%" or "₹25". Empty string when there's no fee yet. */
export function formatFee(fee: string, type: FeeType) {
  const trimmed = fee.trim();
  if (!trimmed) return "";
  return type === "PERCENTAGE" ? `${trimmed}%` : `₹${trimmed}`;
}
