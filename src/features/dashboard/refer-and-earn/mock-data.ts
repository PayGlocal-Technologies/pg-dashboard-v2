import type {
  LeagueId,
  LeagueLeaderboard,
  Referral,
} from "@/features/dashboard/refer-and-earn/types";

/**
 * Placeholder referral earnings.
 *
 * Every value here is dummy data — there is no referral program endpoint yet,
 * so this stands in for the API response. The shape is deliberately what the
 * table already consumes, so wiring the backend up means swapping the source,
 * not touching the UI. See CLAUDE.md — do not guess an API contract; confirm
 * the real field names before mapping onto `Referral`.
 *
 * Names and email addresses are fictional. `waivedAmount` is the slice of each
 * credited reward already drawn down against fees — deliberately a mix of fully
 * waived, partly waived, and not-yet-started so the analytics row shows a real
 * waived-vs-earned split rather than two identical figures.
 */
export const MOCK_REFERRALS: Referral[] = [
  {
    id: "referral-0001",
    fullName: "Aarav Mehta",
    emailId: "aarav.mehta@brightloom.example",
    status: "REWARD_EARNED",
    rewardAmount: "30.00",
    waivedAmount: "30.00",
    rewardCurrency: "USD",
  },
  {
    id: "referral-0002",
    fullName: "Diane Whitfield",
    emailId: "diane@northquay.example",
    status: "REWARD_EARNED",
    rewardAmount: "30.00",
    waivedAmount: "30.00",
    rewardCurrency: "USD",
  },
  {
    id: "referral-0003",
    fullName: "Rohan Iyer",
    emailId: "rohan.iyer@stitchcraft.example",
    status: "ACTIVATED",
    rewardAmount: null,
    waivedAmount: null,
    rewardCurrency: "USD",
  },
  {
    id: "referral-0004",
    fullName: "Marta Oliveira",
    emailId: "marta.oliveira@velacreative.example",
    status: "REWARD_EARNED",
    rewardAmount: "30.00",
    waivedAmount: "20.00",
    rewardCurrency: "USD",
  },
  {
    id: "referral-0005",
    fullName: "Kenji Watanabe",
    emailId: "kenji@harborlabs.example",
    status: "PENDING",
    rewardAmount: null,
    waivedAmount: null,
    rewardCurrency: "USD",
  },
  {
    id: "referral-0006",
    fullName: "Priya Nair",
    emailId: "priya.nair@lumenstudio.example",
    status: "REWARD_EARNED",
    rewardAmount: "30.00",
    waivedAmount: null,
    rewardCurrency: "USD",
  },
  {
    id: "referral-0007",
    fullName: "Tomas Novak",
    emailId: "tomas@kestrelgoods.example",
    status: "ACTIVATED",
    rewardAmount: null,
    waivedAmount: null,
    rewardCurrency: "USD",
  },
  {
    id: "referral-0008",
    fullName: "Sofia Ramirez",
    emailId: "sofia.ramirez@cadenzaco.example",
    status: "PENDING",
    rewardAmount: null,
    waivedAmount: null,
    rewardCurrency: "USD",
  },
];

// ── Referral leaderboard ─────────────────────────────────────────────────────

/**
 * The league the merchant currently sits in. Placeholder — this comes from the
 * referral programme alongside the standings once that contract exists.
 */
export const MOCK_CURRENT_LEAGUE: LeagueId = 1;

/**
 * Placeholder league standings, keyed by league.
 *
 * Dummy data, like the referrals above: names are masked the way a public
 * leaderboard would publish them, and amounts climb with the league so the
 * progression reads correctly when switching between them. `currentMerchant` is
 * only populated for the merchant's own league — they hold no position in the
 * others — and its `amount` is overridden at render time with the real earned
 * total, so the "You" row always agrees with the analytics row above it.
 */
export const MOCK_LEAGUE_LEADERBOARDS: Record<LeagueId, LeagueLeaderboard> = {
  1: {
    league: 1,
    top: [
      { id: "l1-1", rank: 1, displayName: "Shixxx", amount: 540, currency: "USD" },
      { id: "l1-2", rank: 2, displayName: "Zerxxx", amount: 300, currency: "USD" },
      { id: "l1-3", rank: 3, displayName: "Jaxxx", amount: 240, currency: "USD" },
    ],
    currentMerchant: { id: "l1-me", rank: 12, displayName: "You", amount: 120, currency: "USD" },
  },
  2: {
    league: 2,
    top: [
      { id: "l2-1", rank: 1, displayName: "Marxxx", amount: 1860, currency: "USD" },
      { id: "l2-2", rank: 2, displayName: "Kenxxx", amount: 1440, currency: "USD" },
      { id: "l2-3", rank: 3, displayName: "Aruxxx", amount: 1170, currency: "USD" },
    ],
    currentMerchant: null,
  },
  3: {
    league: 3,
    top: [
      { id: "l3-1", rank: 1, displayName: "Novxxx", amount: 6300, currency: "USD" },
      { id: "l3-2", rank: 2, displayName: "Tanxxx", amount: 5250, currency: "USD" },
      { id: "l3-3", rank: 3, displayName: "Priyxxx", amount: 4680, currency: "USD" },
    ],
    currentMerchant: null,
  },
};
