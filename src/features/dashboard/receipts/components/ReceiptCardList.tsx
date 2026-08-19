"use client";

import { Button, EmptyState, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryCell } from "@/features/dashboard/mca-transactions/columns";
import { formatReceiptAmount, formatReceiptMonth } from "@/features/dashboard/receipts/utils";
import { RECEIPT_PRODUCT_LABEL } from "@/features/dashboard/receipts/constants";
import type { Receipt, ReceiptProduct } from "@/features/dashboard/receipts/types";

function ReceiptCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-7 w-28" rounded="md" />
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
// stacked card instead of cells — Invoice number, Invoice ID, Amount, Country
// (MCA only, for the same reason the column is), Month, Product type, and the
// row's own Download action.
function ReceiptCard({
  row,
  product,
  onDownload,
}: {
  row: Receipt;
  product: ReceiptProduct;
  onDownload: (row: Receipt) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40">
      {/* Invoice number leads and Download closes the row: what identifies the
          receipt, and the one thing a merchant came here to do with it. The
          button is labelled and always drawn — nothing here is hover-gated,
          since there is no hover on touch. */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[12.5px] font-medium break-all text-foreground">
          {row.invoiceNumber}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
          onClick={() => onDownload(row)}
          className="h-auto min-h-0 shrink-0 gap-1.5 py-1.5"
        >
          Download
        </Button>
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
            {formatReceiptMonth(row.periodMonth)}
          </p>
        </div>
        {product === "MCA" && (
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Country</p>
            <CountryCell iso2={row.remitterCountry} />
          </div>
        )}
      </div>
    </div>
  );
}

interface ReceiptCardListProps {
  rows: Receipt[];
  product: ReceiptProduct;
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
  product,
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
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        rows.map((row) => (
          <ReceiptCard key={row.gid} row={row} product={product} onDownload={onDownload} />
        ))
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
