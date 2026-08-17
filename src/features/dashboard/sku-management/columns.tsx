"use client";

import { Button, type Column, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SKU_TYPE_LABEL } from "@/features/dashboard/sku-management/constants";
import { ProductThumbnail } from "@/features/dashboard/sku-management/components/ProductThumbnail";
import { EditablePriceCell } from "@/features/dashboard/sku-management/components/EditablePriceCell";
import type { SkuPriceField, SkuProduct } from "@/features/dashboard/sku-management/types";

// The two price columns' headers are declared once and reused as the popover's
// label and assistive line ("This will update the selling price of this
// product"), so renaming a column renames what its editor says about itself.
const SELLING_PRICE_HEADER = "Selling price";
const PRODUCT_COST_HEADER = "Product cost";

// Column widths, typography (text-[13px] body, muted secondary text), and
// alignment conventions mirror buildMcaColumns so the two tables read as one
// system. No RowClick wrapper here: a SKU row has no details view to open, and
// a row-level click target would swallow the clicks the price cells need.
//
// These six are the table's whole column set. The row's overflow menu is
// deliberately not among them — it rides DataTable's `rowAction` slot instead
// (see SkuTable), so it never takes column width, never reorders with the
// data, and stays pinned to the right while the columns scroll.
export function buildSkuColumns(
  onPriceChange: (id: string, field: SkuPriceField, next: number) => void,
  onPreview: (product: SkuProduct) => void
): Column<SkuProduct>[] {
  return [
    {
      key: "name",
      header: "Product",
      // The floor, not the final width: `tableLayout="content"` sizes this
      // column to its widest cell, and min-w-max below keeps that measurement
      // honest, so the longest product name sets the column width. 340 covers
      // the 70px thumbnail plus a typical name, so the column doesn't jump
      // around while the table is still filling in.
      minWidth: 340,
      // Compact density puts overflow-hidden on every cell, which would clip
      // the un-wrapped name back to the column's current width and defeat the
      // min-w-max measurement — cancelled here, same as mcaColumns does for
      // its Country cell.
      cellClassName: "overflow-visible",
      render: (row) => (
        // The image and the name together are the preview's click target —
        // just this cell, not the row, so the price editors and the overflow
        // menu keep their own clicks. A ghost Button stripped back to the
        // cell's own type scale, the same treatment EditablePriceCell uses, so
        // opening a preview is discoverable on hover without the column
        // looking any different at rest.
        //
        // min-w-max: the cell never shrinks below thumbnail + full name, so
        // the column widens to fit rather than truncating or wrapping.
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Preview ${row.name}`}
          aria-haspopup="dialog"
          onClick={() => onPreview(row)}
          className={cn(
            "-mx-1.5 h-auto min-h-0 min-w-max justify-start rounded-lg px-1.5 py-1 text-left font-normal",
            "[&>span]:flex [&>span]:min-w-max [&>span]:items-center [&>span]:gap-3"
          )}
        >
          <ProductThumbnail product={row} className="shrink-0" />
          <span className="text-[13px] font-medium whitespace-nowrap text-foreground">
            {row.name}
          </span>
        </Button>
      ),
    },
    {
      key: "type",
      header: "Type of product",
      minWidth: 150,
      render: (row) => (
        <StatusBadge
          variant={row.type === "GOODS" ? "info" : "muted"}
          label={SKU_TYPE_LABEL[row.type]}
          size="sm"
        />
      ),
    },
    {
      key: "hsnSac",
      header: "HSN/SAC",
      minWidth: 130,
      render: (row) => (
        <span className="text-[13px] tabular-nums whitespace-nowrap text-muted-foreground">
          {row.hsnSac}
        </span>
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
        <EditablePriceCell
          label={SELLING_PRICE_HEADER}
          value={row.sellingPrice}
          currency={row.currency}
          onSave={(next) => onPriceChange(row.id, "sellingPrice", next)}
          emphasis
        />
      ),
    },
    {
      key: "productCost",
      header: PRODUCT_COST_HEADER,
      minWidth: 140,
      align: "right",
      cellClassName: "overflow-visible",
      render: (row) => (
        <EditablePriceCell
          label={PRODUCT_COST_HEADER}
          value={row.productCost}
          currency={row.currency}
          onSave={(next) => onPriceChange(row.id, "productCost", next)}
        />
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
        <span
          className="block w-[240px] truncate text-[13px] text-muted-foreground"
          title={row.description}
        >
          {row.description}
        </span>
      ),
    },
  ];
}
