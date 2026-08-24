import { create } from "zustand";
import type { RefundEvent } from "@/features/dashboard/transactions/financial/types";

// TODO(integration): mock only, a real refund endpoint would create this
// event server-side. Keyed by the transaction's own gid, a refund NEVER gets
// its own merchant-facing transaction ID here, this only holds refunds
// issued THIS session that aren't already part of the transaction's own
// mock-seeded refunds[] (see PaTransaction), deriveTransactionDetail merges
// the two, see TransactionDetailFeature's handleIssueRefund.
interface RefundEventsState {
  eventsByTransactionId: Record<string, RefundEvent[]>;
  addRefundEvent: (transactionId: string, event: RefundEvent) => void;
}

export const useRefundEvents = create<RefundEventsState>()((set) => ({
  eventsByTransactionId: {},
  addRefundEvent: (transactionId, event) =>
    set((state) => ({
      eventsByTransactionId: {
        ...state.eventsByTransactionId,
        [transactionId]: [...(state.eventsByTransactionId[transactionId] ?? []), event],
      },
    })),
}));
