"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import {
  CountryFilterChip,
  DateFilterChip,
  EmailFilterChip,
  toEndOfDayMs,
  toStartOfDayMs,
} from "@/components/common/filters/FilterChips";
import { ReorderColumnsPopover } from "@/components/common/table/ReorderColumnsPopover";
import { reorderColumns } from "@/lib/utils/columns";
import { buildClientColumns } from "@/features/dashboard/client-management/columns";
import { ClientCardList } from "@/features/dashboard/client-management/components/ClientCardList";
import { ClientDetailsDrawer } from "@/features/dashboard/client-management/components/ClientDetailsDrawer";
import {
  CLIENT_PAGE_LIMIT,
  CLIENT_SEARCH_HINTS,
  clientCountryOptions,
} from "@/features/dashboard/client-management/constants";
import { MOCK_CLIENTS } from "@/features/dashboard/client-management/mock-data";

export function ClientTable() {
  const [search, setSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [page, setPage] = useState(1);

  // null until the merchant actually drags a column, at which point DataTable
  // renders that order instead of buildClientColumns' own default.
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  // Which of the Email/Country/Creation date popovers is open, if any: shared
  // so opening one closes whichever other one was open.
  const [openChip, setOpenChip] = useState<"email" | "country" | "date" | null>(null);

  // The client whose details panel is open. Held as an id (not the row) so it
  // survives the source list changing underneath it once a real endpoint
  // replaces MOCK_CLIENTS.
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = search.trim().toLowerCase();
  const emailQuery = emailFilter.trim().toLowerCase();
  // yyyy-mm-dd → epoch ms, the same conversion the Transactions page applies
  // before handing a range to the server. Here it's compared client-side,
  // since there is no client endpoint to push the range into yet.
  const fromMs = dateRange.from ? toStartOfDayMs(dateRange.from) : undefined;
  const toMs = dateRange.to ? toEndOfDayMs(dateRange.to) : undefined;

  // Search and all three chips narrow the same list, and every one of them
  // resets paging (below), so this is derived during render rather than held
  // in state. Swapping in a real query means replacing the source array and
  // moving these predicates into the request body — the table itself doesn't
  // change.
  const filteredRows = MOCK_CLIENTS.filter((client) => {
    // Matches any of the three fields the placeholder cycles through
    // (CLIENT_SEARCH_HINTS), the same way the Transactions search spans
    // remitter/transaction ID/UTR: one box, no mode to pick, a hit on any of
    // them counts.
    if (
      query &&
      !client.businessName.toLowerCase().includes(query) &&
      !client.primaryContactName.toLowerCase().includes(query) &&
      !client.email.toLowerCase().includes(query)
    ) {
      return false;
    }
    // Substring, not an exact match: the useful case is narrowing to a
    // domain ("@northwind") as often as it is finding one address.
    if (emailQuery && !client.email.toLowerCase().includes(emailQuery)) return false;
    if (countryFilters.length && !countryFilters.includes(client.countryIso2)) return false;
    if (fromMs != null || toMs != null) {
      const createdMs = new Date(client.createdAt).getTime();
      if (fromMs != null && createdMs < fromMs) return false;
      if (toMs != null && createdMs > toMs) return false;
    }
    return true;
  });

  const totalCount = filteredRows.length;
  // Clamping here (rather than resetting page in every handler) covers every
  // way the row count can shrink, and is derived during render, so no effect
  // writes state back.
  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENT_PAGE_LIMIT));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * CLIENT_PAGE_LIMIT, safePage * CLIENT_PAGE_LIMIT);

  const detailsRow = MOCK_CLIENTS.find((c) => c.id === detailsId) ?? null;

  // The Country chip offers only countries the merchant actually has clients
  // in, so it can never narrow to an empty table (see clientCountryOptions).
  const countryOptions = clientCountryOptions(MOCK_CLIENTS);

  const openDetails = (row: { id: string }) => {
    setDetailsId(row.id);
    setDrawerOpen(true);
  };

  const baseColumns = buildClientColumns(openDetails);
  const columns = reorderColumns(baseColumns, columnOrder);
  const reorderableColumns = baseColumns.map((c) => ({
    key: c.key,
    label: typeof c.header === "string" ? c.header : c.key,
  }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  const emptyTitle = "No clients found";
  const emptyDescription = "Try adjusting your filters or search query";

  // Shared verbatim between the desktop and tablet/mobile control rows below
  // so the two can never drift out of sync. Just the chip elements, not their
  // wrapping div: desktop wraps them onto a new line if needed, while mobile
  // scrolls them horizontally on a single line instead, so each layout below
  // supplies its own container.
  const filterChips = (
    <>
      <EmailFilterChip
        value={emailFilter}
        onChange={(next) => {
          setEmailFilter(next);
          setPage(1);
        }}
        open={openChip === "email"}
        onOpenChange={(next) => setOpenChip(next ? "email" : null)}
        idPrefix="client-email"
        hint="Matches any part of the address, including the domain."
      />
      <CountryFilterChip
        options={countryOptions}
        value={countryFilters}
        onChange={(next) => {
          setCountryFilters(next);
          setPage(1);
        }}
        open={openChip === "country"}
        onOpenChange={(next) => setOpenChip(next ? "country" : null)}
      />
      <DateFilterChip
        label="Creation date"
        value={dateRange}
        onChange={(next) => {
          setDateRange(next);
          setPage(1);
        }}
        open={openChip === "date"}
        onOpenChange={(next) => setOpenChip(next ? "date" : null)}
      />
    </>
  );

  return (
    // Search/filters and the table share one bordered surface, matching the
    // Transactions and SKU pages: DataTable's own border/radius/background are
    // neutralised below (rounded-none border-0) since this wrapper draws them,
    // and a border-b under the control row stands in for the separator between
    // the two. No tab bar on this page — clients have no view axis to split on.
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Desktop (lg+): search, filter chips, and Reorder Columns all share one
          row, the reorder control pushed to the far right via ml-auto. */}
      <div className="hidden flex-wrap items-center gap-2 border-b border-border px-4 py-3 lg:flex">
        <RotatingSearchInput
          value={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          words={CLIENT_SEARCH_HINTS}
          ariaLabel="Search clients by business name, contact name, or email"
          className="w-40 sm:w-56"
        />

        <div className="flex flex-wrap items-center gap-1.5">{filterChips}</div>

        <div className="ml-auto flex items-center gap-2">
          <ReorderColumnsPopover
            columns={reorderableColumns}
            order={currentColumnOrder}
            onOrderChange={setColumnOrder}
            onReset={() => setColumnOrder(null)}
          />
        </div>
      </div>

      {/* Tablet + mobile (below lg): search on its own row, then the chips
          beneath it on a single line that scrolls horizontally, since there's
          no room to show all three next to search. Its scrollbar is hidden
          (scrollbar-none, the same utility the multi-currency carousel uses)
          so the chips read as a row of controls rather than a scroll region:
          the gesture still works, there's just no persistent indicator.

          No Reorder Columns at either width, matching the Transactions page:
          there's no table to reorder columns on below lg, just the card
          list. */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:hidden">
        <RotatingSearchInput
          value={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          words={CLIENT_SEARCH_HINTS}
          ariaLabel="Search clients by business name, contact name, or email"
          className="min-w-0 flex-1"
        />
        <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
          {filterChips}
        </div>
      </div>

      {/* Desktop (lg+): the full table, columns and all. */}
      <DataTable
        className="hidden rounded-none border-0 lg:block"
        columns={columns}
        data={pageRows}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        rowKey={(row) => row.id}
        pageSize={CLIENT_PAGE_LIMIT}
        totalRows={totalCount}
        page={safePage}
        onPageChange={setPage}
        tableLayout="content"
        density="compact"
      />

      {/* Tablet + mobile (below lg): the same page's rows as cards. */}
      <ClientCardList
        className="lg:hidden"
        rows={pageRows}
        isLoading={false}
        onOpenDetails={openDetails}
        page={safePage}
        onPageChange={setPage}
        totalRows={totalCount}
        pageSize={CLIENT_PAGE_LIMIT}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />

      {/* Rendered alongside the table (not in place of it) so closing it leaves
          the table's search, filters, and page exactly as they were. */}
      <ClientDetailsDrawer row={detailsRow} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
