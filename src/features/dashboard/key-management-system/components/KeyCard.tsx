"use client";

import type { ReactNode } from "react";
import { Shimmer, formatTimestamp } from "@/components/ui";
import { KeyStatusBadge } from "@/features/dashboard/key-management-system/columns";
import type { MerchantKey } from "@/features/dashboard/key-management-system/types";

export function KeyCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-4 w-48" />
        <Shimmer className="h-5 w-16" rounded="full" />
      </div>
      <Shimmer className="mt-3 h-3 w-40" />
    </div>
  );
}

/** A key as a card below `lg`: its id and status, its dates and type, then its action. */
export function KeyCard({ row, action }: { row: MerchantKey; action: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-mono text-[12.5px] font-medium break-all text-foreground">
          {row.kid || "—"}
        </p>
        <KeyStatusBadge status={row.keyStatus} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <div>
          <dt className="text-[11.5px] text-muted-foreground">Date of generation</dt>
          <dd className="mt-0.5 text-[12.5px] font-medium text-foreground">
            {formatTimestamp(row.creationDate)}
          </dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-muted-foreground">Date of expiry</dt>
          <dd className="mt-0.5 text-[12.5px] font-medium text-foreground">
            {formatTimestamp(row.expiryDate)}
          </dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-muted-foreground">Type</dt>
          <dd className="mt-0.5 text-[12.5px] font-medium text-foreground">
            {row.keyType?.trim() || "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex justify-end">{action}</div>
    </div>
  );
}
