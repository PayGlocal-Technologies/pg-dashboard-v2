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
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <Shimmer className="h-8 w-8" rounded="full" />
        <Shimmer className="h-5 w-16" />
        <Shimmer className="h-5 w-24" rounded="full" />
        <Shimmer className="ml-auto h-8 w-8" rounded="lg" />
      </div>
      <Shimmer className="h-3 w-32" />
      <Shimmer className="h-3 w-28" />
    </div>
  );
}

// Same row data and action as buildMcaColumns' amount/status/action columns
// and RowClick, just laid out as a stacked card instead of table cells: the
// whole card opens the drawer (see TransactionCardList's own role="button"
// treatment below), while the leading upload/view action stops propagation
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
      className="flex cursor-pointer flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <div className="flex items-center gap-2.5">
        <CountryFlagAvatar
          iso2={row.partnerCustomerCountry ?? ""}
          countryName={row.partnerCustomerCountry ?? "Remitter country"}
          className="h-8 w-8 shrink-0"
        />
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {formatCurrency(amount, currency, "en-US")}
        </span>
        <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />

        {/* Independent of the card's own click: e.stopPropagation() keeps
            this from also opening the drawer. */}
        <div className="ml-auto shrink-0">
          {showUpload ? (
            <IconButton
              aria-label="Upload invoice"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(row);
              }}
            >
              <Icon name="upload" className="h-3.5 w-3.5" />
            </IconButton>
          ) : (
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
          )}
        </div>
      </div>

      <p className="text-[13px] text-muted-foreground">
        Charged by <span className="font-medium text-foreground">{counterpartyName}</span>
      </p>
      <p className="text-[12px] text-muted-foreground">
        {formatTransactionTimestamp(row.formattedCreationDateTime)}
      </p>
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
