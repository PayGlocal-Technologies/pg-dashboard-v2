"use client";

import type { ReactNode } from "react";
import { Shimmer, StatusBadge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import { SKU_PRICE_LOCALE, SKU_TYPE_LABEL } from "@/features/dashboard/sku-management/constants";
import { ProductThumbnail } from "@/features/dashboard/sku-management/components/ProductThumbnail";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

export function SkuCardSkeleton() {
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

export function SkuCard({
  row,
  actions,
  onPreview,
}: {
  row: SkuProduct;
  actions?: ReactNode;
  onPreview: (product: SkuProduct) => void;
}) {
  return (
    // The whole card opens the preview, the touch equivalent of the table's
    // whole-row click. Keyboard-reachable too, since it isn't a real button.
    <div
      role="button"
      tabIndex={0}
      aria-label={`Preview ${row.name}`}
      aria-haspopup="dialog"
      data-guide="mca-sku-image"
      onClick={() => onPreview(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview(row);
        }
      }}
      className="flex cursor-pointer gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <ProductThumbnail product={row} className="shrink-0" />

      {/* min-w-0 so the long description below can actually truncate inside
          this flex child instead of stretching the card. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[14px] font-semibold text-foreground">{row.name}</span>
          {/* Type chip and the overflow menu share the card's top-right
              corner. Unlike the table — where the menu only appears on row
              hover — it's always visible here: there is no hover on touch. */}
          <div className="flex shrink-0 items-start gap-1">
            <StatusBadge
              variant={row.type === "GOODS" ? "info" : "muted"}
              label={row.type ? SKU_TYPE_LABEL[row.type] : "—"}
              size="sm"
            />
            {/* Fenced off from the card's own click, so the overflow menu
                opens without also opening the preview behind it. */}
            <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
              {actions}
            </span>
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
