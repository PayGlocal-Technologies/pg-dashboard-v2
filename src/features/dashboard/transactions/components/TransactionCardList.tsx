"use client";

import { Button, EmptyState, IconButton, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import { getStatusMeta, handleViewInvoice, isWaitingForInvoice } from "@/features/dashboard/transactions/mcaColumns";
import { cn } from "@/lib/utils";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

function TransactionCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Shimmer className="h-7 w-7" rounded="full" />
        <Shimmer className="h-5 w-16" />
        <Shimmer className="ml-auto h-5 w-24" rounded="full" />
      </div>
      <Shimmer className="mt-1.5 h-3 w-32" />
      <Shimmer className="mt-2.5 h-3 w-28" />
    </div>
  );
}

// Same row data and action as buildMcaColumns' amount/status/action columns
// and RowClick, just laid out as a stacked card instead of table cells: the
// whole card opens the drawer (see TransactionCardList's own role="button"
// treatment below), while the View/Upload invoice action stops propagation
// so it fires its own handler instead of also opening the drawer.
function TransactionCard({
  row,
  onOpenDetails,
}: {
  row: McaTransaction;
  onOpenDetails: (row: McaTransaction) => void;
}) {
  const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
  const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, isFrmPending);
  const amount = parseFloat(row.amount ?? "0");
  const currency = row.currency ?? "USD";
  const counterpartyName = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? "-";
  const showUpload = isWaitingForInvoice(row);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails(row);
        }
      }}
      className="flex cursor-pointer flex-col rounded-xl border border-border bg-card px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      {/* Primary row: flag kept compact (h-7, not the h-8+ it might otherwise
          get) so it doesn't compete with the amount, gap-2 (not 2.5) so flag,
          amount, and chip read as one tight cluster. The amount is bumped to
          text-xl (from text-lg) to make it the strongest element on the
          card; the chip stays StatusBadge's own compact size, secondary by
          construction next to that larger figure. */}
      <div className="flex items-center gap-2">
        <CountryFlagAvatar
          iso2={row.partnerCustomerCountry ?? ""}
          countryName={row.partnerCustomerCountry ?? "Remitter country"}
          className="h-7 w-7 shrink-0"
        />
        <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatCurrency(amount, currency, "en-US")}
        </span>
        <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />

        {/* View invoice stays here, icon-only, independent of the card's own
            click (e.stopPropagation()). Upload invoice moves to its own
            bottom-right row below instead of this slot: unlike View, it's a
            labelled action, and a label here would fight the amount for
            room on this row. */}
        {!showUpload && (
          <div className="ml-auto shrink-0">
            <IconButton
              aria-label="View invoice"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewInvoice(row);
              }}
            >
              <Icon name="eye" className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        )}
      </div>

      {/* mt-1.5 (not the primary row's own gap-2): tighter than the rest of
          the card's rhythm, since this sits directly under the amount it
          describes. "Charged by" stays muted; the name is bumped to
          font-semibold (from font-medium) so it still reads as the second
          strongest text on the card, after the amount but above the date. */}
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Charged by <span className="font-semibold text-foreground">{counterpartyName}</span>
      </p>

      {/* mt-2.5: a slightly wider beat than the one above, separating the
          remitter line from this trailing metadata/action row. Timestamp and
          Upload invoice share this row, button at the far right, instead of
          the button sitting on its own row below: matches the reference,
          where the button lines up with the date rather than hanging beneath
          it. items-center keeps the single-line timestamp and the button's
          own height vertically centered against each other. Still
          independent of the card's own onClick via e.stopPropagation(), same
          as View invoice above; same upload flow as before (opens the
          drawer's inline upload), just a fuller button. */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          {formatTransactionTimestamp(row.formattedCreationDateTime)}
        </p>
        {showUpload && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(row);
            }}
            className="h-auto min-h-0 shrink-0 gap-1.5 py-1.5"
          >
            Upload invoice
          </Button>
        )}
      </div>
    </div>
  );
}

interface TransactionCardListProps {
  rows: McaTransaction[];
  isLoading: boolean;
  skeletonCount?: number;
  onOpenDetails: (row: McaTransaction) => void;
  page: number;
  onPageChange: (page: number) => void;
  totalRows: number;
  pageSize: number;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * Mobile/tablet stand-in for DataTable: `rows` already reflects the current
 * server-paginated page (the same array McaTransactionTable hands to
 * DataTable's own controlled `page`/`data`), so this only lays it out as
 * cards and adds a compact pager, it doesn't re-slice or re-fetch anything.
 */
export function TransactionCardList({
  rows,
  isLoading,
  skeletonCount = 6,
  onOpenDetails,
  page,
  onPageChange,
  totalRows,
  pageSize,
  emptyTitle,
  emptyDescription,
  className,
}: TransactionCardListProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => <TransactionCardSkeleton key={i} />)
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        rows.map((row) => <TransactionCard key={row.gid} row={row} onOpenDetails={onOpenDetails} />)
      )}

      {!isLoading && rows.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
          >
            Prev
          </Button>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            rightIcon={<Icon name="chevron-right" className="h-3.5 w-3.5" />}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
