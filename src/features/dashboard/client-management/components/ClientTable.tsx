"use client";

import { useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/ui";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
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
import { ClientDetailsPage } from "@/features/dashboard/client-management/components/ClientDetailsPage";
import { ClientFormModal } from "@/features/dashboard/client-management/components/ClientFormModal";
import { toClientFields } from "@/features/dashboard/client-management/schemas";
import type { Client, ClientFormValues } from "@/features/dashboard/client-management/types";
import {
  CLIENT_PAGE_LIMIT,
  CLIENT_SEARCH_HINTS,
  clientCountryOptions,
  currencyForCountry,
} from "@/features/dashboard/client-management/constants";
import { MOCK_CLIENTS } from "@/features/dashboard/client-management/mock-data";

// Sets scrollTop via a standalone function (rather than inline in a handler)
// since the element comes from useContentAreaElement, and React Compiler's
// lint forbids mutating a hook-returned value directly. Same helper, same
// reason, as McaTransactionTable's.
function restoreScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}

interface ClientTableProps {
  /** Owned by the page, because the "Add client" button that opens it lives in
   *  the page header while every row this creates lives down here. */
  addClientOpen: boolean;
  onAddClientOpenChange: (open: boolean) => void;
}

export function ClientTable({ addClientOpen, onAddClientOpenChange }: ClientTableProps) {
  const contentEl = useContentAreaElement();
  const [scrollPosition, setScrollPosition] = useState(0);

  // Clients created through the Add client form, newest first. Layered over
  // MOCK_CLIENTS rather than merged into it, the same arrangement SkuTable
  // uses for created items: once a real endpoint replaces the mock book, this
  // becomes the pending-write set rather than a divergent copy of the data.
  const [createdClients, setCreatedClients] = useState<Client[]>([]);
  // Counter, not Math.random/Date.now — both are barred during render and this
  // only ever increments inside the submit handler anyway.
  const nextClientIdRef = useRef(0);

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

  // The client whose details are being viewed. Held as an id (not the row) so
  // it survives the source list changing underneath it once a real endpoint
  // replaces MOCK_CLIENTS. The drawer and the expanded page are two
  // presentations of that same selection, so they share it: drawerOpen and
  // detailsOpen are mutually exclusive — a row click opens the drawer, and
  // Expand hands the same client off to the page.
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Set only when Expand was pressed on a transaction inside the client
  // drawer: the client expands to its full page and that transaction opens
  // expanded there, since a drawer has nowhere to show a full-page
  // transaction. Null for an ordinary client expand.
  const [expandTxnId, setExpandTxnId] = useState<string | null>(null);

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
  // Newly created clients lead the book, so one just added is the first row
  // rather than buried wherever the seeded order would have put it.
  const sourceRows = [...createdClients, ...MOCK_CLIENTS];

  const filteredRows = sourceRows.filter((client) => {
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

  const detailsRow = sourceRows.find((c) => c.id === detailsId) ?? null;

  // The Country chip offers only countries the merchant actually has clients
  // in, so it can never narrow to an empty table (see clientCountryOptions).
  // Built from sourceRows, so a client added in a country nobody else is in
  // brings its own filter option with it.
  const countryOptions = clientCountryOptions(sourceRows);

  // Both Add client and Save and add another land here; `keepOpen` is the only
  // difference between them, and the modal itself handles resetting the form.
  const onSubmitClient = (values: ClientFormValues, keepOpen: boolean) => {
    const fields = toClientFields(values);
    // Null means validation didn't pass. The form gates submission on the same
    // check, so this is a guard rather than a path the UI can reach.
    if (!fields) return;

    setCreatedClients((prev) => [
      {
        id: `cli-new-${nextClientIdRef.current++}`,
        ...fields,
        // A brand-new client has no billing history: no transactions, so every
        // figure derived from them — Total received, and all three invoice
        // counts — comes out empty on its own, with nothing to seed here. The
        // currency is only the denomination those figures will be shown in once
        // there are any, and follows the client's own country.
        currency: currencyForCountry(fields.countryIso2),
      },
      ...prev,
    ]);
    // Otherwise the new row can land outside the current filters or on a page
    // the merchant isn't looking at, and the form appears to have done nothing.
    setSearch("");
    setEmailFilter("");
    setCountryFilters([]);
    setDateRange({ from: "", to: "" });
    setPage(1);
    if (!keepOpen) onAddClientOpenChange(false);
  };

  // Clicking a row opens the drawer, not the full page. The table stays
  // mounted underneath it, so filters, paging, and scroll are untouched for
  // the whole time the drawer is open and after it closes.
  const openDetails = (row: { id: string }) => {
    setDetailsId(row.id);
    setDrawerOpen(true);
  };

  // Expand hands the drawer's current client off to the full page. detailsId
  // already holds that selection, so the page renders exactly what the drawer
  // was showing. The table's scroll position is captured here (rather than
  // when the drawer opened) because this is the point the table actually
  // leaves the screen and Back has to restore it.
  const expandToPage = (client: { id: string }) => {
    if (contentEl) setScrollPosition(contentEl.scrollTop);
    setDetailsId(client.id);
    setExpandTxnId(null);
    setDrawerOpen(false);
    setDetailsOpen(true);
  };

  // Same expand, plus the transaction the drawer was showing, so it opens
  // expanded on the client's page rather than the action doing nothing from
  // inside a drawer.
  const expandToPageWithTransaction = (client: { id: string }, transaction: { gid: string }) => {
    if (contentEl) setScrollPosition(contentEl.scrollTop);
    setDetailsId(client.id);
    setExpandTxnId(transaction.gid);
    setDrawerOpen(false);
    setDetailsOpen(true);
  };

  // Collapse reverses Expand: closes the full page and reopens the same client
  // in the drawer. Deliberately doesn't touch detailsId, so whichever client
  // was showing stays showing, and the scroll-restore effect below puts the
  // table back where expandToPage found it.
  const collapseToDrawer = () => {
    setDetailsOpen(false);
    setDrawerOpen(true);
  };

  // Restores the table's scroll position after the details page unmounts and
  // the table re-renders in its place — deferred to an effect (rather than set
  // inline in the handler) so it runs after the table's own content is back in
  // the DOM, not while the details page is still on screen.
  useEffect(() => {
    if (!detailsOpen && contentEl) {
      restoreScrollTop(contentEl, scrollPosition);
    }
  }, [detailsOpen, contentEl, scrollPosition]);

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

  // The details page replaces the table in place (same component instance,
  // same closed-over search/filter/page state) rather than overlaying it —
  // this is what makes Back restore the table's previous state for free, the
  // same arrangement McaTransactionTable uses for transactions.
  if (detailsOpen && detailsRow) {
    return (
      <ClientDetailsPage
        client={detailsRow}
        onBack={() => setDetailsOpen(false)}
        onCollapse={collapseToDrawer}
        initialTransactionId={expandTxnId}
      />
    );
  }

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
      <ClientDetailsDrawer
        client={detailsRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onExpand={expandToPage}
        onExpandTransaction={expandToPageWithTransaction}
      />

      <ClientFormModal
        open={addClientOpen}
        onOpenChange={onAddClientOpenChange}
        onSubmit={onSubmitClient}
      />
    </div>
  );
}
