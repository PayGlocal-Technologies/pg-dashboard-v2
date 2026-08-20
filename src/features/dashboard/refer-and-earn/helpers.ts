import type {
  LeaderboardEntry,
  Referral,
  ReferralStandings,
} from "@/features/dashboard/refer-and-earn/types";

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
    if (referral.status === "REWARD_EARNED") completed += 1;

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

// ── Referral leaderboard ─────────────────────────────────────────────────────

const PODIUM_SIZE = 3;

export interface LeaderboardView {
  /** Ranks 1–3, in order. */
  podium: LeaderboardEntry[];
  /**
   * The entry immediately above the merchant, when there is one worth showing —
   * null if the merchant is on the podium (the rows above them are already
   * there), if that neighbour is itself on the podium, or if the standings do
   * not include it.
   */
  above: LeaderboardEntry | null;
  /** The merchant's own row, scored on their live figures. */
  me: LeaderboardEntry | null;
  /** True when the merchant is already inside the podium. */
  meOnPodium: boolean;
  /** Referrals still needed to pass #1; 0 once they are level or ahead. */
  toPassFirst: number;
}

/**
 * Derives everything the leaderboard renders from the ranked list: the podium,
 * the merchant's row, the neighbour immediately above them, and the gap to #1.
 *
 * The merchant's amount and referral count are taken from the live referral
 * summary rather than the standings payload, so their row and the gap can never
 * disagree with the analytics figures on the same page. Only their rank comes
 * from the standings, since only the server can know it.
 */
export function buildLeaderboardView(
  standings: ReferralStandings,
  currentEarned: number,
  currentReferralCount: number,
  currency: string
): LeaderboardView {
  const ranked = [...standings.entries].sort((a, b) => a.rank - b.rank);
  const podium = ranked.filter((e) => e.rank <= PODIUM_SIZE);

  const stored = ranked.find((e) => e.id === standings.currentMerchantId) ?? null;
  const me = stored
    ? { ...stored, amount: currentEarned, referralCount: currentReferralCount, currency }
    : null;

  const meOnPodium = me != null && me.rank <= PODIUM_SIZE;

  // The closest entry ranked above the merchant. Skipped when it is already on
  // the podium, so no row is ever rendered twice.
  const above =
    me != null && !meOnPodium
      ? (ranked.filter((e) => e.rank < me.rank && e.rank > PODIUM_SIZE).pop() ?? null)
      : null;

  const leaderCount = podium[0]?.referralCount ?? 0;
  const toPassFirst = me == null ? 0 : Math.max(0, leaderCount - me.referralCount);

  return { podium, above, me, meOnPodium, toPassFirst };
}
