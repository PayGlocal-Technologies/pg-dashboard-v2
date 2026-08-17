import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductType } from "@/lib/hooks/useResolvedMids";

/**
 * Which of the merchant's two products (Payments / PA, or Multi-Currency
 * Accounts / PACB) the shared Transactions and Settlement Reports screens
 * are currently scoped to. Set by the Header's top-level product tabs, read
 * by every feature that resolves mids or picks a mock dataset by product, so
 * the same URL (e.g. /reports/settlement-report) renders different data
 * depending on which product the merchant last selected. Defaults to "PA"
 * (Payments), see navigation.md for the full model this backs.
 */
interface ProductContextState {
  activeProduct: ProductType;
  setActiveProduct: (product: ProductType) => void;
}

export const useProductContext = create<ProductContextState>()(
  persist(
    (set) => ({
      activeProduct: "PA",
      setActiveProduct: (product) => set({ activeProduct: product }),
    }),
    {
      name: "productContextState",
      // The stored product lives in localStorage, which the server cannot read,
      // and both the header tabs and the sidebar's child filtering branch on
      // `activeProduct` during render. Hydrating automatically would therefore
      // make the server's markup (always the "PA" default) disagree with the
      // client's for anyone whose last selection was MCA, which React reports
      // as a hydration mismatch and recovers from by throwing the tree away.
      //
      // Skipping it here keeps the first client render identical to the
      // server's; Providers reads the stored value in immediately afterwards.
      skipHydration: true,
    }
  )
);
