/**
 * Wire types for POST /gcc/v1/echo/app, transcribed from APP_RENDERING_GUIDE.md.
 *
 * The payload is WhatsApp Cloud API message JSON, because the same server
 * drives PayGlocal's WhatsApp support bot: hence `messaging_product`, a `to`
 * phone number this app ignores, a hard cap of three buttons, and `*bold*`
 * rather than markdown's `**bold**`. Nothing here is invented — every field
 * is one the guide documents.
 */

/** How the user produced `userInput`. The server branches on this. */
export type EchoInputType = "text" | "button_reply" | "list_reply";

export type EchoRequest = {
  /** Free text the user typed, or the `id` of the button/row they tapped. */
  userInput: string;
  inputType: EchoInputType;
};

type EchoChunkBase = {
  /** Always "whatsapp". Present because of the shared bot engine; unused here. */
  messaging_product?: string;
  /** The recipient's phone number. Never rendered. */
  to?: string;
};

export type EchoTextChunk = EchoChunkBase & {
  type: "text";
  text: { body: string };
};

export type EchoImageChunk = EchoChunkBase & {
  type: "image";
  image: { link: string; caption?: string };
};

export type EchoReplyButton = {
  type: "reply";
  reply: { id: string; title: string };
};

export type EchoButtonChunk = EchoChunkBase & {
  type: "interactive";
  interactive: {
    type: "button";
    body?: { text?: string };
    action: { buttons: EchoReplyButton[] };
  };
};

export type EchoListRow = {
  /** Sent back verbatim. Sometimes a constant, sometimes a mid or product name. */
  id: string;
  title: string;
  /** Optional subtitle. Documented in the guide, absent from every example. */
  description?: string;
};

export type EchoListSection = {
  title?: string;
  rows: EchoListRow[];
};

export type EchoListChunk = EchoChunkBase & {
  type: "interactive";
  interactive: {
    type: "list";
    body?: { text?: string };
    action: { button: string; sections: EchoListSection[] };
  };
};

export type EchoInteractiveChunk = EchoButtonChunk | EchoListChunk;

export type EchoChunk = EchoTextChunk | EchoImageChunk | EchoInteractiveChunk;

export type EchoAppResponse = {
  message: string;
  /** e.g. "200 OK". The HTTP status is what actually decides success. */
  status: string;
  data: { messages: EchoChunk[] };
};

// ─── View model ───────────────────────────────────────────────────────────────

/**
 * One turn in the transcript.
 *
 * A user turn holds only a display label — the wire value it sent (a button id
 * like `BTN_MAIN_MENU`) is deliberately not shown, the button's own title is.
 * An assistant turn holds the chunks from one response, rendered in order; a
 * single response routinely carries two (the welcome image followed by the
 * main-menu list).
 */
export type EchoEntry =
  | { id: string; role: "user"; label: string }
  | { id: string; role: "assistant"; chunks: EchoChunk[] }
  /** A failed call. `request` is what to resend — the server session is intact. */
  | { id: string; role: "assistant"; failure: { message: string; request: EchoRequest } };

export type EchoStatus = "idle" | "starting" | "sending";
