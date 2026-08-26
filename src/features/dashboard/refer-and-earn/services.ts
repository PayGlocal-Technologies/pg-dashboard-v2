import { BASE_URL_V1 } from "@/api";

// Endpoint URL builders only. Copied verbatim from pg-dashboard's
// src/features/referrals/services.ts.
//
// "influencer" is the backend's own word for a referrer; the product calls the
// same thing Refer & Earn. The naming difference is production's, not ours.

/**
 * The merchant's own referral link. A POST that reads: it returns the existing
 * link, minting one on first call, so it is safe to fire on mount and is modelled
 * as a query (see useReferralLink).
 *
 * Body `{ referralType }`, response `{ data: { influencerId, influencerURL } }`.
 */
export const referralLinkApi = `${BASE_URL_V1}/influencer/service/generate`;

/**
 * Reward wallet: available, held, total earned and total withdrawn.
 *
 * No v2 surface consumes this yet — the Refer & Earn screen shows the link and
 * nothing else. Recorded here so the contract is not rediscovered from scratch
 * when the design grows a rewards section.
 */
export const referralWalletApi = (ucicId: string): string =>
  ucicId ? `${BASE_URL_V1}/influencer/service/${ucicId}/get-wallet` : "";

/** Referral credit/debit history. Also has no v2 surface yet, as above. */
export const referralTransactionsApi = (ucicId: string): string =>
  ucicId ? `${BASE_URL_V1}/influencer/service/${ucicId}/transactions` : "";
