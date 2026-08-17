"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { utrPendingReason } from "@/features/dashboard/settlement-reports/settlementCopy";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

interface SettlementUtrCellProps {
  row: SettlementRow;
}

/** Reuses the DataTable row's own `group` class (every `<tr>` already carries
 * one for the rowAction slot) so the copy icon only fades in on hover, same
 * pattern as the transactions table's TransactionId cell. */
export function SettlementUtrCell({ row }: SettlementUtrCellProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!row.utrNumber) return;
    try {
      await navigator.clipboard.writeText(row.utrNumber);
      setCopied(true);
      toast.success("UTR copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied, fail silently, non-critical affordance.
    }
  }

  if (!row.utrNumber) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help items-center gap-1 whitespace-nowrap text-[13px] text-muted-foreground/60">
              Not generated yet
              <Icon name="info" size={11} className="shrink-0" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-60 text-xs">
            {utrPendingReason(row)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="whitespace-nowrap font-mono text-[13px] text-muted-foreground">
        {row.utrNumber}
      </span>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCopy}
              aria-label="Copy UTR"
              className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Icon name={copied ? "check" : "copy"} size={11} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {copied ? "Copied" : "Copy UTR"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
