"use client";

import { useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface CopyableTextProps {
  value: string;
  /**
   * What to show in place of `value` — an elided form of it, typically from
   * `truncateMiddle`. Display only: the clipboard, the tooltip and the
   * accessible name all still carry the full `value`, so shortening what's on
   * screen never shortens what the user actually walks away with.
   * "inline" variant only; defaults to `value`.
   */
  displayValue?: string;
  className?: string;
  /**
   * "inline" (default): value always visible, its own copy icon+button always
   * shown alongside it.
   * "cell": for fixed-width table cells — the value truncates with an
   * ellipsis to make room, the copy icon only reveals on hover/focus, and the
   * whole element (not just the icon) is the click target.
   */
  variant?: "inline" | "cell";
  /** "inline" variant only, overrides the value span's default
   *  text-foreground, e.g. text-muted-foreground for a secondary/subordinate
   *  placement (see TransactionDetailsDrawer's header). */
  valueClassName?: string;
  /**
   * "inline" variant only: keeps the copy button invisible until the row (or
   * whatever `group` ancestor holds it) is hovered, or the button itself is
   * focused. For table cells, where a permanently visible icon on every row
   * would be noise. Opacity only — the button keeps its space, so revealing it
   * never shifts the row.
   *
   * Pointer-coarse devices have no hover to give, so it stays visible there.
   */
  revealOnHover?: boolean;
}

export function CopyableText({
  value,
  displayValue,
  className,
  variant = "inline",
  valueClassName,
  revealOnHover = false,
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  // Takes the event so it can stop it: this control is often rendered inside a
  // clickable row (see RowClick), and copying a value is never also a request
  // to open the record it belongs to.
  const handleCopy = async (e?: { stopPropagation: () => void }) => {
    e?.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (variant === "cell") {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              onClick={handleCopy}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCopy();
                }
              }}
              aria-label={copied ? "Copied to clipboard" : `Copy ${value}`}
              className={cn(
                "group flex min-w-0 items-center gap-1 rounded-md cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                className
              )}
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-primary group-hover:underline">
                {value}
              </span>
              <Icon
                name={copied ? "check" : "copy"}
                className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent
            className="rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]"
            sideOffset={4}
          >
            {copied ? "Copied!" : "Copy"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const shown = displayValue ?? value;
  const isElided = shown !== value;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        // Native title only where characters are actually hidden, so the full
        // value stays reachable on hover without every ordinary field growing
        // a tooltip it doesn't need.
        title={isElided ? value : undefined}
        className={cn("font-mono text-[13px] text-foreground whitespace-nowrap", valueClassName)}
      >
        {shown}
      </span>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={copied ? "Copied to clipboard" : `Copy ${value}`}
              onClick={handleCopy}
              className={cn(
                "h-auto min-h-0 w-auto shrink-0 p-1 text-muted-foreground hover:text-foreground",
                revealOnHover && [
                  "opacity-0 transition-opacity",
                  "group-hover:opacity-100 focus-visible:opacity-100",
                  // No hover to wait for on a touch device, so it simply shows.
                  "[@media(hover:none)]:opacity-100",
                ]
              )}
            >
              <Icon name={copied ? "check" : "copy"} className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            className="rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]"
            sideOffset={4}
          >
            {/* The elided case names what will land on the clipboard, since
                the row itself no longer shows it in full. */}
            {copied ? "Copied!" : isElided ? `Copy ${value}` : "Copy"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
