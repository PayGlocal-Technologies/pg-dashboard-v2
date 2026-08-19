/** Referral lifecycle, in the order a referral moves through it. */
export type ReferralStatus = "PENDING" | "ACTIVATED" | "REWARD_EARNED";

export interface Referral {
  id: string;
  fullName: string;
  emailId: string;
  status: ReferralStatus;
  /**
   * Reward credited to the referrer. Null until the referral completes its
   * first transaction — the table renders a dash rather than a zero amount so
   * a pending referral doesn't read as one that earned nothing.
   */
  rewardAmount: string | null;
  rewardCurrency: string;
}
