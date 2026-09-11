/**
 * Request and response shapes for the Merchant Support API
 * (`/gcc/v1/merchants/{ucicId}/support`).
 *
 * The backend is a thin pass-through over Freshdesk, which is why the response
 * objects are snake_case while the request bodies are camelCase — the requests
 * are the backend's own DTOs, the responses are Freshdesk's objects relayed
 * unchanged. Do not "tidy" either side to match the other.
 */

/** All responses are wrapped `{ message, data, errors }`. */
interface Envelope<T> {
  message: string;
  data: T;
  errors: unknown;
}

/**
 * Freshdesk's numeric status codes.
 *
 * These are Freshdesk's built-in defaults, not values the API document
 * enumerates — it only shows `status: 2` in a sample response. Anything
 * outside this set therefore has to render as itself rather than as a guess;
 * see `ticketStatusMeta`.
 */
export const TICKET_STATUS_OPEN = 2;
export const TICKET_STATUS_PENDING = 3;
export const TICKET_STATUS_RESOLVED = 4;
export const TICKET_STATUS_CLOSED = 5;

export interface TicketCustomFields {
  cf_issue?: string | null;
  cf_category?: string | null;
  cf_business?: string | null;
  cf_team?: string | null;
  /** The third classification level exists in Freshdesk but the create
   *  endpoint has no field for it — see the BACKEND GAP note in
   *  `classification.ts`. Read-only if an agent sets it. */
  cf_sub_category?: string | null;
}

/**
 * A ticket as Freshdesk returns it.
 *
 * BACKEND GAP — `created_at`, `updated_at` and `description_text` are standard
 * Freshdesk ticket fields and the endpoint is a pass-through, but the API
 * document elides the list response (`{ id, subject, status, priority, "...":
 * "..." }`) and never shows them, so they could not be confirmed. Every one is
 * optional here and every consumer degrades to a dash rather than rendering
 * "undefined" or an Invalid Date. If the list turns out to omit `created_at`,
 * the date filter and the "Raised" line are what go quiet.
 */
export interface SupportTicket {
  id: number;
  subject: string;
  /** Freshdesk's `ticket_type`. The client never sends it — the backend
   *  hardcodes "GCC related issues/request". */
  type?: string | null;
  /** 1 Low … 4 Urgent. Displayed only when the desk has raised it above Low,
   *  since every ticket lands at Low and a "Low" chip on all of them is noise. */
  priority?: number | null;
  status: number;
  company_id?: number | null;
  requester_id?: number | null;
  custom_fields?: TicketCustomFields | null;
  /** ISO 8601. */
  created_at?: string | null;
  updated_at?: string | null;
  /** HTML. Prefer `description_text` for display. */
  description?: string | null;
  description_text?: string | null;
}

/** A file already attached to a ticket or a reply, as Freshdesk describes it. */
export interface TicketAttachment {
  id: number;
  name: string;
  content_type?: string | null;
  size?: number | null;
  /**
   * A short-lived, pre-signed S3 URL. It expires, so it is only ever followed
   * on an explicit click and never used as an `<img src>` that would refetch
   * on every render.
   */
  attachment_url?: string | null;
}

/** One entry in a ticket's reply thread. */
export interface TicketConversationEntry {
  id: number;
  /** HTML. Prefer `body_text`. */
  body?: string | null;
  body_text?: string | null;
  /**
   * Freshdesk's direction flag: true = inbound from the merchant, false =
   * outbound from the helpdesk.
   *
   * Optional because the backend's DTOs demonstrably drop fields the raw
   * Freshdesk object has (the ticket list carries no `description_text`), so
   * this cannot be assumed present. Absent is treated as "not the merchant",
   * which is the conservative reading — but see the caveat on `incoming`
   * usage in TicketConversation: a merchant reply posted through
   * `POST /reply` is recorded by Freshdesk as an *agent* reply, so this flag
   * alone cannot identify the author today.
   */
  incoming?: boolean | null;
  /** true = an internal agent note. Never shown to the merchant — the API
   *  reference makes this an explicit filtering rule, not a preference. */
  private: boolean;
  from_email?: string | null;
  to_emails?: string[] | null;
  attachments?: TicketAttachment[] | null;
  /** ISO 8601. */
  created_at?: string | null;
}

// ─── Requests ─────────────────────────────────────────────────────────────────

/**
 * Create-ticket body. `subject` and `description` are the only required
 * fields; each classification field independently falls back to a server
 * default when omitted (cfBusiness: MCA, cfTeam: SMB Merchant, cfIssue:
 * Merchant Request, cfCategory: Escalation Matrix).
 *
 * The requester's name and email are deliberately absent: the backend resolves
 * the name from the session and the email from the merchant's onboarding
 * record, and ignores them if sent.
 */
export interface CreateTicketPayload {
  subject: string;
  description: string;
  /** C2B | MCA | PA | BillX. Derived from the active product context. */
  cfBusiness?: string;
  /** Enterprise Merchant | SMB Merchant | Partnership. Never sent — an
   *  internal segmentation the merchant cannot know. Typed so the field is
   *  discoverable if that changes. */
  cfTeam?: string;
  cfIssue?: string;
  /** Must be one of the categories valid for `cfIssue`. */
  cfCategory?: string;
}

// ─── Responses ────────────────────────────────────────────────────────────────

export type CreateTicketResponse = Envelope<{ ticket: SupportTicket }>;
export type TicketListResponse = Envelope<{ tickets: SupportTicket[] | null }>;
export type TicketDetailResponse = Envelope<{ ticket: SupportTicket }>;
export type TicketConversationsResponse = Envelope<{
  conversations: TicketConversationEntry[] | null;
}>;

/** What the raise-ticket form collects, before it becomes a JSON body or a
 *  FormData. Kept separate from `CreateTicketPayload` because attachments are
 *  not a body field — they decide which of the two variants gets used. */
export interface RaiseTicketInput {
  subject: string;
  description: string;
  cfIssue: string;
  cfCategory: string;
  attachments: File[];
}
