/**
 * BACKEND GAP: no ticketing endpoint exists yet — create, list and status
 * updates are all mocked locally (see `@/stores/useSupportTickets`). These
 * types describe the shape that store persists, not a server contract; when
 * a real endpoint lands, this is where its response shape should replace
 * these.
 */

export type TicketTopic =
  | "SETTLEMENT_DELAYS"
  | "TRANSACTION_RELATED"
  | "VIRTUAL_ACCOUNTS"
  | "PLATFORM_WITHDRAWALS"
  | "ACCOUNT_RELATED"
  | "OTHERS";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface SupportTicket {
  id: string;
  topic: TicketTopic;
  /** Only ever set when `topic` is "OTHERS" — optional, free text. */
  customSubject: string;
  details: string;
  status: TicketStatus;
  /** Epoch ms. */
  createdAt: number;
}

export interface RaiseTicketInput {
  topic: TicketTopic;
  customSubject: string;
  details: string;
}
