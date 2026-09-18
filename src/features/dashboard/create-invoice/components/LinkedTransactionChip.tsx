"use client";

import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/utils/format";
import type { LinkedTxnRecord } from "@/features/dashboard/create-invoice/hooks";

/**
 * Header chip shown when the invoice is being raised against a transaction
 * (the ?gid= entry point from the transactions table).
 *
 * The gid is shown as its last six characters only, matching production — the
 * full reference is long, and the tail is what merchants recognise.
 */
export function LinkedTransactionChip({
  gid,
  record,
}: {
  gid: string;
  record: LinkedTxnRecord | undefined;
}) {
  // creationTime arrives as epoch milliseconds in a string.
  const created = record?.creationTime ? Number(record.creationTime) : NaN;

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-primary">
        <Icon name="link" className="h-3 w-3" />
      </span>

      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        Linked to
      </span>
      <span className="font-mono text-[12px] font-medium text-foreground">****{gid.slice(-6)}</span>

      {record?.partnerCustomerFullName && (
        <span className="hidden text-[12px] text-foreground lg:inline">
          {record.partnerCustomerFullName}
        </span>
      )}

      {record?.amount && (
        <span className="hidden text-[12px] font-semibold text-success lg:inline">
          {record.currency} {record.amount}
        </span>
      )}

      {Number.isFinite(created) && (
        <span className="hidden text-[12px] text-muted-foreground lg:inline">
          {formatDate(new Date(created), { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      )}
    </div>
  );
}
