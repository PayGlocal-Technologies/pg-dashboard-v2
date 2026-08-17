"use client";

import { useRef, useState } from "react";
import { DataTable } from "@/components/ui";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { buildSkuColumns } from "@/features/dashboard/sku-management/columns";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SkuCardList } from "@/features/dashboard/sku-management/components/SkuCardList";
import { ProductPreviewModal } from "@/features/dashboard/sku-management/components/ProductPreviewModal";
import { SkuRowActions } from "@/features/dashboard/sku-management/components/SkuRowActions";
import { DeleteSkuDialog } from "@/features/dashboard/sku-management/components/DeleteSkuDialog";
import {
  SKU_PAGE_LIMIT,
  SKU_SEARCH_HINTS,
  SKU_TAB_TYPE,
  SKU_VIEW_TABS,
  type SkuViewTab,
} from "@/features/dashboard/sku-management/constants";
import { SkuItemFormModal } from "@/features/dashboard/sku-management/components/SkuItemFormModal";
import { MOCK_SKU_PRODUCTS } from "@/features/dashboard/sku-management/mock-data";
import { toSkuProductFields } from "@/features/dashboard/sku-management/schemas";
import type {
  SkuItemFormValues,
  SkuPriceField,
  SkuProduct,
} from "@/features/dashboard/sku-management/types";

interface SkuTableProps {
  /** Owned by the page, because the "Add item" button that opens it lives in
   *  the page header while every row this creates lives down here. */
  addItemOpen: boolean;
  onAddItemOpenChange: (open: boolean) => void;
}

/** Turns a saved product back into form values, so Edit opens pre-filled with
 *  exactly what the row holds. The inverse of toSkuProductFields. */
function toFormValues(product: SkuProduct): SkuItemFormValues {
  return {
    name: product.name,
    type: product.type,
    hsnSac: product.hsnSac,
    currency: product.currency,
    sellingPrice: String(product.sellingPrice),
    productCost: String(product.productCost),
    description: product.description,
    images: (product.images ?? []).map((url, index) => ({
      id: `${product.id}-image-${index}`,
      url,
      name: `${product.name} image ${index + 1}`,
    })),
  };
}

