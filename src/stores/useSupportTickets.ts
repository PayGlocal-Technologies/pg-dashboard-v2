import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RaiseTicketInput, SupportTicket } from "@/features/dashboard/support-tickets/types";

/**
 * BACKEND GAP: there is no ticketing endpoint yet — no create, no list, no
 * status updates. Tickets raised here are persisted to this browser only, via
 * zustand's `persist`, so they survive a refresh but not a different device,
 * session, or a cleared cache. Every consumer reaches tickets only through
 * `useSupportTickets()`, so swapping this for real `useGet`/`usePost` calls
 * against a `support-tickets/services.ts` once the endpoint exists should not
 * require touching the raise-ticket form or the "My tickets" list.
 *
 * New tickets always land as "OPEN" and never progress on their own — there is
 * no support system on the other end actually working them. A merchant should
 * not read a ticket quietly turning "Resolved" by itself as a real update.
 */
interface SupportTicketsState {
  tickets: SupportTicket[];
  raiseTicket: (input: RaiseTicketInput) => SupportTicket;
}

export const useSupportTickets = create<SupportTicketsState>()(
  persist(
    (set) => ({
      tickets: [],
      raiseTicket: (input) => {
        const ticket: SupportTicket = {
          // Random, not sequential: nothing here is meant to imply a shared,
          // server-assigned ticket number.
          id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          topic: input.topic,
          customSubject: input.topic === "OTHERS" ? input.customSubject.trim() : "",
          details: input.details.trim(),
          status: "OPEN",
          createdAt: Date.now(),
        };
        set((state) => ({ tickets: [ticket, ...state.tickets] }));
        return ticket;
      },
    }),
    { name: "supportTicketsState" }
  )
);
