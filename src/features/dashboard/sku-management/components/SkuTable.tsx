"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { buildSkuColumns } from "@/features/dashboard/sku-management/columns";
import { SkuCardList } from "@/features/dashboard/sku-management/components/SkuCardList";
import {
  SKU_PAGE_LIMIT,
  SKU_TAB_TYPE,
  SKU_VIEW_TABS,
  type SkuViewTab,
} from "@/features/dashboard/sku-management/constants";
import { MOCK_SKU_PRODUCTS } from "@/features/dashboard/sku-management/mock-data";

export function SkuTable() {
  const [tab, setTab] = useState<SkuViewTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Tab and search both narrow the same list, and both reset paging (below),
  // so this is derived during render rather than held in state. There is no
  // catalogue endpoint yet — MOCK_SKU_PRODUCTS stands in for one — so the
  // filtering is client-side; swapping in a real query means replacing the
  // source array and moving these two predicates into the request body.
  const filteredRows = MOCK_SKU_PRODUCTS.filter((product) => {
    if (tab !== "all" && product.type !== SKU_TAB_TYPE[tab]) return false;
    // Product name only: the page has no other search axis (no filter chips,
    // no HSN/description search), per the spec for this table.
    return product.name.toLowerCase().includes(search.trim().toLowerCase());
  });

  const totalCount = filteredRows.length;
  const pageRows = filteredRows.slice((page - 1) * SKU_PAGE_LIMIT, page * SKU_PAGE_LIMIT);

  const columns = buildSkuColumns();

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const onTabChange = (value: string) => {
    setTab(value as SkuViewTab);
    setPage(1);
  };

  return (
    // Tab bar, search, and the table share one bordered surface, matching the
    // Transactions page: DataTable's own border/radius are neutralised
    // (rounded-none border-0) since this wrapper draws them, and a border-b
    // under each control row stands in for the separators between them.
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 pt-3">
        <UnderlineTabs tabs={SKU_VIEW_TABS} value={tab} onValueChange={onTabChange} />
      </div>

      {/* Search only — no Report, no Reorder Columns, no filter chips. */}
      <div className="border-b border-border px-4 py-3">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={["product name"]}
          ariaLabel="Search products"
          className="w-full sm:w-56"
        />
      </div>

      {/* Desktop (lg+): the full table. */}
      <DataTable
        className="hidden rounded-none border-0 lg:block"
        columns={columns}
        data={pageRows}
        emptyTitle="No products found"
        emptyDescription="Try a different search or switch tabs"
        rowKey={(row) => row.id}
        pageSize={SKU_PAGE_LIMIT}
        totalRows={totalCount}
        page={page}
        onPageChange={setPage}
        tableLayout="content"
        density="compact"
      />

      {/* Tablet + mobile (below lg): the same page's rows as cards. */}
      <SkuCardList
        className="lg:hidden"
        rows={pageRows}
        isLoading={false}
        page={page}
        onPageChange={setPage}
        totalRows={totalCount}
        pageSize={SKU_PAGE_LIMIT}
        emptyTitle="No products found"
        emptyDescription="Try a different search or switch tabs"
      />
    </div>
  );
}
