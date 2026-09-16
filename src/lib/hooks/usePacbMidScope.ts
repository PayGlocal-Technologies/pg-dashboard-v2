"use client";

import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";

export interface PacbMidScope {
  /**
   * True when the merchant holds more than one PACB MID and has selected none —
   * the state in which "which account is this for?" is a real question, so an
   * action that addresses a single MID has to ask before it runs.
   *
   * Mirrors pg-dashboard's own `pacbMids.length > 1 && !selectedMid`, which is
   * what turns its header buttons into ChooseMidSelect pickers.
   */
  needsMidChoice: boolean;
  /** Every PACB MID available to pick from, for those pickers. */
  midOptions: string[];
  /** Commits a pick, so the action runs already scoped to that MID — the same
   *  store the header's merchant selector writes. */
  selectMid: (mid: string) => void;
}

/**
 * The one description of "does this action know which MID it applies to".
 *
 * Lifted out of client-management and sku-management, which each held their own
 * identical copy (`useClientMidScope` / `useSkuMidScope`) — and the create-invoice
 * entry points now need the same answer, which would have made three. The rule
 * only reads two stores and is the same rule everywhere, so it lives here and
 * those hooks re-export it.
 */
export function usePacbMidScope(): PacbMidScope {
  const paCbMids = useApp((s) => s.paCbMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  return {
    needsMidChoice: paCbMids.length > 1 && !selectedMid,
    midOptions: paCbMids,
    // Colour tints the header's merchant chip; pg-dashboard sets one here too
    // when a page selects a MID on the merchant's behalf, so the chip doesn't
    // appear blank afterwards.
    selectMid: (mid: string) => setSelectedMidDetails({ mid, color: "#E5B5FF" }),
  };
}
