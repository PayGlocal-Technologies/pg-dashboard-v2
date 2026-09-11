import { BASE_URL_V1 } from "@/api";

/**
 * Merchant Support endpoints — Freshdesk-backed ticketing, scoped to the
 * caller's own business by the `ucicId` path segment.
 *
 * Source: the Merchant Support API reference (backend as of 2026-09-10). This
 * has no pg-dashboard counterpart — production has no ticketing feature at
 * all — so these paths come from that document rather than from a live call
 * site, which is why each one is written out verbatim rather than derived.
 *
 * Every builder returns "" when its ids are missing, so a query that has not
 * resolved its scope yet cannot construct a malformed URL.
 */

/** `/gcc/v1/merchants/{ucicId}/support`. Not exported — every endpoint below
 *  hangs off it, and nothing calls the bare base. */
function supportBase(ucicId: string): string {
  return `${BASE_URL_V1}/merchants/${encodeURIComponent(ucicId)}/support`;
}

/**
 * List (GET) and create (POST) share this one URL — the create endpoint also
 * serves its multipart variant here, with only `Content-Type` telling them
 * apart. One builder, three uses.
 */
export const supportTicketsApi = (ucicId: string): string =>
  ucicId ? `${supportBase(ucicId)}/tickets` : "";

/** A single ticket's full detail. */
export const supportTicketApi = (ucicId: string, ticketId: number | string): string =>
  ucicId && ticketId
    ? `${supportBase(ucicId)}/tickets/${encodeURIComponent(String(ticketId))}`
    : "";

/** The ticket's reply thread. */
export const supportTicketConversationsApi = (
  ucicId: string,
  ticketId: number | string
): string => {
  const ticket = supportTicketApi(ucicId, ticketId);
  return ticket ? `${ticket}/conversations` : "";
};
