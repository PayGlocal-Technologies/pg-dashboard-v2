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
  /**
   * How much of `rewardAmount` has actually been waived against the merchant's
   * fees so far. Null before anything is earned, and can be less than
   * `rewardAmount` while a credited reward is still being drawn down — the
   * analytics row shows the waived total against the earned total for exactly
   * that reason.
   */
  waivedAmount: string | null;
  rewardCurrency: string;
}
