"use client";

import { useState, type ReactNode } from "react";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface CopyableValueProps {
  label: string;
  value: string;
  /** Text actually written to the clipboard, if different from the displayed `value` (e.g. a truncated display). */
  copyValue?: string;
  tooltip?: string;
  copyable?: boolean;
  valueClassName?: string;
  /** Optional trailing action next to the value, e.g. a "View all" button. */
  action?: ReactNode;
  /** "row" (default) — label-left/value-right, for a vertical list. "stack" — label-above-value, centered, for a grid cell. */
  layout?: "row" | "stack";
  className?: string;
}

// Label-left / value-right row — matches BreakupRow's rhythm exactly so
// "Details" and "Amount Breakdown" read as one connected list rather than
// two differently-styled widgets.
export function CopyableValue({
  label,
  value,
  copyValue,
  tooltip,
  copyable = true,
  valueClassName,
  action,
  layout = "row",
  className,
}: CopyableValueProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — fail silently, this is a non-critical affordance.
    }
  }

  const labelBlock = (
    <div className="flex items-center gap-1">
      <p className={cn("text-muted-foreground", layout === "stack" ? "text-xs" : "text-sm")}>{label}</p>
      {tooltip && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-4 w-4 min-h-0 min-w-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
                aria-label={`About ${label}`}
              >
                <Icon name="info" size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  const valueBlock = (
    <div className="flex min-w-0 items-center gap-1.5">
      <p className={cn("truncate font-mono text-sm font-semibold text-foreground", valueClassName)}>
        {value}
      </p>
      {copyable && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleCopy}
          className="h-6 w-6 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
          aria-label={copied ? "Copied" : `Copy ${label}`}
        >
          <Icon name={copied ? "check" : "copy"} size={12} />
        </Button>
      )}
      {action}
    </div>
  );

  if (layout === "stack") {
    return (
      <div className={cn("flex flex-col justify-center gap-1.5 p-4", className)}>
        {labelBlock}
        {valueBlock}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5", className)}>
      {labelBlock}
      {valueBlock}
    </div>
  );
}
