/**
 * Freshdesk sends body copy as HTML (`description`, `body`) and *sometimes*
 * also as a plain-text twin (`description_text`, `body_text`). Which of the
 * two arrives depends on the endpoint and on how the backend's DTO is
 * mapped — the live list response carries `description` and no
 * `description_text` at all — so nothing may assume either one is present.
 */

/** Block-level tags whose boundaries are real line breaks in the original. */
const BLOCK_BREAK = /<\s*(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?\s*>/gi;
const TAG = /<[^>]*>/g;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * HTML to readable text.
 *
 * Regex rather than DOMParser deliberately: these are client components but
 * Next prerenders them, and there is no DOM during that pass. It is also not
 * a sanitiser and does not need to be — the output is rendered as a text node,
 * never with `dangerouslySetInnerHTML`, so nothing here can execute. The job
 * is legibility, not safety.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return (
    html
      .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(BLOCK_BREAK, "\n")
      .replace(TAG, "")
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
      .replace(/&[a-z]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
      // Freshdesk wraps replies in <div>s, which leaves runs of blank lines.
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * The readable form of a Freshdesk body field: the plain-text twin when the
 * endpoint sent one, otherwise the HTML field flattened.
 *
 * Prefers `plain` because it is Freshdesk's own extraction and is always
 * better than anything derived from the markup.
 */
export function bodyText(
  plain: string | null | undefined,
  html: string | null | undefined
): string {
  const preferred = (plain ?? "").trim();
  return preferred || htmlToText(html);
}
