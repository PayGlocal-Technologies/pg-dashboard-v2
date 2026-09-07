import { Fragment, type ReactNode } from "react";

/**
 * The four inline markers §4 of the rendering guide allows in body copy:
 * `\n` line breaks, `*bold*`, `` `monospace` ``, and emoji (which need no
 * handling — they are just characters).
 *
 * Note this is WhatsApp's single-asterisk bold, not markdown's double. Nothing
 * else is interpreted: the body is server copy, not merchant input, but it is
 * still rendered as text nodes rather than parsed as markup.
 */
const TOKEN = /(\*[^*\n]+\*|`[^`\n]+`)/g;

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
    return <Fragment key={index}>{part}</Fragment>;
  });
}
