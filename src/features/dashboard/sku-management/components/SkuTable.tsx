"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { buildSkuColumns } from "@/features/dashboard/sku-management/columns";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SkuCardList } from "@/features/dashboard/sku-management/components/SkuCardList";
import {
  SKU_PAGE_LIMIT,
  SKU_SEARCH_HINTS,
  SKU_TAB_TYPE,
  SKU_VIEW_TABS,
  type SkuViewTab,
} from "@/features/dashboard/sku-management/constants";
import { MOCK_SKU_PRODUCTS } from "@/features/dashboard/sku-management/mock-data";
import type { SkuPriceField, SkuProduct } from "@/features/dashboard/sku-management/types";

export function SkuTable() {
  const [tab, setTab] = useState<SkuViewTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Inline price edits, keyed by product id and layered over the source rows
  // below — the same shape McaTransactionTable uses for its optimistic status
  // overrides. Held separately rather than by cloning the catalogue into
  // state, so once a real endpoint replaces MOCK_SKU_PRODUCTS a refetch keeps
  // every field the merchant hasn't touched fresh, and this narrows to the
  // pending-write set it already is.
  const [priceOverrides, setPriceOverrides] = useState<
    Record<string, Partial<Pick<SkuProduct, SkuPriceField>>>
  >({});

  const query = search.trim().toLowerCase();

  const sourceRows = MOCK_SKU_PRODUCTS.map((product) =>
    priceOverrides[product.id] ? { ...product, ...priceOverrides[product.id] } : product
  );

  // Tab and search both narrow the same list, and both reset paging (below),
  // so this is derived during render rather than held in state. There is no
  // catalogue endpoint yet — MOCK_SKU_PRODUCTS stands in for one — so the
  // filtering is client-side; swapping in a real query means replacing the
  // source array and moving these predicates into the request body.
  const filteredRows = sourceRows.filter((product) => {
    if (tab !== "all" && product.type !== SKU_TAB_TYPE[tab]) return false;
    if (!query) return true;
    // Matches either field the placeholder cycles through (SKU_SEARCH_HINTS),
    // the same way the Transactions search spans remitter/transaction ID/UTR:
    // one box, no mode to pick, a hit on either counts. Description stays
    // unsearchable — the hint never offers it.
    return (
      product.name.toLowerCase().includes(query) ||
      product.hsnSac.toLowerCase().includes(query)
    );
  });

  const totalCount = filteredRows.length;
  const pageRows = filteredRows.slice((page - 1) * SKU_PAGE_LIMIT, page * SKU_PAGE_LIMIT);

  // TODO: persist through a catalogue update endpoint once one exists — today
  // this is local only, so an edit survives filtering, paging, and tab
  // switches but not a reload.
  const onPriceChange = (id: string, field: SkuPriceField, next: number) => {
    setPriceOverrides((prev) => ({ ...prev, [id]: { ...prev[id], [field]: next } }));
  };

  const columns = buildSkuColumns(onPriceChange);

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
          words={SKU_SEARCH_HINTS}
          ariaLabel="Search products by name or HSN/SAC"
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
