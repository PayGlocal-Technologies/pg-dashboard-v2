import type {
  LeaderboardEntry,
  Referral,
  ReferralRedemption,
  ReferralStandings,
  ReferralStatus,
  ReferralTransaction,
  ReferralWallet,
} from "@/features/dashboard/refer-and-earn/types";

/**
 * Every figure the analytics surfaces show. All of it comes from the wallet —
 * see summarizeWallet.
 */
export interface ReferralSummary {
  /** Total earned from referrals that converted. */
  totalEarned: number;
  earnedCurrency: string;
  /** Everyone onboarded through the referral link, at any stage. */
  totalInvited: number;
  /** Invited but not yet through their first qualifying transaction. */
  inProgress: number;
  /** Referrals whose qualifying transaction has completed. */
  completed: number;
  /** Of the earned rewards, how much has already been waived against fees. */
  totalWaived: number;
  /**
   * The pool the waiver draws from — the earned total. Kept as its own field so
   * the "waived of eligible" pair reads from one place.
   */
  waivedEligible: number;
}

/** What the analytics show before the wallet has loaded, or if it has none. */
const EMPTY_SUMMARY: ReferralSummary = {
  totalEarned: 0,
  earnedCurrency: "USD",
  totalInvited: 0,
  inProgress: 0,
  completed: 0,
  totalWaived: 0,
  waivedEligible: 0,
};

/** Wallet fields arrive as strings for money and numbers for counts. */
function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The analytics row, the Total earned card and the waived card, all from the
 * wallet and nothing else.
 *
 * The transactions feed is deliberately not an input here. It is the table's
 * data source and only that: it holds one row per reward already minted, so
 * anything derived from it undercounts the funnel — a referral who signed up and
 * has not transacted has no row at all, and a merchant whose history is longer
 * than one page would have their totals silently truncated. The wallet states
 * all six figures outright, so there is nothing left to infer or reconcile.
 */
export function summarizeWallet(wallet: ReferralWallet | null): ReferralSummary {
  if (!wallet) return EMPTY_SUMMARY;

  const totalEarned = toNumber(wallet.totalEarnedAmount);
  const totalInvited = toNumber(wallet.referredCount);
  const completed = toNumber(wallet.convertedReferralCount);

  return {
    totalEarned,
    earnedCurrency: wallet.currency || EMPTY_SUMMARY.earnedCurrency,
    totalInvited,
    // Signed up but not yet transacted. Clamped rather than trusted, so a wallet
    // whose two counts briefly disagree cannot draw a negative bar.
    inProgress: Math.max(0, totalInvited - completed),
    completed,
    totalWaived: toNumber(wallet.totalWithdrawn),
    // Everything earned is eligible to come off the MDR, so the waived card
    // reads totalWithdrawn against this.
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
 * Newest first. The feed arrives ordered by the backend's `statusReferenceNumber`
 * sort key, which sorts COMPLETED ahead of PENDING and leaves the rows in no
 * chronological order at all — so both tables sort here rather than paging
 * straight off the array they were handed.
 */
function byNewestFirst<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

/**
 * Maps the influencer service's referral CREDITs onto the `Referral` rows the
 * earnings table and analytics read.
 *
 * The amount is carried through for pending rows as well as completed ones: a
 * CREDIT is minted with the full reward on it, and its status says whether that
 * money has been released (available) or is still held. Blanking the pending
 * amounts made the page's earned total disagree with `wallet.totalEarnings`,
 * which counts them.
 *
 * DEBITs are dropped here and mapped separately — see mapTransactionsToRedemptions.
 */
export function mapTransactionsToReferrals(transactions: ReferralTransaction[]): Referral[] {
  return byNewestFirst(
    transactions
      .filter((txn) => txn.transactionType === "CREDIT" && txn.reason === "REFERRAL_REWARD")
      .map((txn) => ({
        id: txn.referenceNumber,
        referralMid: txn.referralMid,
        fullName: txn.meta?.name || "—",
        emailId: txn.meta?.email ?? "",
        status: (txn.status === "COMPLETED" ? "REWARD_EARNED" : "PENDING") as ReferralStatus,
        rewardAmount: txn.amount,
        rewardCurrency: txn.currency,
        createdAt: txn.creationTime,
      }))
  );
}

/**
 * Maps the DEBIT side of the same feed — each one a slice of the reward wallet
 * already applied against the merchant's fees.
 */
export function mapTransactionsToRedemptions(
  transactions: ReferralTransaction[]
): ReferralRedemption[] {
  return byNewestFirst(
    transactions
      .filter((txn) => txn.transactionType === "DEBIT")
      .map((txn) => ({
        id: txn.referenceNumber,
        amount: txn.amount,
        currency: txn.currency,
        createdAt: txn.creationTime,
      }))
  );
}