export function SkuTable({ addItemOpen, onAddItemOpenChange }: SkuTableProps) {
  const [tab, setTab] = useState<SkuViewTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Archived is a tab, not a separate mode, so this is derived rather than
  // held: there is one selected view and `tab` already is it.
  const showArchived = tab === "archived";

  // Archive and delete are recorded as id sets layered over the catalogue,
  // for the same reason priceOverrides is: once a real endpoint replaces
  // MOCK_SKU_PRODUCTS these become the pending-write set rather than a
  // divergent copy of the data.
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  // The product being previewed, or null. Holds the product rather than an id
  // so the modal can never render a stale row while it animates closed.
  const [previewProduct, setPreviewProduct] = useState<SkuProduct | null>(null);

  // The product awaiting delete confirmation. Delete never acts on the first
  // click; it only ever sets this, and DeleteSkuDialog is what calls through.
  const [pendingDelete, setPendingDelete] = useState<SkuProduct | null>(null);

  // Items created through the Add item form, newest first so a merchant sees
  // what they just added at the top rather than hunting for it. Prepended to
  // the catalogue rather than merged into it, for the same reason the override
  // maps are kept separate: MOCK_SKU_PRODUCTS stands in for a server response.
  const [createdItems, setCreatedItems] = useState<SkuProduct[]>([]);
  // Field edits from the item form, keyed by id — the same layering as
  // priceOverrides, which stays independent so an inline price edit and a form
  // edit don't clobber one another.
  const [itemEdits, setItemEdits] = useState<Record<string, Partial<SkuProduct>>>({});
  // The product being edited, or null when the form is in Add mode.
  const [editing, setEditing] = useState<SkuProduct | null>(null);
  // Ids are minted per session; a real create endpoint returns the id instead.
  const nextIdRef = useRef(0);

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

  // Three layers over the catalogue, applied in order: newly created items
  // sit in front of it, form edits replace whole fields, and inline price
  // edits are applied last so the figure showing in the table is always the
  // most recent thing the merchant typed, whichever control they typed it in.
  const sourceRows = [...createdItems, ...MOCK_SKU_PRODUCTS].map((product) => {
    const edits = itemEdits[product.id];
    const prices = priceOverrides[product.id];
    if (!edits && !prices) return product;
    return { ...product, ...edits, ...prices };
  });

  // Tab and search both narrow the same list, and both reset paging (below),
  // so this is derived during render rather than held in state. There is no
  // catalogue endpoint yet — MOCK_SKU_PRODUCTS stands in for one — so the
  // filtering is client-side; swapping in a real query means replacing the
  // source array and moving these predicates into the request body.
  const filteredRows = sourceRows.filter((product) => {
    // Deleted rows are gone from every tab. Archived rows appear under
    // Archived and nowhere else, which is what makes archiving a move rather
    // than a copy — and why the type filter below only applies to the two
    // tabs that name a type: Archived spans both.
    if (deletedIds.has(product.id)) return false;
    if (archivedIds.has(product.id) !== showArchived) return false;
    if (tab === "goods" || tab === "services") {
      if (product.type !== SKU_TAB_TYPE[tab]) return false;
    }
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

  // Opens the same form the Add item button does, pre-filled from the row.
  // Setting `editing` is what switches the modal into edit mode.
  const onEditItem = (product: SkuProduct) => {
    setEditing(product);
    onAddItemOpenChange(true);
  };

  // Both Add item and Save and add another land here; `keepOpen` is the only
  // difference between them, and the modal itself handles resetting the form.
  const onSubmitItem = (values: SkuItemFormValues, keepOpen: boolean) => {
    const fields = toSkuProductFields(values);
    // Null means validation didn't pass. The form gates submission on the same
    // check, so this is a guard rather than a path the UI can reach.
    if (!fields) return;

    if (editing) {
      setItemEdits((prev) => ({ ...prev, [editing.id]: fields }));
      setEditing(null);
      onAddItemOpenChange(false);
      return;
    }

    setCreatedItems((prev) => [
      { id: `sku-new-${nextIdRef.current++}`, ...fields },
      ...prev,
    ]);
    // A new item is active, so a merchant sitting on Archived would otherwise
    // watch the form close onto a list the item isn't in. Sending them to All
    // (and back to page 1) puts it in front of them whichever tab they were on
    // and whichever type they picked.
    setTab("all");
    setPage(1);
    if (!keepOpen) onAddItemOpenChange(false);
  };

  const closeItemForm = (open: boolean) => {
    if (!open) setEditing(null);
    onAddItemOpenChange(open);
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
      onEdit={onEditItem}
      onArchive={onArchiveItem}
      onUnarchive={onUnarchiveItem}
      onDelete={setPendingDelete}
    />
  );

  const columns = buildSkuColumns(onPriceChange, setPreviewProduct);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Switching tabs keeps the search query — a merchant looking for one product
  // shouldn't retype it to check whether they archived it. Only paging resets,
  // since each tab has its own row count.
  const onTabChange = (value: string) => {
    setTab(value as SkuViewTab);
    setPage(1);
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
      {/* Four tabs, one selected view. Archived is one of them rather than a
          button beside the search, so there's a single control for "which
          items am I looking at" instead of a tab and a mode that cross. */}
      <div className="border-b border-border px-4 pt-3">
        <UnderlineTabs tabs={SKU_VIEW_TABS} value={tab} onValueChange={onTabChange} />
      </div>

      {/* Search only — no Report, no Reorder Columns, no filter chips, and no
          archived control: the tab bar above owns that now. */}
      <div className="border-b border-border px-4 py-3">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={SKU_SEARCH_HINTS}
          ariaLabel="Search products by name or HSN/SAC"
          className="w-full sm:w-56"
        />
      </div>

      {/* Desktop (lg+): the full table. The overflow menu rides `rowAction`,
          not a column — DataTable renders that slot in a zero-width cell stuck
          to the right edge of the viewport and reveals it on row hover. That's
          what keeps it pinned right and reachable while the six data columns
          scroll horizontally under it, out of their widths, and out of any
          future column reordering. */}
      <DataTable
        className="hidden rounded-none border-0 lg:block"
        columns={columns}
        data={pageRows}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        rowKey={(row) => row.id}
        rowAction={renderRowActions}
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
        onPreview={setPreviewProduct}
        page={safePage}
        onPageChange={setPage}
        totalRows={totalCount}
        pageSize={SKU_PAGE_LIMIT}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />

      {/* Read-only. Deliberately carries no actions — Edit, Archive, and
          Delete stay on the row's overflow menu, so there's one home for
          them and this stays a look-don't-touch view. */}
      <ProductPreviewModal
        product={previewProduct}
        onOpenChange={(open) => !open && setPreviewProduct(null)}
      />

      {/* Rendered once for the whole table rather than per row: only one
          delete can be pending at a time, and `pendingDelete` is what both
          opens it and tells it which product it's confirming. */}
      <DeleteSkuDialog
        product={pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={onConfirmDelete}
      />

      {/* One form serving both Add and Edit — the field model is the same, so
          `editing` is the only thing that distinguishes them. */}
      <SkuItemFormModal
        open={addItemOpen}
        onOpenChange={closeItemForm}
        mode={editing ? "edit" : "add"}
        initialValues={editing ? toFormValues(editing) : undefined}
        onSubmit={onSubmitItem}
      />
    </div>
  );
}
