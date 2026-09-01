"use client";

import { useGet, usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import {
  referralLinkApi,
  referralTransactionsApi,
  referralWalletApi,
} from "@/features/dashboard/refer-and-earn/services";
import type {
  ReferralTransaction,
  ReferralTransactionsResponse,
  ReferralWallet,
  ReferralWalletResponse,
} from "@/features/dashboard/refer-and-earn/types";

/**
 * Which programme the link is for. "mca" verbatim from pg-dashboard's
 * ReferralCard, which is the Multi-Currency Accounts referral flow this screen
 * is reached from (the sidebar's refer banner only shows in the PACB context).
 *
 * A module constant, not an inline object: usePostQuery folds the body into the
 * query key, so a literal rebuilt each render would mint a new key every render
 * and refetch forever.
 */
const REFERRAL_BODY = { referralType: "mca" } as const;

interface ReferralLinkResponse {
  data: {
    influencerId: string;
    influencerURL: string;
  };
  message?: string;
}

/**
 * The merchant's referral link.
 *
 * A POST modelled as a query, per CLAUDE.md's POST-as-read rule. pg-dashboard
 * fires the same call from a mount effect with `usePost`; the endpoint returns
 * the merchant's existing link (minting one the first time) rather than creating
 * a new one per call, so it is a read and belongs in the cache. That also means
 * two visits to this screen in one session cost one request, where production
 * pays for both.
 */
export function useReferralLink(): { link: string; isLoading: boolean; isError: boolean } {
  const profile = useApp((s) => s.profile);
  const isGuestUser = useApp((s) => s.isGuestUser);

  const { data, isPending, isError } = usePostQuery<ReferralLinkResponse, typeof REFERRAL_BODY>(
    ["referral-link", REFERRAL_BODY.referralType],
    referralLinkApi,
    REFERRAL_BODY,
    undefined,
    // Positional 5th argument, not an options field — see usePostQuery.
    !!profile && !isGuestUser
  );

  return {
    link: data?.data?.influencerURL ?? "",
    isLoading: !!profile && !isGuestUser && isPending,
    isError,
  };
}

/**
 * The merchant's reward wallet (available / held / earned / withdrawn totals).
 *
 * The influencer service scopes the wallet by the merchant's `mid` — pg-dashboard
 * passes `profile.mid` into the path segment it names "ucicId". They are the same
 * value for most merchants but not all, so passing `profile.ucicId` here 403s for
 * merchants where the two differ. Match pg-dashboard exactly: use `profile.mid`.
 */
export function useReferralWallet(): {
  wallet: ReferralWallet | null;
  isLoading: boolean;
  isError: boolean;
} {
  const mid = useApp((s) => s.profile?.mid);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const enabled = !!mid && !isGuestUser;

  const { data, isLoading, isError } = useGet<ReferralWalletResponse>(
    ["referral-wallet", mid],
    referralWalletApi(mid ?? ""),
    { enabled }
  );

  return { wallet: data?.data.wallet ?? null, isLoading, isError };
}

/**
 * The merchant's referral credit/debit history. CREDITs become the earnings
 * rows the table renders; DEBITs are wallet withdrawals reconciled from
 * useReferralWallet.
 */
export function useReferralTransactions(): {
  transactions: ReferralTransaction[];
  isLoading: boolean;
  isError: boolean;
} {
  const mid = useApp((s) => s.profile?.mid);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const enabled = !!mid && !isGuestUser;

  const { data, isLoading, isError } = useGet<ReferralTransactionsResponse>(
    ["referral-transactions", mid],
    referralTransactionsApi(mid ?? ""),
    { enabled }
  );

  return { transactions: data?.data.transactions ?? [], isLoading, isError };
}
