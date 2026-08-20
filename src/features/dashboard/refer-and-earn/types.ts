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

/**
 * The three referral leagues. A merchant advances by surpassing the #1 position
 * in their current league, so 3 is the highest and there is nothing beyond it.
 */
export type LeagueId = 1 | 2 | 3;

export interface LeaderboardEntry {
  id: string;
  /** Position within the league, 1-indexed. */
  rank: number;
  /** Display name as the programme publishes it — partially masked for others. */
  displayName: string;
  /** Referral earnings this standing is scored on. */
  amount: number;
  currency: string;
}

export interface LeagueLeaderboard {
  league: LeagueId;
  /** Top performers, already ordered by rank. */
  top: LeaderboardEntry[];
  /**
   * The signed-in merchant's own standing in this league, or null when they are
   * not ranked in it (they only ever hold a position in their own league).
   */
  currentMerchant: LeaderboardEntry | null;
}
