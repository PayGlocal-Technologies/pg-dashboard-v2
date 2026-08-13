"use client";

import { useState } from "react";
import { Badge, Button, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { buildSkuColumns } from "@/features/dashboard/sku-management/columns";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SkuCardList } from "@/features/dashboard/sku-management/components/SkuCardList";
import { SkuRowActions } from "@/features/dashboard/sku-management/components/SkuRowActions";
import { DeleteSkuDialog } from "@/features/dashboard/sku-management/components/DeleteSkuDialog";
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

  // Archived items are a view of this same page, not a route: the tab bar,
  // search, columns, and card list are all shared, and only the row set and
  // the overflow menu's options differ.
  const [showArchived, setShowArchived] = useState(false);

  // Archive and delete are recorded as id sets layered over the catalogue,
  // for the same reason priceOverrides is: once a real endpoint replaces
  // MOCK_SKU_PRODUCTS these become the pending-write set rather than a
  // divergent copy of the data.
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  // Which row's overflow menu is open, if any — hoisted here rather than held
  // per row so only one can ever be open at a time.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // The product awaiting delete confirmation. Delete never acts on the first
  // click; it only ever sets this, and DeleteSkuDialog is what calls through.
  const [pendingDelete, setPendingDelete] = useState<SkuProduct | null>(null);

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
    // Deleted rows are gone from both views; archived rows appear in exactly
    // one of them, which is what makes archiving a move rather than a copy.
    if (deletedIds.has(product.id)) return false;
    if (archivedIds.has(product.id) !== showArchived) return false;
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
  // Archiving or deleting the last row on the final page would otherwise leave
  // `page` pointing past the end and show an empty table. Clamping here (rather
  // than resetting page in each handler) covers every way the row count can
  // shrink, and is derived during render, so no effect writes state back.
  const totalPages = Math.max(1, Math.ceil(totalCount / SKU_PAGE_LIMIT));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (safePage - 1) * SKU_PAGE_LIMIT,
    safePage * SKU_PAGE_LIMIT
  );

  // TODO: every mutation below is local only — persist each through the
  // catalogue endpoints once they exist. Edits, archives, and deletes survive
  // filtering, paging, and view switches, but not a reload.
  const onPriceChange = (id: string, field: SkuPriceField, next: number) => {
    setPriceOverrides((prev) => ({ ...prev, [id]: { ...prev[id], [field]: next } }));
  };

  // TODO: open the item editor once one exists. There is no create/edit form
  // on this page yet — "Add item" and "Import" are the same stub — so this is
  // deliberately inert rather than wired to a half-built flow.
  const onEditItem = (product: SkuProduct) => {
    void product;
  };

  const onArchiveItem = (product: SkuProduct) => {
    setArchivedIds((prev) => new Set(prev).add(product.id));
  };

  const onUnarchiveItem = (product: SkuProduct) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
  };

  const onConfirmDelete = (product: SkuProduct) => {
    setDeletedIds((prev) => new Set(prev).add(product.id));
    setPendingDelete(null);
  };

  // One menu renderer feeding both the table's trailing actions column and
  // the card list, so a row's actions are identical at every width.
  const renderRowActions = (row: SkuProduct) => (
    <SkuRowActions
      product={row}
      archived={showArchived}
      open={openMenuId === row.id}
      onOpenChange={(next) => setOpenMenuId(next ? row.id : null)}
      onEdit={onEditItem}
      onArchive={onArchiveItem}
      onUnarchive={onUnarchiveItem}
      onDelete={setPendingDelete}
    />
  );

  const columns = buildSkuColumns(onPriceChange, renderRowActions);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const onTabChange = (value: string) => {
    setTab(value as SkuViewTab);
    setPage(1);
  };

  // Toggling the view keeps the tab and the search query — a merchant looking
  // for one product shouldn't have to retype it to check whether they archived
  // it. Only paging resets, since the two views' row counts differ.
  const onToggleArchived = () => {
    setShowArchived((prev) => !prev);
    setPage(1);
    setOpenMenuId(null);
  };

  const emptyTitle = showArchived ? "No archived products" : "No products found";
  const emptyDescription = showArchived
    ? "Items you archive from the SKU list appear here"
    : "Try a different search or switch tabs";

  return (
    // Tab bar, search, and the table share one bordered surface, matching the
    // Transactions page: DataTable's own border/radius are neutralised
    // (rounded-none border-0) since this wrapper draws them, and a border-b
    // under each control row stands in for the separators between them.
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 pt-3">
        {/* The tab bar's own right-hand slot carries the archived marker, so
            All/Goods/Services keep filtering both views identically while it
            stays obvious which set is on screen. */}
        <UnderlineTabs
          tabs={SKU_VIEW_TABS}
          value={tab}
          onValueChange={onTabChange}
          actions={
            showArchived ? (
              <Badge variant="secondary" size="sm" leftIcon={<Icon name="archive" className="h-3 w-3" />}>
                Viewing archived items
              </Badge>
            ) : null
          }
        />
      </div>

      {/* Search, with the archived-view toggle pushed to the far right by
          ml-auto. Still no Report, no Reorder Columns, no filter chips. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={SKU_SEARCH_HINTS}
          ariaLabel="Search products by name or HSN/SAC"
          className="w-full sm:w-56"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={
            <Icon
              name={showArchived ? "chevron-left" : "archive"}
              className="h-3.5 w-3.5"
            />
          }
          onClick={onToggleArchived}
          className="ml-auto h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
        >
          {showArchived ? "Back to items" : "Archived items"}
        </Button>
      </div>

      {/* Desktop (lg+): the full table. The overflow menu is the last column
          (see buildSkuColumns) rather than DataTable's hover-revealed
          `rowAction` overlay, so the trigger is an ordinary button in an
          ordinary cell. The six data columns and their alignment are
          unchanged. */}
      <DataTable
        className="hidden rounded-none border-0 lg:block"
        columns={columns}
        data={pageRows}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        rowKey={(row) => row.id}
        pageSize={SKU_PAGE_LIMIT}
        totalRows={totalCount}
        page={safePage}
        onPageChange={setPage}
        tableLayout="content"
        density="compact"
      />

      {/* Tablet + mobile (below lg): the same page's rows as cards. */}
      <SkuCardList
        className="lg:hidden"
        rows={pageRows}
        isLoading={false}
        rowAction={renderRowActions}
        page={safePage}
        onPageChange={setPage}
        totalRows={totalCount}
        pageSize={SKU_PAGE_LIMIT}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />

      {/* Rendered once for the whole table rather than per row: only one
          delete can be pending at a time, and `pendingDelete` is what both
          opens it and tells it which product it's confirming. */}
      <DeleteSkuDialog
        product={pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
