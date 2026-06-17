"use client";

import type { ReactNode } from "react";
import { useResolvedMids, type ProductType } from "@/lib/hooks/useResolvedMids";
import { NoFeatureView } from "@/components/common/NoFeatureView";

interface MidGuardProps {
  productType: ProductType;
  children: ReactNode;
}

/**
 * Wraps a feature at the page/index level. When the user has selected a MID
 * that does not support the given product type, renders NoFeatureView instead
 * of the children. All guard logic is centralised here — individual tables
 * never need to know about it.
 */
export function MidGuard({ productType, children }: MidGuardProps) {
  const { guardState } = useResolvedMids(productType);

  if (guardState === "not-applicable") return <NoFeatureView />;
  return <>{children}</>;
}
