import { create } from "zustand";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

// TODO(integration): mock only. Real refunds go through a refund endpoint
// that creates the linked "Refund" transaction server-side and returns it in
// the parent's own linked-transactions list, this store exists purely so the
// Issue Refund dialog can show the new linked transaction immediately in this
// client-only preview, without a backend. Keyed by the parent transaction's
// gid so a refund issued from the drawer still shows up if the merchant
// reopens the same transaction (drawer or full page) later in the session.
interface IssuedRefundsState {
  refundsByParentGid: Record<string, PaTransaction[]>;
  addRefund: (parentGid: string, refund: PaTransaction) => void;
}

export const useIssuedRefunds = create<IssuedRefundsState>()((set) => ({
  refundsByParentGid: {},
  addRefund: (parentGid, refund) =>
    set((state) => ({
      refundsByParentGid: {
        ...state.refundsByParentGid,
        [parentGid]: [...(state.refundsByParentGid[parentGid] ?? []), refund],
      },
    })),
}));
