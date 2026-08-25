import type {
  LeaderboardEntry,
  Referral,
  ReferralStandings,
  ReferralStatus,
  ReferralTransaction,
} from "@/features/dashboard/refer-and-earn/types";

/**
 * Whether a referral is through its qualifying transaction. A waived referral
 * earned its reward before any of it could come off an invoice, so it counts as
 * completed too — the completed figure is "made it to the end", not "has an
 * untouched reward sitting there".
 */
function isCompleted(status: ReferralStatus): boolean {
  return status === "REWARD_EARNED" || status === "WAIVED";
}

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
  /** Of the earned rewards, how much has already been waived against fees. */
  totalWaived: number;
  /**
   * The pool the waiver draws from — the earned total. Kept as its own field so
   * the "waived of eligible" pair reads from one place and the two figures can
   * never be computed from different row sets.
   */
  waivedEligible: number;
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
  let totalWaived = 0;
  let earnedCurrency: string | null = null;
  let completed = 0;

  for (const referral of referrals) {
    if (isCompleted(referral.status)) completed += 1;

    const waived = referral.waivedAmount == null ? NaN : parseFloat(referral.waivedAmount);
    if (!Number.isNaN(waived)) totalWaived += waived;

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
    totalWaived,
    // The earned total is what is eligible to be waived — a reward has to be
    // credited before any of it can come off a fee.
    waivedEligible: totalEarned,
  };
}

/**
 * A metric's share of everyone invited, as a whole-number percentage — what the
 * analytics bars are drawn from.
 *
 * Clamped into 0–100 rather than trusted: a share is only meaningful against a
 * non-zero denominator, so no referrals invited yet reads as an empty bar
 * instead of a division by zero. The bars are computed here rather than in the
 * card so they come from the same module as the figures they sit under, and can
 * never be derived from a different total.
 */
export function shareOfInvited(part: number, totalInvited: number): number {
  if (totalInvited <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, part / totalInvited)) * 100);
}

// ── Referral leaderboard ─────────────────────────────────────────────────────

export interface LeaderboardView {
  /**
   * Every standing the payload carries, rank-ordered — one list, rendered as
   * one scrollable column. There is no podium/nearby split: the medal treatment
   * is decided per row from its own rank, and the merchant's row is found by id,
   * so no grouping is needed and no row can be emitted twice.
   */
  rows: LeaderboardEntry[];
  /** The merchant's own row, scored on their live figures, or null if unranked. */
  me: LeaderboardEntry | null;
  /**
   * Referrals between the merchant and #1, clamped at 0 once they are level or
   * ahead. The figure the progress line above the sticky row is stated in.
   */
  toReachFirst: number;
}

/**
 * Projects the standings into render order and swaps the merchant's stored
 * figures for their live ones.
 *
 * The merchant's amount and referral count come from the referral summary rather
 * than the standings payload, so their row can never disagree with the analytics
 * figures on the same page. Only their rank comes from the standings, since only
 * the server can know it.
 */
export function buildLeaderboardView(
  standings: ReferralStandings,
  currentEarned: number,
  currentReferralCount: number,
  currency: string
): LeaderboardView {
  const rows = [...standings.entries]
    .sort((a, b) => a.rank - b.rank)
    .map((entry) =>
      entry.id === standings.currentMerchantId
        ? { ...entry, amount: currentEarned, referralCount: currentReferralCount, currency }
        : entry
    );

  const me = rows.find((e) => e.id === standings.currentMerchantId) ?? null;
  const leaderCount = rows[0]?.referralCount ?? 0;

  return {
    rows,
    me,
    toReachFirst: me == null ? 0 : Math.max(0, leaderCount - me.referralCount),
  };
}

// ── Wire-up: influencer transactions → the Referral rows the UI consumes ─────

/**
 * Maps the influencer service's CREDIT transactions onto the `Referral` rows the
 * earnings table and analytics already read. Each CREDIT is one referred
 * merchant's reward; DEBITs are wallet withdrawals (not per-referral) and are
 * reconciled separately from the wallet totals, so they are dropped here.
 *
 * `waivedAmount` stays null: the transactions feed has no per-referral waived
 * slice, so the table shows a dash and the waived total comes from the wallet.
 */
export function mapTransactionsToReferrals(transactions: ReferralTransaction[]): Referral[] {
  return transactions
    .filter((txn) => txn.transactionType === "CREDIT")
    .map((txn) => ({
      id: txn.referenceNumber,
      fullName: txn.meta?.name || "—",
      emailId: txn.meta?.email ?? "",
      status: txn.status === "COMPLETED" ? "REWARD_EARNED" : "PENDING",
      rewardAmount: txn.status === "COMPLETED" ? txn.amount : null,
      waivedAmount: null,
      rewardCurrency: txn.currency,
    }));
}
