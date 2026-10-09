"use client";

import type { ReactNode } from "react";
import { Shimmer, formatTimestamp } from "@/components/ui";
import { MandateStatusBadge } from "@/features/dashboard/manage-mandates/columns";
import { LinkedId } from "@/components/common/LinkedId";
import {
  formatCompactDate,
  formatMandateAmount,
} from "@/features/dashboard/manage-mandates/helpers";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

export function MandateCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-4 w-36" />
        <Shimmer className="h-7 w-7" rounded="md" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Shimmer className="h-5 w-24" />
        <Shimmer className="h-5 w-16" rounded="full" />
      </div>
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
 * A mandate as a card below `lg`, the arrangement Payment Button's cards use:
 * the mandate id with the menu, amount against status, then the schedule as
 * labelled pairs. SI ID and Initiate GID open the same views the table's
 * cells do.
 */
export function MandateCard({
  row,
  actions,
  onOpenSiTransactions,
  onOpenInitiateTransaction,
}: {
  row: Mandate;
  actions: ReactNode;
  onOpenSiTransactions: (row: Mandate) => void;
  onOpenInitiateTransaction: (row: Mandate) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="truncate font-mono text-[13px] font-semibold text-foreground">
          {row.maskedMandateId || "—"}
        </span>
        {actions}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[15px] font-semibold tabular-nums text-foreground">
          {formatMandateAmount(row)}
        </span>
        <MandateStatusBadge status={row.mandateStatus} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Pair label="SI ID">
          <LinkedId
            id={row.siId}
            label="SI ID"
            truncate={false}
            onOpen={() => onOpenSiTransactions(row)}
          />
        </Pair>
        <Pair label="Initiate GID">
          <LinkedId
            id={row.initiateGid}
            label="Transaction ID"
            onOpen={() => onOpenInitiateTransaction(row)}
          />
        </Pair>
        <Pair label="SI frequency">{row.frequency || "—"}</Pair>
        <Pair label="Payments processed">
          {row.numberOfPaymentsProcessed || "0"} of {row.numberOfPayments || "—"}
        </Pair>
        <Pair label="Start date">{formatCompactDate(row.startDate)}</Pair>
        <Pair label="Creation time">{formatTimestamp(row.mandateCreationTime)}</Pair>
        <Pair label="Expiry time">{formatTimestamp(row.mandateExpiryTime)}</Pair>
      </dl>
    </div>
  );
}
