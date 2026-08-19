"use client";

import { Button, EmptyState, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { getReceiptStatusMeta } from "@/features/dashboard/receipts/columns";
import { formatReceiptAmount } from "@/features/dashboard/receipts/utils";
import { RECEIPT_COLUMN_LABELS } from "@/features/dashboard/receipts/constants";
import type { Receipt, ReceiptProduct } from "@/features/dashboard/receipts/types";

function ReceiptCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-4 w-44" />
        <Shimmer className="h-5 w-16" rounded="full" />
      </div>
      <Shimmer className="mt-2.5 h-5 w-28" />
      <Shimmer className="mt-2.5 h-3 w-40" />
      <Shimmer className="mt-2 h-3 w-32" />
    </div>
  );
}

function ReceiptCard({ row, product }: { row: Receipt; product: ReceiptProduct }) {
  const { label, variant, trailIcon } = getReceiptStatusMeta(row.status);
  const labels = RECEIPT_COLUMN_LABELS[product];

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40">
      {/* Receipt number leads and the status chip closes the row: the two facts
          a merchant scans a list of receipts for. Unlike the table — where the
          number reveals its copy button on row hover — nothing is hover-gated
          here, since there is no hover on touch. */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[12.5px] font-medium break-all text-foreground">
          {row.receiptNumber}
        </span>
        <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
      </div>

      {/* The amount carries the same weight it does on a transaction card. */}
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold tabular-nums text-foreground">
          {formatReceiptAmount(row)}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
      </div>

      {/* The remaining table columns as labelled pairs, in the table's own
          order — the card is the same record, so it names the same fields in
          the same sequence, with the labels following the selected product just
          as the column headers do. Two pairs per row where there's room, one
          when there isn't; min-w-0 on each is what lets a long value truncate
          inside its grid cell instead of widening the card. */}
      <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {[
          { term: labels.party, value: row.party },
          { term: labels.reference, value: row.reference },
          { term: labels.channel, value: row.channel },
          { term: "Issued on", value: formatTransactionTimestamp(row.issuedOn) },
        ].map((item) => (
          <div key={item.term} className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{item.term}</p>
            <p className="truncate text-[12.5px] text-foreground" title={item.value}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ReceiptCardListProps {
  rows: Receipt[];
  product: ReceiptProduct;
  isLoading: boolean;
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
 * Mobile/tablet stand-in for DataTable, the same arrangement the Transactions
 * and SKU management pages use (see TransactionCardList and SkuCardList):
 * `rows` is already the current page's slice, so this only lays it out as cards
 * and adds the compact pager.
 */
export function ReceiptCardList({
  rows,
  product,
  isLoading,
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
        rows.map((row) => <ReceiptCard key={row.gid} row={row} product={product} />)
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
