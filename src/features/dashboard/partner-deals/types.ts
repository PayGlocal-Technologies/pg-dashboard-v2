/**
 * DESIGN MOCK types for Partner Deals. Named for what the screens need; the
 * real deal list and create-deal payload live in pg-dashboard and must be
 * mapped onto (or replace) these per CLAUDE.md's migration checklist.
 */

export type DealStatus = "ACTIVE" | "PENDING" | "INACTIVE";

/** One row of the Deals list. Only the four fields the list shows. */
export interface Deal {
  dealId: string;
  onboardingId: string;
  status: DealStatus;
  /** "DD/MM/YYYY HH:mm:ss", the format the transactions API sends. */
  createdAt: string;
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

/** One optional Domestic card fee row, added by the merchant. */
export interface DomesticCardFeeRow extends FeeValue {
  /** Stable React key; not sent anywhere. */
  rowId: string;
  network: string;
  cardType: string;
}

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
