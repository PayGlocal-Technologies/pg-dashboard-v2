"use client";

import type { ReactNode } from "react";
import { type Column, StatusBadge } from "@/components/ui";
import { RowClick } from "@/components/common/table/RowClick";
import { SKU_TYPE_LABEL } from "@/features/dashboard/sku-management/constants";
import { ProductThumbnail } from "@/features/dashboard/sku-management/components/ProductThumbnail";
import { EditablePriceCell } from "@/features/dashboard/sku-management/components/EditablePriceCell";
import type { SkuPriceField, SkuProduct } from "@/features/dashboard/sku-management/types";

// The two price columns' headers are declared once and reused as the popover's
// label and assistive line ("This will update the selling price of this
// product"), so renaming a column renames what its editor says about itself.
const SELLING_PRICE_HEADER = "Selling price";
const PRODUCT_COST_HEADER = "Product cost";

/**
 * Fences an interactive control off from the row click wrapped around it.
 *
 * The guard sits on this wrapper rather than on the control itself: the price
 * editors open a Radix popover whose trigger composes its own click handler,
 * and adding a second handler to that chain is exactly the arrangement the row
 * overflow menu failed to open from. Stopping one level out leaves the
 * control's own handlers untouched — the click simply never reaches RowClick's
 * div. Any future control added inside a row cell should be wrapped the same
 * way.
 */
function StopRowClick({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
      {children}
    </span>
  );
}

// Column widths, typography (text-[13px] body, muted secondary text), and
// alignment conventions mirror buildMcaColumns so the two tables read as one
// system. Every cell is wrapped in RowClick, so the whole row opens the
// product preview — including each cell's padding, which a bare span would
// leave dead. The two price editors are fenced off with StopRowClick above.
//
// These are the table's whole column set, plus the optional MID column below.
// The row's overflow menu is
// deliberately not among them — it rides DataTable's `rowAction` slot instead
// (see SkuTable), so it never takes column width, never reorders with the
// data, and stays pinned to the right while the columns scroll.
export function buildSkuColumns(
  onPriceChange: (id: string, field: SkuPriceField, next: number) => void,
  onPreview: (product: SkuProduct) => void,
  /**
   * Adds the MID column, second from the left. Only true when the merchant
   * holds several PACB MIDs and has selected none — the one state where rows
   * from different accounts sit in the same table and the row's own name is not
   * enough to tell you which account it belongs to. Same condition and same
   * position pg-dashboard uses (`hidden: !showMid`).
   */
  showMid = false
): Column<SkuProduct>[] {
  return [
    {
      key: "name",
      header: "Product",
      // 70px thumbnail + 12px gap + the name's 160px width = 242. Floor and
      // ceiling are the same number: the name has a fixed width, so there is
      // nothing for extra column width to do, and the column can't jump around
      // while the table fills in.
      minWidth: 242,
      // Without this, DataTable puts whitespace-nowrap on the cell at compact
      // density, and that inherits into the name — line-clamp sets a line
      // limit but never touches white-space, so the text would sit on one
      // clipped line and never reach a second. This is the column API's own
      // opt-out, so the nowrap is simply not emitted.
      wrap: true,
      // Compact density also puts overflow-hidden on every cell, which would
      // clip the thumbnail's rounded frame — cancelled here, same as
      // mcaColumns does for its Country cell. The name clips itself below.
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onPreview(row)}>
          {/* items-center, and no min-w-max: the container used to be sized to
              the full unwrapped name, which is what let the column grow without
              limit. The name is capped below instead, so the row's height is
              set by the 70px thumbnail whether the name runs to one line or
              two. */}
          <div className="flex items-center gap-3">
            <ProductThumbnail product={row} className="shrink-0" />
            {/* Wraps at 160px, then stops at two lines with an ellipsis.
                A fixed w- with shrink-0, not max-w-: line-clamp sets
                overflow:hidden, which drops a flex item's automatic minimum to
                zero, so under max-w- alone this span was free to be squeezed by
                the columns beside it and wrapped far narrower than its cap —
                what the reported screenshot showed. A fixed basis it cannot
                shrink out of is what makes the wrap point predictable. Matches
                how the Description column below is sized.

                whitespace-normal is stated here as well as via the column's
                `wrap` flag, so the name keeps wrapping even if an ancestor
                reintroduces nowrap. `title` keeps the full name reachable on
                hover once it has been cut. */}
            <span
              className="line-clamp-2 w-[160px] shrink-0 text-[13px] font-medium break-words whitespace-normal text-foreground"
              title={row.name}
            >
              {row.name}
            </span>
          </div>
        </RowClick>
      ),
    },
    ...(showMid
      ? [
          {
            key: "mid",
            header: "MID",
            minWidth: 120,
            render: (row: SkuProduct) => (
              <RowClick onClick={() => onPreview(row)}>
                <span className="text-[13px] tabular-nums whitespace-nowrap text-muted-foreground">
                  {row.mid || "—"}
                </span>
              </RowClick>
            ),
          } satisfies Column<SkuProduct>,
        ]
      : []),
    {
      key: "type",
      header: "Type of product",
      minWidth: 150,
      render: (row) => (
        <RowClick onClick={() => onPreview(row)}>
          <StatusBadge
            variant={row.type === "GOODS" ? "info" : "muted"}
            label={row.type ? SKU_TYPE_LABEL[row.type] : "—"}
            size="sm"
          />
        </RowClick>
      ),
    },
    {
      key: "hsnSac",
      header: "HSN/SAC",
      minWidth: 130,
      render: (row) => (
        <RowClick onClick={() => onPreview(row)}>
          <span className="text-[13px] tabular-nums whitespace-nowrap text-muted-foreground">
            {row.hsnSac}
          </span>
        </RowClick>
      ),
    },
    {
      key: "sellingPrice",
      header: SELLING_PRICE_HEADER,
      minWidth: 140,
      align: "right",
      // Compact density clips cells; the trigger's hover fill sits slightly
      // proud of the text box and would be cut off without this.
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onPreview(row)} align="right">
          <StopRowClick>
            <EditablePriceCell
              label={SELLING_PRICE_HEADER}
              value={row.sellingPrice}
              currency={row.currency}
              onSave={(next) => onPriceChange(row.id, "sellingPrice", next)}
              emphasis
            />
          </StopRowClick>
        </RowClick>
      ),
    },
    {
      key: "productCost",
      header: PRODUCT_COST_HEADER,
      minWidth: 140,
      align: "right",
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onPreview(row)} align="right">
          <StopRowClick>
            <EditablePriceCell
              label={PRODUCT_COST_HEADER}
              value={row.productCost}
              currency={row.currency}
              onSave={(next) => onPriceChange(row.id, "productCost", next)}
            />
          </StopRowClick>
        </RowClick>
      ),
    },
    {
      key: "description",
      header: "Description",
      minWidth: 260,
      // Descriptions are full sentences: they get a fixed width and truncate
      // (with the full text in `title`) rather than widening the column to fit
      // the longest one, which would push the priced columns off screen.
      render: (row) => (
        <RowClick onClick={() => onPreview(row)}>
          <span
            className="block w-[240px] truncate text-[13px] text-muted-foreground"
            title={row.description}
          >
            {row.description}
          </span>
        </RowClick>
      ),
    },
  ];
}
