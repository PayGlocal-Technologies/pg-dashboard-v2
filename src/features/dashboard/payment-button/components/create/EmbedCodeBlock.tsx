"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  copyEmbedCode,
  embedLinesToText,
  type EmbedLine,
  type EmbedToken,
} from "@/features/dashboard/payment-button/helpers";

/**
 * Token colours: tags rose, attribute values green, everything else plain.
 * Palette utilities rather than theme tokens because this is syntax colouring,
 * which the theme has no vocabulary for; each carries its dark-mode pair.
 */
const TOKEN_CLASS: Record<EmbedToken["kind"], string> = {
  tag: "text-rose-600 dark:text-rose-400",
  attr: "text-foreground",
  value: "text-emerald-700 dark:text-emerald-400",
  text: "text-foreground",
};

/**
 * The snippet panel both code dialogs share: a caption with Copy code on a
 * tinted header band, then the lines, numbered and coloured. What Copy puts on
 * the clipboard is embedLinesToText of the very lines drawn here.
 */
export function EmbedCodeBlock({ caption, lines }: { caption: string; lines: EmbedLine[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {caption}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
          onClick={() => void copyEmbedCode(embedLinesToText(lines))}
        >
          Copy code
        </Button>
      </div>

      {/* Numbered lines as a grid of <p>s rather than a <pre>, so the number
          gutter never ends up in a text selection the merchant copies by hand. */}
      <div className="overflow-x-auto bg-card px-4 py-4 font-mono text-[13px] leading-7">
        {lines.map((line, index) => (
          <div key={index} className="flex whitespace-pre">
            <span
              aria-hidden
              className="w-8 shrink-0 select-none pr-4 text-right text-muted-foreground/70"
            >
              {index + 1}
            </span>
            <p className={cn(line.indent > 0 && "pl-5")}>
              {line.tokens.map((token, i) => (
                <span key={i} className={TOKEN_CLASS[token.kind]}>
                  {token.text}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
