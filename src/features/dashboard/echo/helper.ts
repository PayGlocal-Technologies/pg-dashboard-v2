import type {
  EchoChunk,
  EchoInteractiveChunk,
  EchoListChunk,
  EchoButtonChunk,
} from "@/features/dashboard/echo/types";

export function isTextChunk(chunk: EchoChunk): chunk is Extract<EchoChunk, { type: "text" }> {
  return chunk.type === "text";
}

export function isImageChunk(chunk: EchoChunk): chunk is Extract<EchoChunk, { type: "image" }> {
  return chunk.type === "image";
}

export function isInteractiveChunk(chunk: EchoChunk): chunk is EchoInteractiveChunk {
  return chunk.type === "interactive";
}

export function isButtonChunk(chunk: EchoChunk): chunk is EchoButtonChunk {
  return chunk.type === "interactive" && chunk.interactive.type === "button";
}

export function isListChunk(chunk: EchoChunk): chunk is EchoListChunk {
  return chunk.type === "interactive" && chunk.interactive.type === "list";
}

/** The body copy of a chunk, whichever field it happens to live in. */
export function chunkBodyText(chunk: EchoChunk): string {
  if (isTextChunk(chunk)) return chunk.text?.body ?? "";
  if (isImageChunk(chunk)) return chunk.image?.caption ?? "";
  return chunk.interactive?.body?.text ?? "";
}

/**
 * §7 of the guide: "if the body text inside a chunk is blank or missing, skip
 * rendering that chunk silently."
 *
 * Taken literally that would also drop an interactive chunk whose body is
 * blank but whose buttons are the only way forward, stranding the merchant on
 * a dead screen. So the rule is applied per type: a text chunk needs a body, an
 * image needs a link, and an interactive chunk needs either a body or at least
 * one thing to tap.
 */
export function isRenderableChunk(chunk: EchoChunk | null | undefined): chunk is EchoChunk {
  if (!chunk || typeof chunk !== "object") return false;
  if (isTextChunk(chunk)) return chunkBodyText(chunk).trim().length > 0;
  if (isImageChunk(chunk)) return Boolean(chunk.image?.link);
  if (isButtonChunk(chunk)) {
    return chunkBodyText(chunk).trim().length > 0 || buttonsOf(chunk).length > 0;
  }
  if (isListChunk(chunk)) {
    return chunkBodyText(chunk).trim().length > 0 || listRowCount(chunk) > 0;
  }
  return false;
}

/** WhatsApp caps reply buttons at three; anything beyond that is dropped. */
export function buttonsOf(chunk: EchoButtonChunk) {
  return (chunk.interactive.action?.buttons ?? []).filter((b) => b?.reply?.id).slice(0, 3);
}

export function sectionsOf(chunk: EchoListChunk) {
  return (chunk.interactive.action?.sections ?? [])
    .map((section) => ({
      ...section,
      rows: (section.rows ?? []).filter((row) => row?.id),
    }))
    .filter((section) => section.rows.length > 0);
}

export function listRowCount(chunk: EchoListChunk): number {
  return sectionsOf(chunk).reduce((total, section) => total + section.rows.length, 0);
}

/** True when a chunk offers something to tap, i.e. it can advance the session. */
export function hasActions(chunk: EchoChunk): boolean {
  if (isButtonChunk(chunk)) return buttonsOf(chunk).length > 0;
  if (isListChunk(chunk)) return listRowCount(chunk) > 0;
  return false;
}

/** Strips the WhatsApp markers so a copied message reads as plain text. */
export function toPlainText(chunks: EchoChunk[]): string {
  return chunks
    .map((chunk) => chunkBodyText(chunk).replace(/\*([^*\n]+)\*/g, "$1").replace(/`([^`\n]+)`/g, "$1"))
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n\n");
}
