"use client";

import { useMemo } from "react";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";

export type ProductType = "PA" | "PACB";

export interface ResolvedMids {
  /** MID placed in the URL path. Non-empty only for partner users. */
  urlMid: string;
  /**
   * Injected into request body as fieldSearch.merchantId.
   * - Single-element array when a MID is explicitly selected.
   * - Full product array (paMids / paCbMids) when nothing is selected (fallback).
   * - undefined for partner users (they filter via URL) or when profile not yet loaded.
   */
  midFilter: { key: string; value: string[] } | undefined;
  /** Whether the downstream query should be enabled. */
  isReady: boolean;
  /**
   * "ready"          – render the feature normally.
   * "not-applicable" – selected MID does not support this product type; show NoFeatureView.
   */
  guardState: "ready" | "not-applicable";
}

export function useResolvedMids(productType: ProductType): ResolvedMids {
  const profile = useApp((s) => s.profile);
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const paMids = useApp((s) => s.paMids);
  const paCbMids = useApp((s) => s.paCbMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  return useMemo((): ResolvedMids => {
    const profileMid = profile?.mid ?? "";
    const fallbackMids = productType === "PA" ? paMids : paCbMids;

    // ── Partner users ────────────────────────────────────────────────────────
    // MID goes in the URL path; no merchantId filter in the body.
    if (isPartnerUser) {
      return {
        urlMid: profileMid,
        midFilter: undefined,
        isReady: !!profileMid,
        guardState: "ready",
      };
    }

    // ── Single-MID merchant ──────────────────────────────────────────────────
    // Prefer the product-specific MID list (e.g. paCbMids for PACB) over the
    // profile MID, because single-TID merchants can still have a distinct
    // sub-MID for a given product type (multiTid: false but pacbMids non-empty).
    if (!isMultiMidUser) {
      const mids = fallbackMids.length > 0 ? fallbackMids : profileMid ? [profileMid] : [];
      return {
        urlMid: "",
        midFilter: mids.length > 0 ? { key: "merchantId", value: mids } : undefined,
        isReady: mids.length > 0,
        guardState: "ready",
      };
    }

    // ── Multi-MID merchant with an explicit selection ────────────────────────
    if (selectedMid) {
      const isApplicable = fallbackMids.includes(selectedMid);

      if (!isApplicable) {
        // Selected MID belongs to the other product type (e.g. PACB MID on a PA feature).
        return {
          urlMid: "",
          midFilter: undefined,
          isReady: false,
          guardState: "not-applicable",
        };
      }

      return {
        urlMid: "",
        midFilter: { key: "merchantId", value: [selectedMid] },
        isReady: true,
        guardState: "ready",
      };
    }

    // ── Multi-MID merchant, no selection ────────────────────────────────────
    // Send all applicable MIDs as the fallback filter so the table shows data
    // across all of the merchant's accounts for this product type.
    if (fallbackMids.length > 0) {
      return {
        urlMid: "",
        midFilter: { key: "merchantId", value: fallbackMids },
        isReady: true,
        guardState: "ready",
      };
    }

    // ── Multi-MID merchant, no applicable MIDs for this product type ─────────
    // Feature not product-enabled; fall back to the profile MID so the query
    // can still run (behaviour mirrors pg-dashboard's per-feature decision).
    return {
      urlMid: "",
      midFilter: profileMid ? { key: "merchantId", value: [profileMid] } : undefined,
      isReady: !!profileMid,
      guardState: "ready",
    };
  }, [profile, isPartnerUser, isMultiMidUser, paMids, paCbMids, selectedMid, productType]);
}
