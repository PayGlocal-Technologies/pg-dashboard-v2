import type { PartnerTransaction } from "@/features/dashboard/transaction-overview/types";

/**
 * Partner > Merchant Portfolio: merchants that are live (or were, and have
 * since been deactivated), and the business they bring in.
 *
 * DESIGN MOCK shape, named for what the screens need. TODO(integration):
 * map the partner merchant-performance response onto this once its contract
 * is confirmed against pg-dashboard. The screens read derive.ts, not these
 * fields directly, so the swap stays in one place.
 */

export type PortfolioStatus = "LIVE" | "DEACTIVATED";

/** "PA" is the Payment Gateway, as the Partner Home labels it. */
export type PortfolioProduct = "PA" | "MCA";

export type PortfolioPeriod = "month" | "quarter" | "year" | "custom";

/** A period's headline figures. Money in INR. */
export interface PeriodFigures {
  grossVolume: number;
  transactions: number;
  commission: number;
}

export interface PortfolioMerchant {
  /** Placeholder IDs (DEMO-MID-…), the same ones Transaction Overview uses. */
  merchantId: string;
  name: string;
  status: PortfolioStatus;
  products: PortfolioProduct[];
  email: string;
  phone: string;
  businessType: string;
  country: string;
  website?: string;
  referral: {
    type: "Referral link" | "Direct invite" | "Assisted onboarding";
    /** YYYY-MM-DD */
    date: string;
    link?: string;
  };
  /** YYYY-MM-DD, the day the merchant went live. */
  liveSince: string;
  /** YYYY-MM-DD, deactivated merchants only. */
  deactivatedOn?: string;
  /** ISO timestamp of the latest transaction. */
  lastTransactionAt: string;
  /** This month's figures; longer periods scale from these (see derive.ts). */
  month: PeriodFigures;
  /** % change vs last month, when there is a full previous month to compare. */
  monthChangePct?: number;
  /** Deactivated merchants: figures per period, and their whole history. */
  history?: Record<"month" | "quarter" | "year", PeriodFigures> & { lifetime: PeriodFigures };
  /** Links back to the merchant's Merchant Activation record. */
  onboardingId?: string;
}

export type SettlementState = "SETTLED" | "PROCESSING" | "PENDING";

/** A transaction as the portfolio shows it: the Transaction Overview row,
 *  plus where its money is and what it earned the partner. */
export interface PortfolioTransaction extends PartnerTransaction {
  /** Undefined for payments that never captured money (declines, refunds). */
  settlement?: SettlementState;
  /** INR. Undefined when the payment earns nothing. */
  commission?: number;
}
