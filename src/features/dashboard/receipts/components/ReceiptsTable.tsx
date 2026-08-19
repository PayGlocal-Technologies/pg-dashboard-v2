"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui";
import { cn } from "@/lib/utils";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { type DateRangeValue } from "@/components/common/filters/FilterChips";
import { RECEIPT_COLUMNS, ReceiptDownloadAction } from "@/features/dashboard/receipts/columns";
import { ReceiptCardList } from "@/features/dashboard/receipts/components/ReceiptCardList";
import { ReceiptFilterChips } from "@/features/dashboard/receipts/components/ReceiptFilterChips";
import { MOCK_RECEIPTS } from "@/features/dashboard/receipts/mock-data";
import { filterReceipts, formatReceiptMonth } from "@/features/dashboard/receipts/utils";
import {
  DEFAULT_RECEIPT_PRODUCT,
  RECEIPTS_PAGE_LIMIT,
  RECEIPT_PRODUCT_LABEL,
  RECEIPT_PRODUCT_TABS,
  RECEIPT_SEARCH_ARIA_LABEL,
  RECEIPT_SEARCH_HINTS,
} from "@/features/dashboard/receipts/constants";
import type { Receipt, ReceiptProduct } from "@/features/dashboard/receipts/types";

const EMPTY_DATE_RANGE: DateRangeValue = { from: "", to: "" };

/**
 * The receipts table: product tabs, search/filter controls, and the rows
 * themselves, all inside one bordered surface.
 *
 * Structurally a copy of SkuTable — same container (overflow-hidden rounded-xl
 * border border-border bg-card), same tab row, same controls row, same DataTable
 * configuration with its own border/radius neutralised, same card list below
 * `lg`. A border-b under each of the first two rows stands in for the divider
 * that would otherwise separate them, so no rule is drawn that the layout
 * doesn't already need.
 *
 * Unlike SkuTable, the controls row carries no trailing action. Downloading is
 * per receipt, not per table — each row's own pinned download icon (and each
 * card's, below `lg`) fetches that month's document, so there is nothing a
 * single button at the top could unambiguously download.
 *
 * The one real difference from SkuTable is what the tabs do. There, they filter
 * the catalogue by product type — something the chips could do too. Here they
 * select which product's receipts are on screen at all: the page's context, not
 * one more axis on the same list. The columns don't change with them (see
 * RECEIPT_COLUMNS); only the rows do.
 *
 * There is no receipts endpoint yet, so rows come from MOCK_RECEIPTS and every
 * filter is applied client-side in filterReceipts. When the endpoint lands,
 * replace that call with a request body (mirroring buildTxnRequestBody) and a
 * usePostQuery call; the tabs, chips and columns need no changes.
 */
