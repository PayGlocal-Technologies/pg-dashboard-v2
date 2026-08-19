import type { Referral } from "@/features/dashboard/refer-and-earn/types";

export interface ReferralSummary {
  /** Sum of every reward already credited to the referrer. */
  totalEarned: number;
  /** Currency the rewards are paid in — see the note in summarizeReferrals. */
  earnedCurrency: string;
  /** Everyone invited through the referral link, at any stage. */
  totalInvited: number;
  /** Invited but not yet through their first qualifying transaction. */
  inProgress: number;
  /** Referrals whose qualifying transaction has completed. */
  completed: number;
}

/**
 * Derives the analytics row from the same rows the earnings table renders, so
 * the two can never disagree — there is no separate totals source to drift from.
 *
 * The referral program pays one reward in one currency, so the earned total is a
 * single figure and `earnedCurrency` is taken from the first credited reward. If
 * the eventual API ever returns rewards in mixed currencies this needs to become
 * a per-currency breakdown rather than one sum.
 */
export function summarizeReferrals(referrals: Referral[]): ReferralSummary {
  let totalEarned = 0;
  let earnedCurrency: string | null = null;
  let completed = 0;

  for (const referral of referrals) {
    if (referral.status === "REWARD_EARNED") completed += 1;
    if (referral.rewardAmount == null) continue;

    const amount = parseFloat(referral.rewardAmount);
    if (Number.isNaN(amount)) continue;

    totalEarned += amount;
    earnedCurrency ??= referral.rewardCurrency;
  }

  return {
    totalEarned,
    earnedCurrency: earnedCurrency ?? "USD",
    totalInvited: referrals.length,
    // Everyone who isn't through their qualifying transaction yet — Pending and
    // Activated both count as in progress.
    inProgress: referrals.length - completed,
    completed,
  };
}
