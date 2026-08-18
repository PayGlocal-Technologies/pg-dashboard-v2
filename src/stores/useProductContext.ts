import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductType } from "@/lib/hooks/useResolvedMids";

/**
 * Which of the Header's 3 top-level tabs the app is currently scoped to:
 * "HOME" (the combined overview), "PA" (Payments) or "PACB" (Multi-Currency
 * Accounts). Set by the Header's tabs, read by the Sidebar (to pick the
 * short Home nav tree vs the full product nav tree) and by every feature
 * that resolves mids or picks a mock dataset by product (via toProductType()
 * below), so the same URL (e.g. /reports/settlement-report) can render
 * different data depending on which context the merchant last selected.
 * Defaults to "HOME".
 */
export type NavContext = "HOME" | "PA" | "PACB";

interface ProductContextState {
  activeContext: NavContext;
  setActiveContext: (context: NavContext) => void;
}

export const useProductContext = create<ProductContextState>()(
  persist(
    (set) => ({
      activeContext: "HOME",
      setActiveContext: (context) => set({ activeContext: context }),
    }),
    { name: "productContextState" }
  )
);

/** "HOME" has no PA/PACB data of its own, features that need a concrete
 * product to resolve mids or pick a mock dataset fall back to "PA". */
export function toProductType(context: NavContext): ProductType {
  return context === "PACB" ? "PACB" : "PA";
}