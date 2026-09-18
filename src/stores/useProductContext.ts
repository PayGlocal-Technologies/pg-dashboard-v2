import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductType } from "@/lib/hooks/useResolvedMids";

/**
 * Which of the Header's 3 top-level tabs the app is currently scoped to:
 * "HOME" (the combined overview), "PA" (Payments) or "PACB" (Multi-Currency
 * Accounts). Set by the Header's tabs, read by the Sidebar (to pick the
 * short Home nav tree, the MCA tree, or the full Payments tree) and by every
 * feature that resolves mids or picks a mock dataset by product (via
 * toProductType() below), so the same URL (e.g. /settlement-report)
 * can render different data depending on which context the merchant last
 * selected. Defaults to "HOME", see navigation.md for the full model.
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
    {
      name: "productContextState",
      // The stored context lives in localStorage, which the server cannot read,
      // and both the header tabs and the sidebar's nav-tree selection branch on
      // `activeContext` during render. Hydrating automatically would therefore
      // make the server's markup (always the "HOME" default) disagree with the
      // client's for anyone whose last selection was Payments or MCA, which
      // React reports as a hydration mismatch and recovers from by throwing the
      // tree away.
      //
      // Skipping it here keeps the first client render identical to the
      // server's; Providers reads the stored value in immediately afterwards.
      skipHydration: true,
    }
  )
);

/** "HOME" has no PA/PACB data of its own, features that need a concrete
 * product to resolve mids or pick a mock dataset fall back to "PA". */
export function toProductType(context: NavContext): ProductType {
  return context === "PACB" ? "PACB" : "PA";
}
