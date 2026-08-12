"use client";

import { type Column, StatusBadge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import { SKU_TYPE_LABEL } from "@/features/dashboard/sku-management/constants";
import { ProductThumbnail } from "@/features/dashboard/sku-management/components/ProductThumbnail";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

// Column widths, typography (text-[13px] body, muted secondary text), and
// alignment conventions mirror buildMcaColumns so the two tables read as one
// system. No RowClick wrapper here: a SKU row has no details view to open, so
// nothing would consume the click.
export function buildSkuColumns(): Column<SkuProduct>[] {
  return [
    {
      key: "name",
      header: "Product",
      minWidth: 280,
      render: (row) => (
        <div className="flex items-center gap-3">
          <ProductThumbnail product={row} className="shrink-0" />
          <span className="text-[13px] font-medium text-foreground">{row.name}</span>
        </div>
      ),
      wrap: true,
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
      header: "Selling price",
      minWidth: 140,
      align: "right",
      render: (row) => (
        <span className="text-[13px] font-semibold tabular-nums whitespace-nowrap text-foreground">
          {formatCurrency(row.sellingPrice, row.currency)}
        </span>
      ),
    },
    {
      key: "productCost",
      header: "Product cost",
      minWidth: 140,
      align: "right",
      render: (row) => (
        <span className="text-[13px] tabular-nums whitespace-nowrap text-muted-foreground">
          {formatCurrency(row.productCost, row.currency)}
        </span>
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
