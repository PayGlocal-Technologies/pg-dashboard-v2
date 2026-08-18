"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, DataTable, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { buildSkuColumns } from "@/features/dashboard/sku-management/columns";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SkuCardList } from "@/features/dashboard/sku-management/components/SkuCardList";
import { ProductPreviewModal } from "@/features/dashboard/sku-management/components/ProductPreviewModal";
import { SkuRowActions } from "@/features/dashboard/sku-management/components/SkuRowActions";
import { DeleteSkuDialog } from "@/features/dashboard/sku-management/components/DeleteSkuDialog";
import { DuplicateSkuDialog } from "@/features/dashboard/sku-management/components/DuplicateSkuDialog";
import {
  SKU_PAGE_LIMIT,
  SKU_SEARCH_HINTS,
  SKU_TAB_TYPE,
  SKU_VIEW_TABS,
  type SkuViewTab,
} from "@/features/dashboard/sku-management/constants";
import { SkuItemFormModal } from "@/features/dashboard/sku-management/components/SkuItemFormModal";
import {
  toSkuMutationPayload,
  toSkuPayloadFromProduct,
  useCreateSku,
  useDeleteSku,
  useDuplicateSku,
  useSkuCatalogue,
  useSkuMidScope,
  useUpdateSku,
} from "@/features/dashboard/sku-management/hooks";
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
  /** Opens the page's import modal. The first-run empty state offers it as a
   *  second way in, so the button in the header isn't the only one. */
  onImport: () => void;
}

/** Turns a saved product back into form values, so Edit opens pre-filled with
 *  exactly what the row holds. The inverse of toSkuMutationPayload. */
function toFormValues(product: SkuProduct): SkuItemFormValues {
  return {
    name: product.name,
    // A row can arrive untyped, which the select shows as its unchosen state
    // rather than guessing a type on the merchant's behalf.
    type: product.type ?? "",
    hsnSac: product.hsnSac,
    currency: product.currency,
    sellingPrice: String(product.sellingPrice),
    productCost: String(product.productCost),
    description: product.description,
    // The catalogue endpoint has no media field, so a fetched row never carries
    // images. Kept mapping-shaped rather than hardcoded to [] so this starts
    // working the day the API grows one.
    images: (product.images ?? []).map((url, index) => ({
      id: `${product.id}-image-${index}`,
      url,
      name: `${product.name} image ${index + 1}`,
    })),
  };
}

