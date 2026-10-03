/**
 * DESIGN MOCK types for Partner Deals. Named for what the screens need; the
 * real deal list and create-deal payload live in pg-dashboard and must be
 * mapped onto (or replace) these per CLAUDE.md's migration checklist.
 */

/**
 * Exactly three states. ACTIVE: can be shared and used by a referred
 * business. USED: a referred business has used it. DEACTIVATED: the partner
 * turned it off; it can no longer be used. Created deals start ACTIVE and
 * move to one of the other two; neither of those moves on again.
 */
export type DealStatus = "ACTIVE" | "USED" | "DEACTIVATED";

/** One deal, as the list and the detail view read it. */
export interface Deal {
  dealId: string;
  /** The deal label the partner gave it at creation. */
  name: string;
  /** One of REFERRAL_TYPES' values. */
  referralType: string;
  status: DealStatus;
  referralLink: string;
  /** "DD/MM/YYYY HH:mm:ss", the format the transactions API sends. */
  createdAt: string;
  /** USED only: the business that used it, its onboarding and when. */
  usedBy?: string;
  onboardingId?: string;
  usedAt?: string;
  /** DEACTIVATED only, when the system has the date. */
  deactivatedAt?: string;
  /** The same shapes Create Deal configures. */
  pricing: DealPricing;
}

export type FeeType = "PERCENTAGE" | "FLAT";

/** A fee as typed: `fee` stays a string so a half-typed "2." isn't lost. */
export interface FeeValue {
  feeType: FeeType;
  fee: string;
}

/** One International Payment Processing row: a fixed card network. */
export interface InternationalFeeRow extends FeeValue {
  brand: string;
}

/** One optional Domestic card fee: a card brand priced on its own, on top of
 *  in place of the platform fee. Added by the partner. */
export interface DomesticCardFeeRow extends FeeValue {
  /** Stable React key; not sent anywhere. */
  rowId: string;
  /** One of DOMESTIC_CARD_BRANDS, or "" until chosen. */
  brand: string;
}

/** A deal's pricing: the three areas Create Deal configures. */
export type DealPricing = Pick<CreateDealValues, "global" | "international" | "domestic">;

export interface CreateDealValues {
  referralType: string;
  dealLabel: string;
  global: FeeValue;
  international: InternationalFeeRow[];
  domestic: {
    platform: FeeValue;
    customiseCards: boolean;
    cards: DomesticCardFeeRow[];
  };
}
