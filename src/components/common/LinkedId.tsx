"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { truncateId } from "@/features/dashboard/pa-transactions/components/TransactionId";

/**
 * An id that opens something (an SI's transactions, a payment) and can be
 * copied: PA's TransactionId cell, with the value as a link. The copy icon
 * fades in on row hover via the DataTable row's own `group`.
 */
export function LinkedId({
  id,
  label,
  onOpen,
  truncate = true,
  className,
}: {
  id: string;
  /** What the id is, for the copy toast and the buttons' names. */
  label: string;
  onOpen: () => void;
  /** Long ids (GIDs) shortened to their ends; short ones read better whole. */
  truncate?: boolean;
  /** Classes for the id text, e.g. to recolour it inside a table column. */
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!id) return <span className="text-[13px] text-muted-foreground">—</span>;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied; a non-critical affordance, so fail quietly.
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="link"
        title={id}
        aria-label={`Open ${label} ${id}`}
        onClick={onOpen}
        className={cn(
          "h-auto min-h-0 p-0 tabular-nums text-[12.5px] font-medium whitespace-nowrap",
          className
        )}
      >
        {truncate ? truncateId(id) : id}
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCopy}
            aria-label={`Copy ${label}`}
            className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Icon name={copied ? "check" : "copy"} size={11} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {copied ? "Copied" : `Copy ${label}`}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
