import type { Referral } from "@/features/dashboard/refer-and-earn/types";

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
