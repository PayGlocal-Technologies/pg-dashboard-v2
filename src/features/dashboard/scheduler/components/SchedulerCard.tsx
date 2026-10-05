"use client";

import type { ReactNode } from "react";
import { Shimmer, formatTimestamp } from "@/components/ui";
import { LinkedId } from "@/components/common/LinkedId";
import { RetryButton, SchedulerStatusBadge } from "@/features/dashboard/scheduler/columns";
import { AttemptedTransactions } from "@/features/dashboard/scheduler/components/AttemptedTransactions";
import { formatSchedulerAmount } from "@/features/dashboard/scheduler/helpers";
import type { SchedulerTxn, SchedulerView } from "@/features/dashboard/scheduler/types";

export function SchedulerCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-5 w-20" rounded="full" />
      </div>
      <Shimmer className="mt-2.5 h-5 w-24" />
      <Shimmer className="mt-3 h-3 w-48" />
    </div>
  );
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[12.5px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

/**
 * A scheduled debit as a card below `lg`, the arrangement the Manage Mandates
 * and Payment Button cards use: the SI with its status, the amount, then the
 * view's own fields as labelled pairs. Executed cards carry the attempts and
 * Retry; projected ones only what is due and when.
 */
export function SchedulerCard({
  row,
  view,
  isRetrying,
  onRetry,
  onOpenSiTransactions,
  onOpenTransaction,
}: {
  row: SchedulerTxn;
  view: SchedulerView;
  isRetrying: boolean;
  onRetry: (row: SchedulerTxn) => void;
  onOpenSiTransactions: (row: SchedulerTxn) => void;
  onOpenTransaction: (gid: string, row: SchedulerTxn) => void;
}) {
  const isExecuted = view === "executed";
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <LinkedId
          id={row.siId}
          label="SI ID"
          truncate={false}
          onOpen={() => onOpenSiTransactions(row)}
        />
        {isExecuted && <SchedulerStatusBadge status={row.status} />}
      </div>
      <p className="mt-2 text-[15px] font-semibold tabular-nums text-foreground">
        {formatSchedulerAmount(row.totalAmount, row.txnCurrency)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Pair label="Scheduled time">{formatTimestamp(row.scheduledTime)}</Pair>
        {isExecuted && (
          <>
            <Pair label="Execution time">{formatTimestamp(row.executionTime)}</Pair>
            <Pair label="Creation time">{formatTimestamp(row.creationTime)}</Pair>
            <Pair label="Success GID">
              <LinkedId
                id={row.successGid}
                label="Transaction ID"
                onOpen={() => onOpenTransaction(row.successGid, row)}
              />
            </Pair>
          </>
        )}
      </dl>
      {isExecuted && (
        <>
          <div className="mt-3">
            <p className="text-[11.5px] text-muted-foreground">Attempted transactions</p>
            <div className="mt-1">
              <AttemptedTransactions
                attempts={row.siCompletionDataList}
                onOpen={(gid) => onOpenTransaction(gid, row)}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <RetryButton row={row} isRetrying={isRetrying} onRetry={onRetry} />
          </div>
        </>
      )}
    </div>
  );
}
