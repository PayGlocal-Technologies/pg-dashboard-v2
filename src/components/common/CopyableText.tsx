"use client";

import { useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface CopyableTextProps {
  value: string;
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
}

export function CopyableText({ value, className, variant = "inline", valueClassName }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className={cn("font-mono text-[13px] text-foreground whitespace-nowrap", valueClassName)}>
        {value}
      </span>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={copied ? "Copied to clipboard" : `Copy ${value}`}
              onClick={handleCopy}
              className="h-auto min-h-0 w-auto shrink-0 p-1 text-muted-foreground hover:text-foreground"
            >
              <Icon name={copied ? "check" : "copy"} className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            className="rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]"
            sideOffset={4}
          >
            {copied ? "Copied!" : "Copy"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
