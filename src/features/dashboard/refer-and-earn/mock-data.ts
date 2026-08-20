import type { Referral, ReferralStandings } from "@/features/dashboard/refer-and-earn/types";

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
 * Placeholder leaderboard standings.
 *
 * Dummy data, like the referrals above: names are masked the way a public
 * leaderboard would publish them. The list is the podium plus the slice around
 * the merchant — the shape a leaderboard endpoint realistically returns, rather
 * than every rank in between.
 *
 * The merchant's own `amount` and `referralCount` are overridden at render time
 * with their real earned total and completed-referral count, so their row always
 * agrees with the analytics row above it; only the rank comes from here, since
 * only the server can know it.
 */
export const MOCK_LEADERBOARD: ReferralStandings = {
  entries: [
    { id: "lb-1", rank: 1, displayName: "Shixxx", amount: 540, currency: "USD", referralCount: 18 },
    { id: "lb-2", rank: 2, displayName: "Zerxxx", amount: 300, currency: "USD", referralCount: 10 },
    { id: "lb-3", rank: 3, displayName: "Jaxxx", amount: 240, currency: "USD", referralCount: 8 },
    { id: "lb-11", rank: 11, displayName: "Prxxx", amount: 150, currency: "USD", referralCount: 5 },
    { id: "lb-me", rank: 12, displayName: "You", amount: 120, currency: "USD", referralCount: 4 },
  ],
  currentMerchantId: "lb-me",
};
