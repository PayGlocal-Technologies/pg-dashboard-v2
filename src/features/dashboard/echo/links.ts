/**
 * URL detection for Echo bodies.
 *
 * Echo's answers arrive as prose written for a WhatsApp bot, so a payment link
 * is a bare `https://…` inside a text body (`Your payment link is ready!`) or
 * the value of a `Payment Link:` field in a record block. Neither carries any
 * markup saying "this is a link", so the dashboard has to recognise one to
 * render it as an anchor. Same caveat as `recordTable.ts`: this is detection
 * over prose, and anything it is unsure about falls through to plain text.
 */

/**
 * `http(s)` URLs only — an `mailto:`/`tel:` or a scheme-less `api.uat…` is
 * left as text, since guessing a scheme is how a link ends up pointing
 * somewhere the server never named.
 *
 * The class stops at whitespace and at the two inline markers Echo bodies use
 * (`*bold*`, `` `mono` ``) so a link that ends a bold run does not swallow the
 * closing marker, and at `<`/`>` so nothing that looks like markup gets in.
 */
export const URL_PATTERN = /https?:\/\/[^\s*`<>]+/;

/** Global clone, for `split`/`match`. Kept separate: a `g` regex carries
 *  `lastIndex` state, so sharing one instance across calls is a bug. */
export function urlSplitPattern(): RegExp {
  return new RegExp(`(${URL_PATTERN.source})`, "g");
}

/** Punctuation that belongs to the sentence, not to the URL: `…link.` and
 *  `(see …/pl?id=x)`. Stripped off the anchor and rendered as the text it is. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/**
 * True when the server cut the body mid-URL.
 *
 * Echo truncates a long list body to a character budget and appends an
 * ellipsis, which can land inside the last record's link (`…x-gl-link-id=88
 * 51c9f3-2cd...`). Linking that would hand the merchant a URL that 404s, so a
 * truncated link is deliberately left as unlinked, uncopyable text — the
 * honest rendering of a value the server did not finish sending.
 */
export function isTruncatedUrl(raw: string): boolean {
  return /(\.{3}|…)$/.test(raw);
}

export type SplitUrl = {
  /** The URL itself, trailing sentence punctuation removed. */
  url: string;
  /** That punctuation, to render after the anchor. Empty in the common case. */
  trailing: string;
};

/** Splits a matched token into the anchor's href and the punctuation that
 *  followed it. Returns null when the token is not a usable URL. */
export function splitUrlToken(raw: string): SplitUrl | null {
  if (isTruncatedUrl(raw)) return null;
  const trailing = TRAILING_PUNCTUATION.exec(raw)?.[0] ?? "";
  const url = trailing ? raw.slice(0, -trailing.length) : raw;
  // A bare scheme (`https://`) is a match but not a link.
  return /https?:\/\/[^/\s]/.test(url) ? { url, trailing } : null;
}

/** True when a whole string is one usable URL and nothing else — what a
 *  record table's `Payment Link` cell holds. */
export function asWholeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!new RegExp(`^${URL_PATTERN.source}$`).test(trimmed)) return null;
  return splitUrlToken(trimmed)?.url ?? null;
}

/**
 * A short display form of a URL: the host plus the tail of what follows it,
 * e.g. `api.uat.pygcl.com/…4b0106` for a payment link.
 *
 * Cut on the host boundary rather than at a fixed character count
 * (`truncateMiddle`), because the host is the part a merchant recognises and
 * its length differs per environment — a blind mid-string cut lands inside
 * `payglocal.in` on dev and after `/gl` on uat. The tail keeps enough of the
 * link id to tell two rows apart. Display only: the href and the clipboard
 * always carry the whole URL.
 */
export function shortUrlLabel(url: string, tail = 6): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const rest = `${parsed.pathname}${parsed.search}`.replace(/^\/+/, "");
  if (!rest) return parsed.host;
  // Nothing gained by eliding something already this short.
  return rest.length <= tail + 2
    ? `${parsed.host}/${rest}`
    : `${parsed.host}/…${rest.slice(-tail)}`;
}
