import { create } from "zustand";
import type { PaymentPageRow } from "@/features/dashboard/payment-pages/types";

interface EditingPaymentPageState {
  /** Row being edited, set by the list before navigating to /payment-page/edit.
   * Kept out of the URL so the edit route stays clean (no ?id). */
  row: PaymentPageRow | null;
  setRow: (row: PaymentPageRow | null) => void;
}

export const useEditingPaymentPage = create<EditingPaymentPageState>((set) => ({
  row: null,
  setRow: (row) => set({ row }),
}));
