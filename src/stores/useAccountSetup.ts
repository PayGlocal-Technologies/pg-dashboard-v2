import { create } from "zustand";

export interface SelectedMidDetails {
  mid: string;
  status: string;
  color: string;
}

interface AccountSetupState {
  selectedMidDetails: SelectedMidDetails;
  setSelectedMidDetails: (
    update: Partial<SelectedMidDetails> | ((prev: SelectedMidDetails) => SelectedMidDetails)
  ) => void;
  reset: () => void;
}

const emptyMid: SelectedMidDetails = { mid: "", status: "", color: "" };

/**
 * The MID a multi-MID merchant is currently working inside.
 *
 * Deliberately NOT persisted, though it used to be (and pg-dashboard still is).
 * The MID lists a selection has to be valid against live in useApp, which is
 * in-memory and rebuilt from the merchant-products call on every load. A
 * persisted selection therefore outlived the session that made it and was read
 * back under whoever logged in next: useLogout cleared it, but a session that
 * timed out redirected straight to /login (see handleApiError) without ever
 * running it, and closing the tab skipped it too.
 *
 * What made that dangerous rather than untidy is where the MID ends up. It goes
 * into request *bodies* as the merchant-id filter, so a foreign MID is not an
 * error anyone notices. It is a well-formed search for somebody else's account,
 * answered with either their rows or none of the real ones.
 *
 * Keeping both stores in memory means the selection can only ever be one the
 * signed-in account was actually offered. The cost is that a full page load
 * resets it, so the two routes that deliberately hard-navigate carry the MID in
 * the URL and re-apply it on arrival (see useMidFromUrl).
 */
export const useAccountSetup = create<AccountSetupState>((set) => ({
  selectedMidDetails: emptyMid,
  setSelectedMidDetails: (update) =>
    set((state) => ({
      selectedMidDetails:
        typeof update === "function"
          ? update(state.selectedMidDetails)
          : { ...state.selectedMidDetails, ...update },
    })),
  reset: () => set({ selectedMidDetails: emptyMid }),
}));

// One-time cleanup of the key this store used to persist under. Without it a
// MID belonging to a previous account would sit in localStorage indefinitely,
// unread but still there. Safe to delete once every client has run this.
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("accountSetupState");
  } catch {
    // Private mode or blocked storage. Nothing to clean up in that case.
  }
}
