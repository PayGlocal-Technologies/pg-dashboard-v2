"use client";

import { useMemo } from "react";
import { useApp } from "@/stores/useApp";

/**
 * Whether one MID has a given feature enabled.
 *
 * Ported verbatim from pg-dashboard (src/hooks/useFeatureApplicable.ts), which
 * is what gates eBRC — `useFeatureApplicable(mid, "EBRC")` — and shows its
 * NoFeatureView when the answer is no.
 *
 * Two rules carried across exactly, because both are load bearing:
 *
 *  - A single-MID merchant always passes. `tidsInfo` is only populated for
 *    multi-TID accounts, so checking it for everyone would deny the feature to
 *    every single-MID merchant that actually has it.
 *  - A MID that is not ACTIVE fails, even if its feature list contains the
 *    feature. A suspended MID keeps its entitlements in the payload.
 *
 * The three feature arrays are searched together (PA, PACB, PACBO) rather than
 * per product type: production does not know which list a given feature name
 * belongs to, and eBRC sits on the PACB side for some merchants and PACBO for
 * others.
 */
export function isFeatureAvailableForMid(
  mid: string,
  feature: string,
  isMultiMidUser: boolean,
  tidsInfo: ReturnType<typeof useApp.getState>["tidsInfo"]
): boolean {
  if (!isMultiMidUser) return true;

  const midConfig = tidsInfo?.find((m) => m.mid === mid);
  if (!midConfig) return false;
  if (midConfig.status !== "ACTIVE") return false;

  return (
    midConfig.paFeatures?.includes(feature) ||
    midConfig.paCbFeatures?.includes(feature) ||
    midConfig.pacboFeatures?.includes(feature)
  );
}

/** Whether `mid` has `feature`. */
export function useFeatureApplicable(mid: string, feature: string): boolean {
  const tidsInfo = useApp((s) => s.tidsInfo);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);

  return useMemo(
    () => isFeatureAvailableForMid(mid, feature, isMultiMidUser, tidsInfo),
    [mid, feature, isMultiMidUser, tidsInfo]
  );
}
