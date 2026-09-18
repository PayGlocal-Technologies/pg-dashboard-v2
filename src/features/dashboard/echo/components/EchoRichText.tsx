import { Fragment, type ReactNode } from "react";
import { EchoLink } from "@/features/dashboard/echo/components/EchoLink";
import { URL_PATTERN, splitUrlToken } from "@/features/dashboard/echo/links";

/**
 * The four inline markers §4 of the rendering guide allows in body copy:
 * `\n` line breaks, `*bold*`, `` `monospace` ``, and emoji (which need no
 * handling — they are just characters).
 *
 * Note this is WhatsApp's single-asterisk bold, not markdown's double. Nothing
 * else is interpreted: the body is server copy, not merchant input, but it is
 * still rendered as text nodes rather than parsed as markup.
 *
 * URLs are the one addition. They carry no marker at all — a payment link
 * arrives as a bare `https://…` in the sentence, because the same body is
 * written for WhatsApp, where the client linkifies it. Here it has to be
 * recognised (see `links.ts`) so the merchant gets a link to open rather than
 * a line to select by hand.
 */
const TOKEN = new RegExp(`(\\*[^*\\n]+\\*|\`[^\`\\n]+\`|${URL_PATTERN.source})`, "g");

export function EchoRichText({ text }: { text: string }) {
  if (!text) return null;

  return (
    <>
      {text.split("\n").map((line, lineIndex, lines) => (
        <Fragment key={lineIndex}>
          {renderLine(line)}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </>
  );
}

function renderLine(line: string): ReactNode[] {
  return line.split(TOKEN).map((part, index) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(1, -1)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^https?:\/\//.test(part)) {
      const split = splitUrlToken(part);
      // A URL the server cut mid-string is left as the text it is, rather
      // than linked to an address that would 404.
      if (!split) return <Fragment key={index}>{part}</Fragment>;
      return (
        <Fragment key={index}>
          <EchoLink
            url={split.url}
            copyLabel="Copy link"
            copyToast="Link copied"
            className="mr-0.5"
          />
          {split.trailing}
        </Fragment>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
