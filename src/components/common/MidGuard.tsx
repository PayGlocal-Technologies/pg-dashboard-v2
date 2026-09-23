"use client";

import type { ReactNode } from "react";
import { useResolvedMids, type ProductType } from "@/lib/hooks/useResolvedMids";
import { useFeatureApplicable } from "@/lib/hooks/useFeatureApplicable";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { NoFeatureView } from "@/components/common/NoFeatureView";

interface MidGuardProps {
  productType: ProductType;
  /**
   * An additional per-MID entitlement the selected MID must carry, e.g.
   * `"EBRC"`. Products and features are two separate gates in the backend's
   * payload: a MID can be PACB and still not be entitled to eBRC, which is why
   * pg-dashboard checks `useFeatureApplicable(mid, "EBRC")` on top of its own
   * product check. Omit it for features every MID of the product type has.
   */
  feature?: string;
  children: ReactNode;
}

/**
 * Wraps a feature at the page/index level. When the user has selected a MID
 * that does not support the given product type — or, with `feature`, does not
 * carry that entitlement — renders NoFeatureView instead of the children. All
 * guard logic is centralised here — individual tables never need to know about
 * it.
 */
export function MidGuard({ productType, feature, children }: MidGuardProps) {
  const { guardState } = useResolvedMids(productType);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  // Only meaningful once a MID is actually selected: with none selected the
  // feature spans whichever of the merchant's MIDs have it, and the nav entry
  // is what decides whether the page is reachable at all.
  const hasFeature = useFeatureApplicable(selectedMid, feature ?? "");

  if (guardState === "not-applicable") return <NoFeatureView />;
  if (feature && selectedMid && !hasFeature) return <NoFeatureView />;
  return <>{children}</>;
}