export function ReceiptsTable() {
  const [product, setProduct] = useState<ReceiptProduct>(DEFAULT_RECEIPT_PRODUCT);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(EMPTY_DATE_RANGE);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      filterReceipts(MOCK_RECEIPTS, {
        product,
        search,
        dateRange,
        statusFilters,
      }),
    [product, search, dateRange, statusFilters]
  );

  const totalCount = filtered.length;

  // The mock source holds every product's receipts at once, so the page slice is
  // taken here. Against a real endpoint this whole `useMemo` disappears: the
  // request returns one page and `filtered` is already it.
  const pageRows = useMemo(() => {
    const start = (page - 1) * RECEIPTS_PAGE_LIMIT;
    return filtered.slice(start, start + RECEIPTS_PAGE_LIMIT);
  }, [filtered, page]);

  // Every control that changes what matches also returns to page 1 — otherwise a
  // merchant filtering while on page 3 lands on an empty page of a shorter list.
  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Switching products keeps the search query and both filters, the same way
  // SkuTable keeps its search across type tabs: a merchant chasing one invoice ID
  // shouldn't retype it to check which product it was raised under, and a month
  // range and a status mean the same thing in all three tabs. Only the page
  // resets, since the new tab's list is a different length.
  const onProductChange = (value: string) => {
    setProduct(value as ReceiptProduct);
    setPage(1);
  };

  // One handler for both the table's pinned action and the card list's, so a tap
  // and a click fetch the same document. A receipt is addressed by product and
  // month — one document for the whole month, never one per transaction inside it
  // — which is exactly what the row already carries.
  const onDownloadReceipt = (row: Receipt) => {
    // TODO: wire up once a receipt-document endpoint exists — the same gap the
    // Transactions and MCA Links tables' own Report buttons have. Per CLAUDE.md
    // the URL and payload must be confirmed against pg-dashboard rather than
    // inferred, so nothing is requested yet.
    toast.message(
      `Download the ${RECEIPT_PRODUCT_LABEL[row.product]} receipt for ${formatReceiptMonth(row.periodMonth)}`,
      { description: "Receipt downloads aren't connected to the backend yet." }
    );
  };

  // Each instance owns its own open-popover state, which is why the two control
  // rows below can both render one: see ReceiptFilterChips' own note on why
  // lifting that state breaks the hidden copy.
  const filterChips = (
    <ReceiptFilterChips
      dateRange={dateRange}
      onDateRangeChange={(next) => {
        setDateRange(next);
        setPage(1);
      }}
      statusFilters={statusFilters}
      onStatusFiltersChange={(next) => {
        setStatusFilters(next);
        setPage(1);
      }}
    />
  );

  const searchInput = (
    <RotatingSearchInput
      value={search}
      onSearch={onSearch}
      words={RECEIPT_SEARCH_HINTS}
      ariaLabel={RECEIPT_SEARCH_ARIA_LABEL[product]}
      className="w-full lg:w-56"
    />
  );

  const emptyTitle = "No receipts found";
  const emptyDescription = "Try adjusting your filters or search query";

  return (
    // Tab bar, controls, and the table share one bordered surface, matching
    // SkuTable and the Transactions page: DataTable's own border/radius are
    // neutralised below (rounded-none border-0) since this wrapper draws them.
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Product context: which product's receipts are on screen. No bottom
          padding here — TabsTrigger's own py-2.5 already clears the border-b
          below before the sliding indicator meets it.

          scrollbar-none + overflow-x-auto so the three labels stay on one line
          and scroll on a narrow phone instead of wrapping or pushing the page
          itself sideways. UnderlineTabs measures its indicator from the DOM, so
          it tracks the selected tab at any scroll offset. */}
      <div className="scrollbar-none overflow-x-auto border-b border-border px-4 pt-3">
        <UnderlineTabs
          tabs={RECEIPT_PRODUCT_TABS}
          value={product}
          onValueChange={onProductChange}
        />
      </div>

      {/* Desktop (lg+): search and the filter chip group share one row, sitting
          together on the left with tight spacing so the chips read as
          immediately following search. Nothing is pushed to the right — the only
          action on this screen belongs to individual rows. */}
      <div className="hidden flex-wrap items-center gap-2 border-b border-border px-4 py-3 lg:flex">
        {searchInput}
        {/* Filter group: Date and Status read as one cohesive filtering
            control, so the gap within it is tighter than the gap separating it
            from search. */}
        <div className="flex flex-wrap items-center gap-1.5">{filterChips}</div>
      </div>

      {/* Tablet + mobile (below lg): search takes the full width on its own row,
          then the chips beneath it on a single line that scrolls horizontally —
          there's no room for both beside search on a phone, and wrapping them
          would push the table down a row at a time. Its scrollbar is hidden
          (scrollbar-none, the same utility the Transactions controls use) so the
          chips read as a row of controls rather than a scroll region: the gesture
          still works, there's just no persistent indicator. The scrolling is
          inside this row, so the page itself never scrolls sideways. */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:hidden">
        {searchInput}
        <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
          {filterChips}
        </div>
      </div>

      {/* Desktop (lg+): the full table. `tableLayout="content"` sizes every
          column to its content and scrolls inside the table's own box once the
          columns outgrow it, so a narrow desktop window keeps usable column
          widths instead of squeezing all five — and never scrolls the page.

          The download action rides `rowAction`, not a column: DataTable renders
          that slot in a zero-width cell stuck to the right edge of the viewport,
          so it stays pinned right and reachable while the five data columns
          scroll horizontally underneath it, out of their widths and out of any
          future column reordering. It floats over the row rather than sitting in
          the flow, so it can overlap the trailing column's text; the outline
          button's own fill and border are what keep it legible there.

          DataTable reveals that slot on row hover only (opacity-0 on a span it
          owns), which is wrong for a download — it has to be there before you
          know to look for it. A child can't undo a parent's opacity, so the
          override is applied here, scoped to this table's action cell:
          `td.sticky` is that zero-width cell, and the descendant selector
          outranks the bare `opacity-0` class without needing !important. z-[2]
          lifts it above the row's own cells so it always paints on top. The same
          pair of overrides SkuTable uses for its row menu. */}
      <DataTable
        className={cn(
          "hidden rounded-none border-0 lg:block",
          "[&_td.sticky]:z-[2] [&_td.sticky>span]:opacity-100"
        )}
        columns={RECEIPT_COLUMNS}
        data={pageRows}
        // No endpoint behind this yet (see MOCK_RECEIPTS), so nothing is ever in
        // flight. Plumbed rather than dropped so the loading state is already
        // wired when the query lands.
        isLoading={false}
        skeletonRows={8}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        rowKey={(row) => row.gid}
        pageSize={RECEIPTS_PAGE_LIMIT}
        totalRows={totalCount}
        page={page}
        onPageChange={setPage}
        rowAction={(row) => <ReceiptDownloadAction row={row} onDownload={onDownloadReceipt} />}
        tableLayout="content"
        density="compact"
      />

      {/* Tablet + mobile (below lg): the same page's rows as cards. `pageRows` is
          already just this page's slice — the same array DataTable's controlled
          `page`/`data` above consumes — so this re-slices nothing. */}
      <ReceiptCardList
        className="lg:hidden"
        rows={pageRows}
        isLoading={false}
        onDownload={onDownloadReceipt}
        page={page}
        onPageChange={setPage}
        totalRows={totalCount}
        pageSize={RECEIPTS_PAGE_LIMIT}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}
