"use client";

import { useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface CopyableTextProps {
  value: string;
  className?: string;
}

export function CopyableText({ value, className }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="font-mono text-[13px] text-foreground whitespace-nowrap">{value}</span>
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
