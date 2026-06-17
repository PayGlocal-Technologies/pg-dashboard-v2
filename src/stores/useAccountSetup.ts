import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const useAccountSetup = create<AccountSetupState>()(
  persist(
    (set) => ({
      selectedMidDetails: emptyMid,
      setSelectedMidDetails: (update) =>
        set((state) => ({
          selectedMidDetails:
            typeof update === "function"
              ? update(state.selectedMidDetails)
              : { ...state.selectedMidDetails, ...update },
        })),
      reset: () => set({ selectedMidDetails: emptyMid }),
    }),
    {
      name: "accountSetupState",
      partialize: (state) => ({ selectedMidDetails: state.selectedMidDetails }),
    }
  )
);
