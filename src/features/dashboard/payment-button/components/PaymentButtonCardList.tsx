"use client";

import type { ReactNode } from "react";
import { Shimmer, formatTimestamp } from "@/components/ui";
import {
  PaymentButtonAmount,
  PaymentButtonStatusBadge,
} from "@/features/dashboard/payment-button/columns";
import { formatButtonAmount } from "@/features/dashboard/payment-button/helpers";
import type { PaymentButton } from "@/features/dashboard/payment-button/types";

export function PaymentButtonCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-7 w-7" rounded="md" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Shimmer className="h-5 w-28" />
        <Shimmer className="h-5 w-16" rounded="full" />
      </div>
      <Shimmer className="mt-3 h-3 w-44" />
    </div>
  );
}

/**
 * The same fields the table shows, in the same order, stacked as a card — the
 * arrangement ReceiptCard uses. Button ID leads with the overflow menu closing
 * the row (always visible: there is no hover on touch), the amount and status
 * balance each other beneath it, then the rest as labelled pairs.
 */
export function PaymentButtonCard({
  row,
  actions,
  onOpen,
}: {
  row: PaymentButton;
  actions: ReactNode;
  onOpen: (row: PaymentButton) => void;
}) {
  return (
    // The whole card opens the details page, the touch twin of the table's row
    // click; keyboard-reachable as SkuCard is. The action buttons inside stop
    // the click from reaching it.
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${row.buttonId}`}
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(row);
        }
      }}
      className="cursor-pointer rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[12.5px] font-medium break-all text-foreground">
          {row.buttonId}
        </span>
        <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {actions}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <PaymentButtonAmount row={row} size="card" />
        <PaymentButtonStatusBadge status={row.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Successful payments</p>
          <p className="truncate text-[12.5px] tabular-nums text-foreground">
            {row.successfulPayments ?? "—"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Revenue</p>
          <p className="truncate text-[12.5px] tabular-nums text-foreground">
            {row.revenue == null ? "—" : formatButtonAmount(row.revenue, row.currency)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Created at</p>
          <p className="truncate text-[12.5px] text-foreground">{formatTimestamp(row.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
