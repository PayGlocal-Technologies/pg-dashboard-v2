import { create } from "zustand";

export type DisputeResolutionOutcome = "WON" | "LOST" | "UNDER_REVIEW";

// TODO(integration): mock-only status override for disputes resolved during
// this session (accepting in full moves a dispute to "LOST", submitting
// evidence moves it to "UNDER_REVIEW"), there is no real resolve-dispute
// endpoint yet. Keyed by transaction gid so the Transactions table, Dispute
// Management table, and the shared detail page (see TransactionDetailFeature)
// all reflect the same in-session outcome instead of drifting out of sync
// with each other.
interface DisputeResolutionsState {
  resolutionByGid: Record<string, DisputeResolutionOutcome>;
  resolveDispute: (gid: string, outcome: DisputeResolutionOutcome) => void;
}

export const useDisputeResolutions = create<DisputeResolutionsState>()((set) => ({
  resolutionByGid: {},
  resolveDispute: (gid, outcome) =>
    set((state) => ({ resolutionByGid: { ...state.resolutionByGid, [gid]: outcome } })),
}));
