"use client";

import { Button, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import { ReceiptDownloadAction } from "@/features/dashboard/mca-receipts/columns";
import { formatReceiptAmount } from "@/features/dashboard/mca-receipts/utils";
import { formatMonthLabel } from "@/lib/utils/format";
import { RECEIPT_PRODUCT_LABEL } from "@/features/dashboard/mca-receipts/constants";
import type { Receipt } from "@/features/dashboard/mca-receipts/types";

function ReceiptCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-7 w-7" rounded="md" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Shimmer className="h-5 w-28" />
        <Shimmer className="h-5 w-32" rounded="full" />
      </div>
      <Shimmer className="mt-3 h-3 w-44" />
    </div>
  );
}

// The same fields the table's columns show, in the same order, laid out as a
// stacked card instead of cells — Invoice number, Invoice ID, Amount, Month,
// Product type — with the row's own download action in the same place the table
// pins it: the far right of the leading row.
function ReceiptCard({ row, onDownload }: { row: Receipt; onDownload: (row: Receipt) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40">
      {/* Invoice number leads and the download icon closes the row: what
          identifies the receipt, and the one thing a merchant came here to do
          with it. Literally the same control the table pins to the right of each
          row, so a tap and a click are the same action with the same accessible
          name. Always drawn — nothing here is hover-gated, since there is no
          hover on touch. */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[12.5px] font-medium break-all text-foreground">
          {row.invoiceNumber}
        </span>
        <span className="shrink-0">
          <ReceiptDownloadAction row={row} onDownload={onDownload} />
        </span>
      </div>

      {/* The amount carries the same weight it does on a transaction card, with
          the product type balancing it at the other end of the row. */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tabular-nums text-foreground">
            {formatReceiptAmount(row)}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
        </div>
        <StatusBadge variant="muted" label={RECEIPT_PRODUCT_LABEL[row.product]} size="sm" />
      </div>

      {/* The remaining columns as labelled pairs, in the table's own order. Two
          pairs per row where there's room, one when there isn't; min-w-0 on each
          is what lets a long value truncate inside its grid cell instead of
          widening the card. */}
      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Invoice ID</p>
          <p className="truncate font-mono text-[12.5px] text-foreground">{row.invoiceId}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Month</p>
          <p className="truncate text-[12.5px] text-foreground">
            {formatMonthLabel(row.periodMonth)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ReceiptCardListProps {
  rows: Receipt[];
  isLoading: boolean;
  onDownload: (row: Receipt) => void;
  skeletonCount?: number;
  page: number;
  onPageChange: (page: number) => void;
  totalRows: number;
  pageSize: number;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * Mobile/tablet stand-in for DataTable, the same arrangement the Transactions and
 * SKU management pages use (see TransactionCardList and SkuCardList): `rows` is
 * already the current page's slice, so this only lays it out as cards and adds
 * the compact pager.
 */
export function ReceiptCardList({
  rows,
  isLoading,
  onDownload,
  skeletonCount = 6,
  page,
  onPageChange,
  totalRows,
  pageSize,
  emptyTitle,
  emptyDescription,
  className,
}: ReceiptCardListProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => <ReceiptCardSkeleton key={i} />)
      ) : rows.length === 0 ? (
        <PlaceholderState
          variant="no-data"
          size="sm"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        rows.map((row) => <ReceiptCard key={row.gid} row={row} onDownload={onDownload} />)
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
