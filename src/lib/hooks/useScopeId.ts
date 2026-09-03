"use client";

import { useMemo } from "react";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import type { ProductType } from "@/lib/hooks/useResolvedMids";

export interface ResolvedScope {
  /**
   * The id to put in an analytics endpoint's path segment. Either a merchant id
   * or the UCIC id — the backend accepts both in that slot.
   */
  scopeId: string;
  /**
   * Which of the two it is. Endpoints that ship a merchant-scoped and a
   * UCIC-scoped variant of the same analytic pick their path off this; the
   * merchant-only endpoints ignore it and just use scopeId.
   */
  scope: "mid" | "ucic";
  /** Whether a downstream query has enough to run. */
  isReady: boolean;
}

/**
 * Resolves the single id that path-scoped analytics endpoints take, per the
 * agreed rule:
 *
 *   - not a multi-MID account          -> the product's first MID
 *   - multi-MID with a MID selected    -> the selected MID
 *   - multi-MID with no selection      -> the UCIC id (whole-account roll-up)
 *
 * This is deliberately NOT useResolvedMids. That hook answers a different
 * question — which MIDs go in an OpenSearch request *body* — and its `urlMid`
 * is non-empty for partner users only, which makes it the wrong thing to branch
 * a merchant-vs-UCIC path on. Analytics cards want one id; tables want a list.
 *
 * Partner users keep their existing behaviour: the profile MID, treated as a
 * MID scope. They carry the MID in the URL path and have no MID picker, so none
 * of the three cases above applies to them.
 */
export function useScopeId(productType: ProductType): ResolvedScope {
  const profile = useApp((s) => s.profile);
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const paMids = useApp((s) => s.paMids);
  const paCbMids = useApp((s) => s.paCbMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  return useMemo((): ResolvedScope => {
    const profileMid = profile?.mid ?? "";
    const ucicId = profile?.ucicId ?? "";
    const productMids = productType === "PA" ? paMids : paCbMids;

    if (isPartnerUser) {
      return { scopeId: profileMid, scope: "mid", isReady: !!profileMid };
    }

    // Single-MID account: the product's own MID, falling back to the profile
    // MID when the product list has not been populated (mirrors the same
    // fallback in useResolvedMids).
    if (!isMultiMidUser) {
      const mid = productMids[0] || profileMid;
      return { scopeId: mid, scope: "mid", isReady: !!mid };
    }

    // Multi-MID with an explicit selection, but only if that MID belongs to
    // this product — a PA MID selected on a PACB page is not a valid scope.
    if (selectedMid && productMids.includes(selectedMid)) {
      return { scopeId: selectedMid, scope: "mid", isReady: true };
    }

    // Multi-MID, nothing selected (or a selection from the other product):
    // roll up across the account.
    return { scopeId: ucicId, scope: "ucic", isReady: !!ucicId };
  }, [profile, isPartnerUser, isMultiMidUser, paMids, paCbMids, selectedMid, productType]);
}
