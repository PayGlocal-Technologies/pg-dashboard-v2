"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";

interface TransactionIdProps {
  id: string;
}

/** "gl_o-a1f114aebb83002dcmf0L2hX2" -> "gl_o....2hX2". Display only, the
 * full id is still what gets copied below. */
export function truncateId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 4)}....${id.slice(-4)}`;
}

// The copy icon only fades in on hover, reuses the DataTable row's own
// `group` class (every `<tr>` already carries it for the rowAction slot),
// not a locally-declared one.
export function TransactionId({ id }: TransactionIdProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success("Transaction ID copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied, fail silently, non-critical affordance.
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span title={id} className="whitespace-nowrap text-[12px] font-medium text-foreground">
        {truncateId(id)}
      </span>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCopy}
              aria-label="Copy transaction ID"
              className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Icon name={copied ? "check" : "copy"} size={11} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {copied ? "Copied" : "Copy transaction ID"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
