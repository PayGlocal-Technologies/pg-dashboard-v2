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

// ── Referral leaderboard ─────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  /** Position on the leaderboard, 1-indexed. */
  rank: number;
  /** Display name as the programme publishes it — partially masked for others. */
  displayName: string;
  /** Referral earnings this standing is scored on. */
  amount: number;
  currency: string;
  /**
   * Qualifying referrals behind that amount. Held alongside it rather than
   * divided out of it, because the reward per referral is a programme setting
   * that can change without the historical standings changing with it.
   */
  referralCount: number;
}

export interface ReferralStandings {
  /**
   * Ranked entries, ordered by rank ascending. Not necessarily exhaustive — the
   * programme returns the podium plus the slice around the merchant, which is
   * everything the panel shows. The podium, the merchant's own row, and the
   * entry immediately above them are all derived from this one list rather than
   * carried as separate fields, so they cannot disagree.
   */
  entries: LeaderboardEntry[];
  /** Which entry in `entries` is the signed-in merchant. */
  currentMerchantId: string;
}
