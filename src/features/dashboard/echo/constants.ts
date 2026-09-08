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
 * What the "New conversation" control sends. Session control the app drives
 * itself, from §5 of the rendering guide: unlike every other id, the server
 * never hands this one back inside a button or list chunk, the app sends it
 * proactively from its own chrome as an ordinary `button_reply`.
 *
 * `BTN_RESTART_CHAT` is what a "start over" control must send. Going back to
 * `BTN_MAIN_MENU` looks like a reset but keeps the same server session and
 * everything it has accumulated (menu position, drafts, history); only this id
 * discards it, and it answers with the full welcome screen (image + list).
 *
 * The guide documents a sibling, `BTN_END_CHAT_NOW`, which closes the session
 * without the rating prompt. Nothing here sends it: the server offers its own
 * `BTN_END_CHAT` button wherever ending the chat makes sense in the flow.
 */
export const ECHO_RESTART_REQUEST: EchoRequest = {
  userInput: "BTN_RESTART_CHAT",
  inputType: "button_reply",
};

/**
 * Shown when the call fails or comes back with no messages. Per §7 of the
 * guide, resending the same input is safe: the server has not advanced its
 * step, so nothing is duplicated by a retry.
 */
export const ECHO_ERROR_MESSAGE =
  "I could not reach Echo just then. Nothing was lost, so you can try that again.";
