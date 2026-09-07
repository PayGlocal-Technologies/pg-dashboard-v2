/**
 * The opening handshake.
 *
 * The rendering guide documents the welcome screen (image + main-menu list) as
 * what the server returns on the `INITIATED` step, but not how a client gets
 * the session there. The WhatsApp flow it shares an engine with starts by
 * saying "Hi", so this app does the same: one plain-text turn, sent once per
 * session, with no user bubble in the transcript — the merchant did not type
 * it, so showing it would be a lie about what happened.
 */
export const ECHO_GREETING = "Hi";

/**
 * Shown when the call fails or comes back with no messages. Per §7 of the
 * guide, resending the same input is safe: the server has not advanced its
 * step, so nothing is duplicated by a retry.
 */
export const ECHO_ERROR_MESSAGE =
  "I could not reach Echo just then. Nothing was lost, so you can try that again.";
