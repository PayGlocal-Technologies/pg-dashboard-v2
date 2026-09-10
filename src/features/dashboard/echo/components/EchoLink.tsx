"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconButton, Link } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

type Props = {
  /** The href, and what lands on the clipboard — always the full URL, even
   *  when `label` shortens what is on screen. */
  url: string;
  /** Display text, for where the full URL does not fit (a table cell).
   *  Defaults to the URL itself. */
  label?: string;
  /**
   * Whether to offer the copy button. False for a link the merchant can no
   * longer act on — an expired or cancelled payment link — where a copy
   * affordance only invites sharing something that will not collect.
   */
  copyable?: boolean;
  /** Accessible name / tooltip for the copy button. */
  copyLabel?: string;
  /** Toast text on a successful copy. */
  copyToast?: string;
  className?: string;
  /**
   * "prose" (default): sits inside a paragraph, and wraps mid-URL rather than
   * pushing the 420px side panel sideways.
   * "cell": sits in a record table cell — one line, elided by `label`.
   */
  variant?: "prose" | "cell";
};

/**
 * A URL in an Echo answer: a real link, with a copy button beside it.
 *
 * Echo hands over payment links as bare text (see `links.ts`), and a merchant
 * who asks Echo for a link wants the same two things the Payment Links table
 * gives them — open it, or copy it to send on. This is that pair, sized to sit
 * inside a chat bubble.
 *
 * flux's `Link` already sets `target="_blank"` for an `http` href; `rel` is
 * passed explicitly because its default is `noreferrer` alone and the href is
 * whatever host the server named.
 */
export function EchoLink({
  url,
  label,
  copyable = true,
  copyLabel = "Copy link",
  copyToast = "Link copied",
  className,
  variant = "prose",
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        toast.success(copyToast);
        setTimeout(() => setCopied(false), 1500);
      },
      () => toast.error("Could not copy")
    );
  };

  const isCell = variant === "cell";

  return (
    <span
      className={cn(
        isCell
          ? "inline-flex max-w-full items-center gap-0.5 whitespace-nowrap"
          : // Plain inline, not a flex row: in prose the link has to be able to
            // break across lines with the sentence around it.
            "inline",
        className
      )}
    >
      <Link
        href={url}
        rel="noopener noreferrer"
        size="sm"
        // Native title only where the label hides characters, matching
        // CopyableText — an ordinary link does not need a tooltip.
        title={label && label !== url ? url : undefined}
        className={cn(
          "font-medium underline decoration-primary/40 underline-offset-2 hover:decoration-primary",
          // Overrides flux Link's own inline-flex, which cannot wrap.
          isCell ? "min-w-0 truncate" : "inline break-all"
        )}
      >
        {label ?? url}
      </Link>
      {copyable ? (
        <IconButton
          type="button"
          variant="ghost"
          size="xs"
          aria-label={copied ? "Copied to clipboard" : copyLabel}
          title={copied ? "Copied!" : copyLabel}
          // The pair often sits inside a clickable row; copying a link is
          // never also a request to open the record it belongs to.
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          className={cn(
            "size-5 min-w-5 rounded-md text-muted-foreground hover:text-foreground",
            // align-text-bottom keeps the button on the sentence's baseline
            // instead of riding above it.
            isCell ? "shrink-0" : "ml-0.5 align-text-bottom"
          )}
        >
          <Icon name={copied ? "check" : "copy"} size={12} />
        </IconButton>
      ) : null}
    </span>
  );
}
