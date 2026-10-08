"use client";

import { Button, type Column, StatusBadge, formatTimestamp } from "@/components/ui";
import { Icon } from "@/components/icon";
import { LinkedId } from "@/components/common/LinkedId";
import { AttemptedTransactions } from "@/features/dashboard/scheduler/components/AttemptedTransactions";
import {
  formatSchedulerAmount,
  getSchedulerStatusMeta,
} from "@/features/dashboard/scheduler/helpers";
import type { SchedulerTxn } from "@/features/dashboard/scheduler/types";

const TEXT = "text-[13px] text-foreground whitespace-nowrap";

export function SchedulerStatusBadge({ status }: { status: string }) {
  const { label, variant, trailIcon } = getSchedulerStatusMeta(status);
  return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
}

export function RetryButton({
  row,
  isRetrying,
  onRetry,
}: {
  row: SchedulerTxn;
  isRetrying: boolean;
  onRetry: (row: SchedulerTxn) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!row.enabledManualExecution || isRetrying}
      isLoading={isRetrying}
      leftIcon={<Icon name="refresh" className="h-3.5 w-3.5" />}
      onClick={() => onRetry(row)}
      className="h-auto min-h-0 rounded-md px-2.5 py-1 text-[12px] whitespace-nowrap"
    >
      Retry
    </Button>
  );
}

function amountCell(row: SchedulerTxn) {
  return (
    <span className="text-[13px] font-semibold tabular-nums whitespace-nowrap text-foreground">
      {formatSchedulerAmount(row.totalAmount, row.txnCurrency)}
    </span>
  );
}

function timeCell(value: string) {
  return <span className={TEXT}>{formatTimestamp(value)}</span>;
}

interface ColumnHandlers {
  onOpenSiTransactions: (row: SchedulerTxn) => void;
  onOpenTransaction: (gid: string, row: SchedulerTxn) => void;
}

/** pg-dashboard's Executed columns, in its order, then the pinned Actions column. */
export function buildExecutedColumns({
  onOpenSiTransactions,
  onOpenTransaction,
  onRetry,
  retryingIds,
}: ColumnHandlers & {
  onRetry: (row: SchedulerTxn) => void;
  retryingIds: string[];
}): Column<SchedulerTxn>[] {
  return [
    {
      key: "siId",
      header: "SI ID",
      minWidth: 150,
      render: (row) => (
        <LinkedId
          id={row.siId}
          label="SI ID"
          truncate={false}
          onOpen={() => onOpenSiTransactions(row)}
        />
      ),
    },
    {
      key: "successGid",
      header: "Success GID",
      minWidth: 160,
      render: (row) => (
        <LinkedId
          id={row.successGid}
          label="Transaction ID"
          onOpen={() => onOpenTransaction(row.successGid, row)}
        />
      ),
    },
    { key: "totalAmount", header: "Amount", align: "right", minWidth: 130, render: amountCell },
    {
      key: "status",
      header: "Status",
      minWidth: 150,
      render: (row) => <SchedulerStatusBadge status={row.status} />,
    },
    {
      key: "scheduledTime",
      header: "Scheduled time",
      minWidth: 170,
      render: (row) => timeCell(row.scheduledTime),
    },
    {
      key: "creationTime",
      header: "Creation time",
      minWidth: 170,
      render: (row) => timeCell(row.creationTime),
    },
    {
      key: "executionTime",
      header: "Execution time",
      minWidth: 170,
      render: (row) => timeCell(row.executionTime),
    },
    {
      key: "siCompletionDataList",
      header: "Attempted transactions",
      minWidth: 220,
      render: (row) => (
        <AttemptedTransactions
          attempts={row.siCompletionDataList}
          onOpen={(gid) => onOpenTransaction(gid, row)}
        />
      ),
    },
    {
      // Pinned to the right edge with a left rule, as on Manage Mandates, so
      // Retry is in reach however far the grid is scrolled. `scheduler-actions`
      // marks the cells for the table's opaque sticky fills; the rule and the
      // shadow are box-shadows because a border on a sticky cell stays behind
      // with the collapsed table borders.
      key: "action",
      header: "Actions",
      minWidth: 100,
      cellClassName:
        "scheduler-actions sticky right-0 z-[2] shadow-[inset_1px_0_0_var(--border),-6px_0_8px_-6px_rgba(0,0,0,0.12)]",
      render: (row) => (
        <RetryButton
          row={row}
          isRetrying={retryingIds.includes(row.schedulerId)}
          onRetry={onRetry}
        />
      ),
    },
  ];
}

/** pg-dashboard's Projected columns: what is due, and when. */
export function buildProjectedColumns({
  onOpenSiTransactions,
}: Pick<ColumnHandlers, "onOpenSiTransactions">): Column<SchedulerTxn>[] {
  return [
    {
      key: "siId",
      header: "SI ID",
      minWidth: 150,
      render: (row) => (
        <LinkedId
          id={row.siId}
          label="SI ID"
          truncate={false}
          onOpen={() => onOpenSiTransactions(row)}
        />
      ),
    },
    { key: "totalAmount", header: "Amount", align: "right", minWidth: 130, render: amountCell },
    {
      key: "scheduledTime",
      header: "Scheduled time",
      minWidth: 170,
      render: (row) => timeCell(row.scheduledTime),
    },
  ];
}
