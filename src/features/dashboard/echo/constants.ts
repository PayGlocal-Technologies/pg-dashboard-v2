import type { EchoRequest } from "@/features/dashboard/echo/types";

/**
 * The opening handshake, sent once per session to get the server to the
 * welcome screen (the image + main-menu list the guide documents on the
 * `INITIATED` step).
 *
 * A `BTN_MAIN_MENU` button reply rather than the WhatsApp flow's plain "Hi":
 * it asks for the main menu explicitly instead of relying on the server to
 * read a greeting as "start over". Nothing is appended to the transcript for
 * it — the merchant did not tap anything, so showing a bubble would be a lie
 * about what happened.
 */
export const ECHO_OPENING_REQUEST: EchoRequest = {
  userInput: "BTN_MAIN_MENU",
  inputType: "button_reply",
};

/**
 * Shown when the call fails or comes back with no messages. Per §7 of the
 * guide, resending the same input is safe: the server has not advanced its
 * step, so nothing is duplicated by a retry.
 */
export const ECHO_ERROR_MESSAGE =
  "I could not reach Echo just then. Nothing was lost, so you can try that again.";
