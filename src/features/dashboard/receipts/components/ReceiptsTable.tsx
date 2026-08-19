"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { FilterChipsRow, type DateRangeValue } from "@/components/common/filters/FilterChips";
import { buildReceiptColumns } from "@/features/dashboard/receipts/columns";
import { ReceiptCardList } from "@/features/dashboard/receipts/components/ReceiptCardList";
import { MOCK_RECEIPTS } from "@/features/dashboard/receipts/mock-data";
import { filterReceipts, receiptCurrencyOptions } from "@/features/dashboard/receipts/utils";
import {
  RECEIPTS_PAGE_LIMIT,
  RECEIPT_SEARCH_ARIA_LABEL,
  RECEIPT_SEARCH_HINTS,
  RECEIPT_STATUS_FILTERS,
} from "@/features/dashboard/receipts/constants";
import type { ReceiptProduct } from "@/features/dashboard/receipts/types";

const EMPTY_DATE_RANGE: DateRangeValue = { from: "", to: "" };

/**
 * The receipts table, plus the search and filter controls above it.
 *
 * Structurally a sibling of McaLinkTable — same controls container, same chips,
 * same DataTable configuration, same card list below `lg` as the Transactions
 * and SKU tables — so every table in the product reads as one family. Two
 * things are its own:
 *
 * 1. The product it shows is a prop, not internal state. The page's tab bar owns
 *    that selection because it is page-level context (which product's receipts
 *    am I looking at), not one more filter axis on this table. The page also
 *    keys this component on it, so switching products resets search, filters and
 *    the page number rather than carrying one product's query onto another's rows.
 * 2. Three of its column headers are named by that product — see
 *    RECEIPT_COLUMN_LABELS.
 *
 * There is no receipts endpoint yet, so rows come from MOCK_RECEIPTS and every
 * filter is applied client-side in filterReceipts. When the endpoint lands,
 * replace that call with a request body and a usePostQuery; nothing here needs
 * to change.
 */
export function ReceiptsTable({ product }: { product: ReceiptProduct }) {
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

  // The mock source holds every product's receipts at once, so the page slice
  // is taken here. Against a real endpoint this whole `useMemo` disappears:
  // the request returns one page and `filtered` is already it.
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

  // Each instance owns its own open-popover state, which is why the desktop and
  // compact control rows below can both render one: see FilterChipsRow's own
  // note on why lifting that state breaks the hidden copy.
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

  const emptyTitle = "No receipts found";
  const emptyDescription = "Try adjusting your filters or search query";

  return (
    <div className="space-y-4">
      {/* Controls container: search sits at the left with the filter chip group
          immediately after it, tight enough that the chips read as following
          search rather than floating away from it. No Report or Reorder Columns
          group, so nothing is pushed to the far right. */}
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        {/* Desktop (lg+): search and the chips share one row. */}
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <RotatingSearchInput
            value={search}
            onSearch={onSearch}
            words={RECEIPT_SEARCH_HINTS[product]}
            ariaLabel={RECEIPT_SEARCH_ARIA_LABEL[product]}
            className="w-56"
          />
          {/* Filter group: Date, Status and Currency read as one cohesive
              filtering control, so the gap within it is tighter than the gap
              separating it from search. */}
          <div className="flex flex-wrap items-center gap-1.5">{filterChips}</div>
        </div>

        {/* Tablet + mobile (below lg): search takes the full width on its own
            row, then the chips below it on a single line that scrolls
            horizontally — there is no room to show all three beside search, and
            wrapping them would push the table down a row at a time. The
            scrollbar is hidden (scrollbar-none, the same utility the
            multi-currency account carousel and the Transactions controls use) so
            the chips read as a row of controls rather than a scroll region: the
            gesture still works, there is just no persistent indicator. The
            scrolling is inside this row, so the page itself never scrolls
            sideways. */}
        <div className="flex flex-col gap-2 lg:hidden">
          <RotatingSearchInput
            value={search}
            onSearch={onSearch}
            words={RECEIPT_SEARCH_HINTS[product]}
            ariaLabel={RECEIPT_SEARCH_ARIA_LABEL[product]}
            className="w-full"
          />
          <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
            {filterChips}
          </div>
        </div>
      </div>

      {/* Desktop (lg+): the full table. `tableLayout="content"` sizes every
          column to its own content and scrolls inside the table's own box once
          the columns outgrow it, so a narrow desktop window keeps usable column
          widths instead of squeezing all eight and never scrolls the page. */}
      <DataTable
        className="hidden lg:block"
        columns={columns}
        data={pageRows}
        // No endpoint behind this yet (see MOCK_RECEIPTS), so nothing is ever
        // in flight. Plumbed rather than dropped so the loading state is
        // already wired when the query lands.
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

      {/* Tablet + mobile (below lg): the same page's rows as cards. `pageRows`
          is already just this page's slice — the same array DataTable's
          controlled `page`/`data` above consumes — so this re-slices nothing.
          p-0 drops the list's own padding: each card draws its own border, so
          it sits directly on the page rather than inside a second surface. */}
      <ReceiptCardList
        className="lg:hidden p-0"
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