export function SkuTable({ addItemOpen, onAddItemOpenChange, onImport }: SkuTableProps) {
  const [tab, setTab] = useState<SkuViewTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // The product being previewed, or null. Holds the product rather than an id
  // so the modal can never render a stale row while it animates closed.
  const [previewProduct, setPreviewProduct] = useState<SkuProduct | null>(null);

  // The product awaiting delete confirmation. Delete never acts on the first
  // click; it only ever sets this, and DeleteSkuDialog is what calls through.
  const [pendingDelete, setPendingDelete] = useState<SkuProduct | null>(null);

  // The product awaiting duplicate confirmation. Same shape as pendingDelete:
  // the menu item only ever sets this, and the dialog is what calls through.
  const [pendingDuplicate, setPendingDuplicate] = useState<SkuProduct | null>(null);

  // The product being edited, or null when the form is in Add mode.
  const [editing, setEditing] = useState<SkuProduct | null>(null);

  // Search and paging are server-side (see useSkuCatalogue), so the query and
  // the page are request inputs now rather than things filtered locally.
  const { products, totalCount, isLoading, isFetching, refetch } = useSkuCatalogue({
    search: search.trim(),
    page,
  });

  // Only true when several PACB MIDs are in play and none is selected — see
  // useSkuMidScope. That is the one state where a row's own MID matters.
  const { needsMidChoice } = useSkuMidScope();

  const closeItemForm = (open: boolean) => {
    if (!open) setEditing(null);
    onAddItemOpenChange(open);
  };

  const { createSku } = useCreateSku();
  const { updateSku } = useUpdateSku();
  const { deleteSku } = useDeleteSku();
  const { duplicateSku } = useDuplicateSku();

  // Only the type tabs narrow locally. No pg-dashboard call site sends a type
  // filter to the catalogue search, so this filters the page the server
  // returned rather than the whole catalogue — which is why the pager below
  // still counts server rows.
  const tabRows =
    tab === "goods" || tab === "services"
      ? products.filter((product) => product.type === SKU_TAB_TYPE[tab])
      : products;

  // Both prices are edited in place, and the endpoint replaces the row, so the
  // whole record is resent with just this field changed.
  const onPriceChange = (id: string, field: SkuPriceField, next: number) => {
    const product = products.find((row) => row.id === id);
    if (!product) return;

    const payload = toSkuPayloadFromProduct(product, { [field]: next });
    if (!payload) {
      toast.error("Add a product type to this item before editing its price.");
      return;
    }

    updateSku({ id, rowMid: product.mid, payload });
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
    const payload = toSkuMutationPayload(values);
    // Null means validation didn't pass. The form gates submission on the same
    // check, so this is a guard rather than a path the UI can reach.
    if (!payload) return;

    if (editing) {
      updateSku({ id: editing.id, rowMid: editing.mid, payload });
      setEditing(null);
      onAddItemOpenChange(false);
      return;
    }

    createSku(payload);
    // A new item lands at the top of the unfiltered list, so a merchant sitting
    // on a type tab or a later page would otherwise watch the form close onto a
    // list the item isn't in.
    setTab("all");
    setPage(1);
    if (!keepOpen) onAddItemOpenChange(false);
  };

  const onConfirmDelete = (product: SkuProduct) => {
    deleteSku(product);
    setPendingDelete(null);
  };

  const onConfirmDuplicate = (product: SkuProduct) => {
    duplicateSku(product);
    setPendingDuplicate(null);
    // The copy lands at the top of the unfiltered list, so show the merchant
    // the view it is actually in — the same reason Add item resets these.
    setTab("all");
    setPage(1);
  };

  // One menu renderer feeding both the table's trailing actions column and
  // the card list, so a row's actions are identical at every width.
  const renderRowActions = (row: SkuProduct) => (
    <SkuRowActions
      product={row}
      onEdit={onEditItem}
      onDuplicate={setPendingDuplicate}
      onDelete={setPendingDelete}
    />
  );

  const columns = buildSkuColumns(onPriceChange, setPreviewProduct, needsMidChoice);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Switching tabs keeps the search query — a merchant looking for one product
  // shouldn't retype it to check which type it filed under. Only paging resets.
  const onTabChange = (value: string) => {
    setTab(value as SkuViewTab);
    setPage(1);
  };

  // Two different empty states, because they ask the merchant for two different
  // things. A catalogue with nothing in it and no query typed is a first run, and
  // wants the two ways to put something in it; anything else is a query or tab
  // that matched nothing, and wants to be told to widen it. pg-dashboard draws
  // the same distinction.
  const isFirstRun = !isLoading && totalCount === 0 && !search.trim();
  const emptyTitle = "No products found";
  const emptyDescription = "Try a different search or switch tabs";

  return (
    // Tab bar, search, and the table share one bordered surface, matching the
    // Transactions page: DataTable's own border/radius are neutralised
    // (rounded-none border-0) since this wrapper draws them, and a border-b
    // under each control row stands in for the separators between them.
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Three tabs, one selected view: the whole catalogue, or one product
          type. */}
      <div className="border-b border-border px-4 pt-3">
        <UnderlineTabs tabs={SKU_VIEW_TABS} value={tab} onValueChange={onTabChange} />
      </div>

      {/* Search and refresh — no Report, no Reorder Columns, no filter chips. */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={SKU_SEARCH_HINTS}
          ariaLabel="Search products by name or HSN/SAC"
          className="w-full sm:w-56"
        />

        {/* Every mutation already invalidates the catalogue, so this is for
            changes made elsewhere — another tab, or another member of the team.
            Spinning the glyph on isFetching (not isLoading) is what makes a
            press over existing rows visibly do something. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Refresh products"
          isLoading={false}
          disabled={isFetching}
          leftIcon={
            <Icon name="refresh" className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          }
          onClick={refetch}
          className="ml-auto shrink-0"
        >
          Refresh
        </Button>
      </div>

      {/* Desktop (lg+): the full table. The overflow menu rides `rowAction`,
          not a column — DataTable renders that slot in a zero-width cell stuck
          to the right edge of the viewport. That's what keeps it pinned right
          and reachable while the six data columns scroll horizontally under
          it, out of their widths, and out of any future column reordering.
          It floats over the row rather than sitting in the flow, so it can
          overlap the trailing column's text; the secondary button's own fill
          and border are what keep it legible there.

          DataTable reveals that slot on row hover only (opacity-0 on a span
          it owns). A child can't undo a parent's opacity, so the override is
          applied here, scoped to this table's action cell — `td.sticky` is
          that zero-width cell, and the descendant selector outranks the bare
          `opacity-0` class without needing !important. z-[2] lifts it above
          the row's own cells so it always paints on top. */}
      {isFirstRun ? (
        <EmptyState
          title="No items yet"
          description="Add items to your catalog to pull them into invoices."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
                onClick={onImport}
              >
                Import from a file
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                onClick={() => onAddItemOpenChange(true)}
              >
                Add item
              </Button>
            </div>
          }
          className="py-12"
        />
      ) : (
        <>
          <DataTable
            className={cn(
              "hidden rounded-none border-0 lg:block",
              "[&_td.sticky]:z-[2] [&_td.sticky>span]:opacity-100"
            )}
            columns={columns}
            data={tabRows}
            isLoading={isLoading}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            rowKey={(row) => row.id}
            rowAction={renderRowActions}
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
            rows={tabRows}
            isLoading={isLoading}
            rowAction={renderRowActions}
            onPreview={setPreviewProduct}
            page={page}
            onPageChange={setPage}
            totalRows={totalCount}
            pageSize={SKU_PAGE_LIMIT}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </>
      )}

      {/* Read-only. Deliberately carries no actions — Edit, Duplicate, and
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

      {/* Neutral twin of the delete dialog: Duplicate confirms too, because its
          result lands somewhere the merchant may not be looking. */}
      <DuplicateSkuDialog
        product={pendingDuplicate}
        onOpenChange={(open) => !open && setPendingDuplicate(null)}
        onConfirm={onConfirmDuplicate}
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
