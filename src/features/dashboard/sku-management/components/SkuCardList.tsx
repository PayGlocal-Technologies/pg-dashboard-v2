"use client";

import type { ReactNode } from "react";
import { Button, EmptyState, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { SKU_PRICE_LOCALE, SKU_TYPE_LABEL } from "@/features/dashboard/sku-management/constants";
import { ProductThumbnail } from "@/features/dashboard/sku-management/components/ProductThumbnail";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

function SkuCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <Shimmer className="h-[70px] w-[70px] shrink-0" rounded="lg" />
      <div className="min-w-0 flex-1">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="mt-2 h-5 w-16" rounded="full" />
        <Shimmer className="mt-2.5 h-3 w-28" />
      </div>
    </div>
  );
}

function SkuCard({
  row,
  actions,
  onPreview,
}: {
  row: SkuProduct;
  actions?: ReactNode;
  onPreview: (product: SkuProduct) => void;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      {/* Image and name open the preview, matching the table's Product cell.
          Kept off the card as a whole so the overflow menu, and anything added
          to the card later, keep their own clicks. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Preview ${row.name}`}
        aria-haspopup="dialog"
        onClick={() => onPreview(row)}
        className="h-auto min-h-0 shrink-0 rounded-lg p-0"
      >
        <ProductThumbnail product={row} />
      </Button>

      {/* min-w-0 so the long description below can actually truncate inside
          this flex child instead of stretching the card. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Preview ${row.name}`}
            aria-haspopup="dialog"
            onClick={() => onPreview(row)}
            className="-mx-1 h-auto min-h-0 min-w-0 justify-start rounded-md px-1 py-0.5 text-left text-[14px] font-semibold text-foreground"
          >
            {row.name}
          </Button>
          {/* Type chip and the overflow menu share the card's top-right
              corner. Unlike the table — where the menu only appears on row
              hover — it's always visible here: there is no hover on touch. */}
          <div className="flex shrink-0 items-start gap-1">
            <StatusBadge
              variant={row.type === "GOODS" ? "info" : "muted"}
              label={SKU_TYPE_LABEL[row.type]}
              size="sm"
            />
            {actions}
          </div>
        </div>

        {/* Selling price is the figure merchants scan for, so it carries the
            same weight the amount does on a transaction card; cost and HSN/SAC
            trail it as muted metadata on the same line. */}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[15px] font-semibold tabular-nums text-foreground">
            {formatCurrency(row.sellingPrice, row.currency, SKU_PRICE_LOCALE)}
          </span>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            Cost {formatCurrency(row.productCost, row.currency, SKU_PRICE_LOCALE)}
          </span>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            HSN/SAC {row.hsnSac}
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-[12px] text-muted-foreground">{row.description}</p>
      </div>
    </div>
  );
}

interface SkuCardListProps {
  rows: SkuProduct[];
  isLoading: boolean;
  /** Per-row overflow menu, mirroring DataTable's own `rowAction` signature so
   *  the table and the card list are fed by the same call site. */
  rowAction?: (row: SkuProduct) => ReactNode;
  /** Opens the read-only product preview — same handler the table's Product
   *  cell uses, so a tap and a click land on the same modal. */
  onPreview: (product: SkuProduct) => void;
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
 * page uses (see TransactionCardList): `rows` is already the current page's
 * slice, so this only lays it out as cards and adds the compact pager.
 */
export function SkuCardList({
  rows,
  isLoading,
  rowAction,
  onPreview,
  skeletonCount = 6,
  page,
  onPageChange,
  totalRows,
  pageSize,
  emptyTitle,
  emptyDescription,
  className,
}: SkuCardListProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => <SkuCardSkeleton key={i} />)
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        rows.map((row) => (
          <SkuCard key={row.id} row={row} actions={rowAction?.(row)} onPreview={onPreview} />
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
