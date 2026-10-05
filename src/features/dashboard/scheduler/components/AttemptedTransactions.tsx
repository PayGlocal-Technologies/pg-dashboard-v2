"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";
import { truncateId } from "@/features/dashboard/pa-transactions/components/TransactionId";
import { SUCCESSFUL_ATTEMPT_STATUS } from "@/features/dashboard/scheduler/constants";
import type { SiCompletionData } from "@/features/dashboard/scheduler/types";

/**
 * Every attempt at a scheduled debit, as pg-dashboard draws them: one chip per
 * transaction, green when it went through (SENT_FOR_CAPTURE) and red
 * otherwise, with its GID, status and whether it was manual on hover. A chip
 * opens that transaction.
 */
export function AttemptedTransactions({
  attempts,
  onOpen,
}: {
  attempts: SiCompletionData[];
  onOpen: (gid: string) => void;
}) {
  if (!attempts?.length) return <span className="text-[13px] text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {attempts.map((attempt) => {
        const succeeded = attempt.txnStatus === SUCCESSFUL_ATTEMPT_STATUS;
        return (
          <Tooltip key={attempt.gid}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Open attempt ${attempt.gid}`}
                onClick={() => onOpen(attempt.gid)}
                className={cn(
                  "h-auto min-h-0 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium",
                  succeeded
                    ? "border-emerald-600/40 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700"
                    : "border-red-500/40 bg-red-500/5 text-red-600 hover:bg-red-500/10 hover:text-red-600"
                )}
              >
                {truncateId(attempt.gid)}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="space-y-0.5">
                <p className="font-mono">{attempt.gid}</p>
                <p>Status: {attempt.txnStatus.replaceAll("_", " ").toLowerCase()}</p>
                <p>Manual: {attempt.manuallyTriggered ? "Yes" : "No"}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
