"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { FilterChipsRow, type DateRangeValue } from "@/components/common/filters/FilterChips";
import { buildReceiptColumns } from "@/features/dashboard/receipts/columns";
import { ReceiptCardList } from "@/features/dashboard/receipts/components/ReceiptCardList";
import { MOCK_RECEIPTS } from "@/features/dashboard/receipts/mock-data";
import { filterReceipts, receiptCurrencyOptions } from "@/features/dashboard/receipts/utils";
import {
  DEFAULT_RECEIPT_PRODUCT,
  RECEIPTS_PAGE_LIMIT,
  RECEIPT_PRODUCT_TABS,
  RECEIPT_SEARCH_ARIA_LABEL,
  RECEIPT_SEARCH_HINTS,
  RECEIPT_STATUS_FILTERS,
} from "@/features/dashboard/receipts/constants";
import type { ReceiptProduct } from "@/features/dashboard/receipts/types";

const EMPTY_DATE_RANGE: DateRangeValue = { from: "", to: "" };

/**
 * The receipts table: product tabs, search/filter/Download controls, and the
 * rows themselves, all inside one bordered surface.
 *
 * Structurally a copy of SkuTable — same container (overflow-hidden rounded-xl
 * border border-border bg-card), same tab row, same controls row with the
 * trailing action pushed right by ml-auto, same DataTable configuration with its
 * own border/radius neutralised, same card list below `lg`. A border-b under
 * each of the first two rows stands in for the divider that would otherwise
 * separate them, so no rule is drawn that the layout doesn't already need.
 *
 * The one real difference from SkuTable is what the tabs do. There, they filter
 * by product type; here they select which product's receipts are on screen at
 * all, so they change the column set as well as the rows — see
 * buildReceiptColumns, where Country exists only for MCA.
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
  const [currencyFilters, setCurrencyFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Only the currencies this product's receipts are actually raised in, so the
  // chip can't offer a filter that matches nothing. Computed before the other
  // filters are applied — narrowing the currency list as the merchant filters
  // would take away the option they just chose.
  const currencyOptions = useMemo(
    () => receiptCurrencyOptions(MOCK_RECEIPTS.filter((r) => r.product === product)),
    [product]
  );

  const filtered = useMemo(
    () =>
      filterReceipts(MOCK_RECEIPTS, {
        product,
        search,
        dateRange,
        statusFilters,
        currencyFilters,
      }),
    [product, search, dateRange, statusFilters, currencyFilters]
  );

  const totalCount = filtered.length;

  // The mock source holds every product's receipts at once, so the page slice is
  // taken here. Against a real endpoint this whole `useMemo` disappears: the
  // request returns one page and `filtered` is already it.
  const pageRows = useMemo(() => {
    const start = (page - 1) * RECEIPTS_PAGE_LIMIT;
    return filtered.slice(start, start + RECEIPTS_PAGE_LIMIT);
  }, [filtered, page]);

  const columns = buildReceiptColumns(product);

  // Every control that changes what matches also returns to page 1 — otherwise a
  // merchant filtering while on page 3 lands on an empty page of a shorter list.
  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Switching products keeps the search query and the Date/Status filters, the
  // same way SkuTable keeps its search across type tabs: a merchant chasing one
  // invoice ID shouldn't retype it to check which product it was raised under,
  // and both of those filters mean the same thing in all three tabs.
  //
  // Currency is the exception, and is cleared. Its options are derived from the
  // selected product's own rows (see currencyOptions), so a code carried across
  // could be one the new tab has no option for at all — an active filter the
  // merchant can see the effect of but not find, let alone clear.
  const onProductChange = (value: string) => {
    setProduct(value as ReceiptProduct);
    setCurrencyFilters([]);
    setPage(1);
  };

  const handleDownload = () => {
    // TODO: wire up once a receipts export endpoint exists — the same gap the
    // Transactions and MCA Links tables' own Report buttons have.
    toast.message("Download receipts", {
      description: "Receipt exports aren't connected to the backend yet.",
    });
  };

  // One button, rendered once per control row (desktop and compact), so the
  // action is identical at every width — labelled rather than collapsed into an
  // icon or an overflow menu, matching how the Transactions table keeps its
  // Report button labelled on mobile.
  const downloadButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
      onClick={handleDownload}
      className="ml-auto shrink-0"
    >
      Download
    </Button>
  );

  // Each instance owns its own open-popover state, which is why the two control
  // rows below can both render one: see FilterChipsRow's own note on why lifting
  // that state breaks the hidden copy.
  const filterChips = (
    <FilterChipsRow
      dateRange={dateRange}
      onDateRangeChange={(next) => {
        setDateRange(next);
        setPage(1);
      }}
      statusOptions={RECEIPT_STATUS_FILTERS}
      statusFilters={statusFilters}
      onStatusFiltersChange={(next) => {
        setStatusFilters(next);
        setPage(1);
      }}
      currencyOptions={currencyOptions}
      currencyFilters={currencyFilters}
      onCurrencyFiltersChange={(next) => {
        setCurrencyFilters(next);
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
      className="min-w-0 flex-1 lg:w-56 lg:flex-none"
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

      {/* Desktop (lg+): search, the filter chip group, and Download all share one
          row. Search and the chips sit together on the left with tight spacing —
          the chips read as immediately following search — while ml-auto on the
          button pushes it to the far right rather than justify-between spreading
          the controls into a wide gap. */}
      <div className="hidden flex-wrap items-center gap-2 border-b border-border px-4 py-3 lg:flex">
        {searchInput}
        {/* Filter group: Date, Status and Currency read as one cohesive
            filtering control, so the gap within it is tighter than the gap
            separating it from search. */}
        <div className="flex flex-wrap items-center gap-1.5">{filterChips}</div>
        {downloadButton}
      </div>

      {/* Tablet + mobile (below lg): search shrinks to whatever room Download
          leaves it on a row that never wraps, so the button stays visible and
          labelled at every width instead of moving into a menu. The chips go on
          their own row beneath, on a single line that scrolls horizontally —
          there's no room for all three beside search, and wrapping them would
          push the table down a row at a time. Its scrollbar is hidden
          (scrollbar-none, the same utility the Transactions controls use) so the
          chips read as a row of controls rather than a scroll region: the gesture
          still works, there's just no persistent indicator. The scrolling is
          inside this row, so the page itself never scrolls sideways. */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:hidden">
        <div className="flex flex-nowrap items-center gap-2">
          {searchInput}
          {downloadButton}
        </div>
        <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
          {filterChips}
        </div>
      </div>

      {/* Desktop (lg+): the full table. `tableLayout="content"` sizes every
          column to its content and scrolls inside the table's own box once the
          columns outgrow it, so a narrow desktop window keeps usable column
          widths instead of squeezing all five — and never scrolls the page. */}
      <DataTable
        className="hidden rounded-none border-0 lg:block"
        columns={columns}
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
        tableLayout="content"
        density="compact"
      />

      {/* Tablet + mobile (below lg): the same page's rows as cards. `pageRows` is
          already just this page's slice — the same array DataTable's controlled
          `page`/`data` above consumes — so this re-slices nothing. */}
      <ReceiptCardList
        className="lg:hidden"
        rows={pageRows}
        product={product}
        isLoading={false}
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
