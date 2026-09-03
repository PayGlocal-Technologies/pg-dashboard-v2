import { create } from "zustand";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

// TODO(integration): there is no "get transaction by id" endpoint yet, so the
// full-page detail view can only render a transaction the user just had open
// in the drawer (handed off here right before navigating). A hard refresh or
// direct link loses it, see TransactionDetailFeature's not-found fallback.
// Replace with a real fetch-by-id call once that endpoint exists.
interface TransactionDetailState {
  transaction: PaTransaction | null;
  setTransaction: (transaction: PaTransaction | null) => void;
}

export const useTransactionDetail = create<TransactionDetailState>()((set) => ({
  transaction: null,
  setTransaction: (transaction) => set({ transaction }),
}));
