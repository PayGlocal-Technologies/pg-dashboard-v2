import type { IconName } from "@/components/icon";
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

/**
 * The prompt chips shown on a fresh conversation, in the panel's two-column
 * grid and the full page's "Try asking" list.
 *
 * `prompt` is what actually goes on the wire, as an ordinary
 * `inputType: "text"` turn — the same thing typing it by hand would send. The
 * server decides what it understands; nothing here is routed client-side.
 * Kept distinct from `label` because a couple read better as a question in the
 * transcript than as a chip.
 */
export const ECHO_QUICK_ACTIONS: { id: string; label: string; icon: IconName; prompt: string }[] = [
  {
    id: "create-invoice",
    label: "Create invoice",
    icon: "file-text",
    prompt: "Create invoice",
  },
  {
    id: "last-transactions",
    label: "Show me last 5 transactions",
    icon: "credit-card",
    prompt: "Show me my last 5 transactions",
  },
  {
    id: "earnings-this-month",
    label: "What were my earnings for this month",
    icon: "trending-up",
    prompt: "What were my earnings for this month?",
  },
  {
    id: "last-fircs",
    label: "Show my last 5 FIRCs",
    icon: "landmark",
    prompt: "Show my last 5 FIRCs",
  },
];

/**
 * Icons for the welcome screen's menu rows, keyed on the row id the server
 * sends.
 *
 * Purely cosmetic. The server owns this list and can add a row whenever it
 * likes, so `EchoListOptions` shows the icon column only when EVERY row in a
 * section is mapped — a list of merchant accounts or currencies gets no icons
 * rather than a column of identical fallback glyphs. Nothing here affects what
 * goes on the wire; the id is still sent back verbatim.
 */
export const ECHO_MENU_ICONS: Record<string, IconName> = {
  BTN_TRANSACTIONS: "credit-card",
  BTN_SETTLEMENTS: "landmark",
  BTN_RAISE_QUERY: "message-circle",
  BTN_ACCOUNTS: "wallet",
  BTN_DISPUTES: "help-circle",
  BTN_PAYMENT_LINKS: "link",
  BTN_INVOICES: "file-text",
  BTN_RECEIPTS: "receipt",
  BTN_MAIN_MENU: "layout-grid",
  BTN_END_CHAT: "log-out",
};

/**
 * The stepped loader's lines, advanced on timers while a turn is in flight.
 *
 * Cosmetic: the protocol is one request/one response, so the client never
 * learns which of these the server is actually doing. See
 * `useEchoCosmeticSteps`.
 */
export const ECHO_PROGRESS_STEPS: { id: string; label: string }[] = [
  { id: "understand", label: "Understanding your request" },
  { id: "look", label: "Looking into your account" },
  { id: "prepare", label: "Preparing the answer" },
];

/** How long each cosmetic step holds before the next one lights up. */
export const ECHO_STEP_INTERVAL_MS = 900;
