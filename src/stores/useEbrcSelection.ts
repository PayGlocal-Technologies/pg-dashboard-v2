import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EbrcSelectionState {
  /** IRM numbers picked in step 1, in selection order. */
  selectedIrms: string[];
  setSelectedIrms: (irms: string[]) => void;
  clearSelectedIrms: () => void;
}

/**
 * The IRMs the merchant is generating an eBRC for.
 *
 * Ported from pg-dashboard's `useEbrc` store, persistence included. It matters
 * for the same reason there: the mapping step is the long one — uploading a
 * shipping bill per IRM, waiting on extraction, typing deductions — and losing
 * the selection to a refresh means starting the whole thing again. pg-dashboard
 * also spans three routes with it; v2's wizard is one route, but a reload is
 * just as destructive.
 *
 * Only the IRM numbers are kept. Everything about those IRMs is re-read from
 * `fetch_irm_by_number` on mount, so nothing here can go stale against the
 * server — a number that has since been mapped elsewhere simply comes back
 * with its new status.
 */
export const useEbrcSelection = create<EbrcSelectionState>()(
  persist(
    (set) => ({
      selectedIrms: [],
      setSelectedIrms: (selectedIrms) => set({ selectedIrms }),
      clearSelectedIrms: () => set({ selectedIrms: [] }),
    }),
    {
      name: "ebrcSelectionState",
      partialize: (state) => ({ selectedIrms: state.selectedIrms }),
    }
  )
);
