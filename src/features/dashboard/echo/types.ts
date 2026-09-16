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

// ─── Cosmetic progress steps ──────────────────────────────────────────────────

export type AgentStepStatus = "pending" | "active" | "done";

/**
 * One line in the stepped loader.
 *
 * These do NOT come from the server and are not observed progress. A turn is a
 * single POST whose duration the client cannot see inside, so the steps are
 * advanced on timers purely as a loading affordance — see
 * `useEchoCosmeticSteps`. Nothing branches on them.
 */
export interface AgentStep {
  id: string;
  label: string;
  status: AgentStepStatus;
}

// ─── Result cards (no backend yet) ────────────────────────────────────────────

/**
 * BACKEND GAP: nothing below is on the wire today.
 *
 * `POST /gcc/v1/echo/app` answers only with `text`, `image` and `interactive`
 * (button / list) chunks — see `EchoChunk` above, which is the real contract.
 * These view models describe the richer cards the design calls for (a KPI
 * figure, a short table, a breakdown donut, a call-to-action) and
 * `EchoResultCards.tsx` renders them, but no code path constructs one: there is
 * no field in an Echo response to build them from.
 *
 * Kept so the rendering half is ready the day the server can return structured
 * results. When that happens, extend `EchoChunk` with the real chunk type and
 * map it to these in `helper.ts` — do not invent a shape here to match a
 * screenshot.
 */

/** A single KPI figure, e.g. "earnings this month". */
export interface EchoMetricResult {
  kind: "metric";
  title: string;
  value: string;
  changeLabel: string;
  /** `true` = up/positive styling, `false` = down/negative. */
  positive: boolean;
}

/** A short table, e.g. the last five transactions or FIRCs. */
export interface EchoTableResult {
  kind: "table";
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string>[];
  /**
   * Where "View all" on this card should send the merchant. Both optional and
   * both required together: a table lifted out of a prose reply
   * (`recordTable.ts`) has no route to offer, and a footer link that guesses
   * one would send the merchant somewhere the reply never mentioned.
   */
  viewAllHref?: string;
  viewAllLabel?: string;
}

/** A donut breakdown, e.g. payment-mode distribution beside a table. */
export interface EchoDonutResult {
  kind: "donut";
  title: string;
  subtitle?: string;
  segments: { key: string; label: string; value: number; color: string }[];
}

/** A call-to-action card, handing off to a real workflow in the dashboard
 *  rather than pretending to complete it inline. */
export interface EchoActionResult {
  kind: "action";
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

export type EchoResult = EchoMetricResult | EchoTableResult | EchoDonutResult | EchoActionResult;
