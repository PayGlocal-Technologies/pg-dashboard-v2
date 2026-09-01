/**
 * Referral lifecycle, in the order a referral moves through it.
 *
 * Four stored values, three states the merchant sees: PENDING and ACTIVATED are
 * both stages before the qualifying transaction, so the table and the analytics
 * row both read them as one "in progress" state. REWARD_EARNED is a credited
 * reward, and WAIVED is one that has been fully drawn down against the
 * merchant's MDR — the end of the line.
 */
export type ReferralStatus = "PENDING" | "ACTIVATED" | "REWARD_EARNED" | "WAIVED";

export interface Referral {
  id: string;
  /** The referred merchant's own MID — the stable identity for this referral. */
  referralMid: string;
  fullName: string;
  emailId: string;
  status: ReferralStatus;
  /**
   * Reward accrued for this referral. Always present: the influencer service
   * mints a CREDIT carrying the full amount as soon as the referral qualifies,
   * and the transaction's own PENDING/COMPLETED status says whether that amount
   * has been released yet (held vs available on the wallet). A pending reward is
   * shown greyed rather than blanked, matching pg-dashboard — it is money the
   * merchant has genuinely accrued, and `wallet.totalEarnings` counts it.
   */
  rewardAmount: string;
  rewardCurrency: string;
  /** Epoch milliseconds, as the API sends it. */
  createdAt: string;
}

/**
 * One drawdown of the reward wallet against the merchant's fees — a DEBIT on
 * the transactions feed, carrying reason `FFMS_AUTO_DISCOUNT_ADJUSTMENT`.
 *
 * Deliberately not modelled as a field on `Referral`: the DEBIT's `referralMid`
 * is the wallet owner's own MID, not a referred merchant's, so a redemption
 * cannot be attributed back to the referral that funded it. It is a wallet-level
 * event and gets its own tab, exactly as pg-dashboard does it.
 */
export interface ReferralRedemption {
  id: string;
  amount: string;
  currency: string;
  /** Epoch milliseconds, as the API sends it. */
  createdAt: string;
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

// ── Reward wallet + transactions (pg-dashboard influencer service) ───────────

/**
 * The reward wallet. The four money fields reconcile exactly against the
 * transactions feed, and that identity is what the screen relies on:
 *
 *   totalEarnings  = every CREDIT           (pending and completed alike)
 *   heldBalance    = the PENDING CREDITs    (accrued, not yet released)
 *   totalWithdrawn = every DEBIT            (already waived off the MDR)
 *   availableBalance = totalEarnings − heldBalance − totalWithdrawn
 *
 * `availableBalance` is the figure the screen shows as what the merchant has
 * earned: reward money released to them and not yet spent against a fee. The
 * counts below carry the referral funnel, so no part of this screen has to infer
 * either the money or the counts from the transactions feed any more.
 */
export interface ReferralWallet {
  availableBalance: string;
  heldBalance: string;
  totalEarnings: string;
  /**
   * What the merchant has earned from the referrals that converted, and the one
   * earned figure the screen displays.
   *
   * Distinct from `totalEarnings`, which counts every credit the wallet has ever
   * minted including rewards still held against referrals that have not
   * transacted. This is the figure the waived card measures `totalWithdrawn`
   * against.
   */
  totalEarnedAmount: string;
  totalWithdrawn: string;
  currency: string;
  /**
   * Everyone onboarded through the merchant's referral link — the programme's
   * own count, which is what "Total invited" reads.
   *
   * This cannot be derived from the transactions feed: a referral that signed up
   * but has not transacted mints no wallet entry at all, so counting credit rows
   * only ever counted the ones that already paid out.
   */
  referredCount: number;
  /**
   * Of those, how many have completed a transaction — "Completed". The
   * difference between the two counts is what is still in progress.
   */
  convertedReferralCount: number;
  // Numbers on the wire, not strings — these were typed as `string` before and
  // nothing read them, so the mismatch went unnoticed.
  creditTransactionCount: number;
  debitTransactionCount: number;
  status: string;
  /** Epoch milliseconds. */
  creationTime: string;
  updatedTime: string | null;
  version: string;
}

/**
 * The influencer service's response envelope, spelled out in full rather than
 * trimmed to the two fields the screen reads. The rest (`gid`, `reasonCode`,
 * `errors`) are what a failing call is diagnosed from, so a payload pasted
 * straight from the network tab type-checks against this as-is.
 */
interface InfluencerEnvelope<T> {
  data: T;
  gid?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  reasonCode?: string;
  errors?: unknown;
}

export type ReferralWalletResponse = InfluencerEnvelope<{ wallet: ReferralWallet | null }>;

/**
 * Why a wallet entry exists. `REFERRAL_REWARD` is the only credit reason the
 * referral programme mints today and `FFMS_AUTO_DISCOUNT_ADJUSTMENT` the only
 * debit reason, but the field is a plain string on the wire — the mapper filters
 * on it rather than on `transactionType` alone, so a reason added later cannot
 * silently turn into a fake referral row.
 */
export type ReferralTransactionReason =
  "REFERRAL_REWARD" | "FFMS_AUTO_DISCOUNT_ADJUSTMENT" | (string & {});

export interface ReferralTransaction {
  walletId: string;
  /** `"{status}#{referenceNumber}"` — the backend's sort key. */
  statusReferenceNumber: string;
  referenceNumber: string;
  amount: string;
  currency: string;
  status: "PENDING" | "COMPLETED";
  transactionType: "CREDIT" | "DEBIT";
  reason: ReferralTransactionReason;
  /**
   * On a CREDIT, the referred merchant's MID. On a DEBIT it is the wallet
   * owner's own MID, which is why a redemption cannot be traced to a referral.
   */
  referralMid: string;
  /** Epoch milliseconds. */
  creationTime: string;
  /** Null on DEBIT rows — a redemption has no counterparty to describe. */
  meta: { referenceWalletId: string; name: string; email: string } | null;
}

export type ReferralTransactionsResponse = InfluencerEnvelope<{
  transactions: ReferralTransaction[];
}>;
