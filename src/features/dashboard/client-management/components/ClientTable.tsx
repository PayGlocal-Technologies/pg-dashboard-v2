"use client";

import { useEffect, useRef, useState } from "react";
import { Button, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import {
  CountryFilterChip,
  type CountryFilterOption,
} from "@/components/common/filters/FilterChips";
import { ReorderColumnsPopover } from "@/components/common/ReorderColumnsPopover";
import { reorderColumns } from "@/lib/utils/columns";
import { buildClientColumns } from "@/features/dashboard/client-management/columns";
import { ClientCardList } from "@/features/dashboard/client-management/components/ClientCardList";
import { ClientDetailsDrawer } from "@/features/dashboard/client-management/components/ClientDetailsDrawer";
import { ClientDetailsPage } from "@/features/dashboard/client-management/components/ClientDetailsPage";
import { ClientFormModal } from "@/features/dashboard/client-management/components/ClientFormModal";
import {
  useClient,
  useClientContractDelete,
  useClientContractUpload,
  useClientContractView,
  useClientCountryMap,
  useClients,
  useCreateClient,
  useUpdateClient,
} from "@/features/dashboard/client-management/hooks";
import {
  toClientApiPayload,
  toClientFormValues,
  useClientPathMid,
} from "@/features/dashboard/client-management/hooks";
import type { Client, ClientFormValues } from "@/features/dashboard/client-management/types";
import {
  CLIENT_PAGE_LIMIT,
  CLIENT_SEARCH_HINTS,
  countryOptionsFromMap,
  currencyForCountry,
} from "@/features/dashboard/client-management/constants";

// Sets scrollTop via a standalone function (rather than inline in a handler)
// since the element comes from useContentAreaElement, and React Compiler's
// lint forbids mutating a hook-returned value directly. Same helper, same
// reason, as McaTransactionTable's.
function restoreScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}

/**
 * The Country chip, with its popover state held per instance rather than lifted
 * to the table. Country is the only filter this list has (it is the only one
 * pg-dashboard's own client list has besides its text search, which v2's search
 * box already is), so there is no second chip for a shared state to coordinate
 * with — and one open state shared across the two control rows is exactly what
 * stopped the chip working. See renderFilterChips below.
 */
function ClientFilterChips({
  options,
  value,
  onChange,
}: {
  options: CountryFilterOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <CountryFilterChip
      options={options}
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={setOpen}
    />
  );
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

  // The id of the client being edited, or null when the form is in Add mode.
  //
  // An id rather than the row, because the form is populated from the by-id
  // record and not from the list: the search response is a subset, so a form
  // seeded from a row opens missing whatever the list does not carry.
  // pg-dashboard's own form does exactly this — it refetches
  // getMcaClientById(mid, selectedRecord.id) on open and calls setFieldsValue
  // with that response, showing its drawer in a loading state until it lands.
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // null until the merchant actually drags a column, at which point DataTable
  // renders that order instead of buildClientColumns' own default.
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);

  // The client whose details are being viewed. Held as an id (not the row) so
  // it survives the source list changing underneath it once a real endpoint
  // replaces MOCK_CLIENTS. The drawer and the expanded page are two
  // presentations of that same selection, so they share it: drawerOpen and
  // detailsOpen are mutually exclusive — a row click opens the drawer, and
  // Expand hands the same client off to the page.
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Both filters and the page are request inputs, so the rows that arrive are
  // exactly the rows to draw and totalCount always describes the same set they
  // came from. See useClients.
  const { clients, totalCount, isLoading, isFetching, refetch } = useClients({
    search: search.trim(),
    countries: countryFilters,
    page,
  });

  const pageRows = clients;

  // The full record for whichever client is being viewed. The list response is a
  // subset of it, so the details view refetches by id — the same thing
  // pg-dashboard's own form does before it can populate its fields. The row is
  // kept as a fallback so the drawer opens with content immediately rather than
  // empty for the length of a request.
  const { client: fullClient } = useClient(detailsId);
  const detailsRow = fullClient ?? clients.find((c) => c.id === detailsId) ?? null;

  // The same by-id fetch for the edit form. A second useClient call rather than a
  // shared one because the two selections are independent — Edit is reachable from
  // a row whose drawer was never opened — and react-query caches by key, so
  // editing the client already open in the drawer costs no extra request.
  //
  // Only the fetched record seeds the form (never the row), which is why the modal
  // is held in a loading state until it arrives: a form mounted on partial values
  // and re-seeded when the rest landed would either discard what the merchant had
  // begun typing or silently keep the partial values.
  const { client: editingClient, isLoading: isEditingClientLoading } = useClient(editingId);
  const editingRow = editingClient ?? clients.find((c) => c.id === editingId) ?? null;

  // Every country the map knows, not just the ones on this page: with the list
  // server-paged, options derived from the loaded rows would change as the
  // merchant pages (see countryOptionsFromMap). The option *values* are the map's
  // own keys — country display names, which is how this endpoint keys them and so
  // what the request has to filter on; each option carries its ISO2 separately,
  // for the flag beside the name.
  const countryMap = useClientCountryMap();
  // The loaded rows are the fallback source when the reference endpoint gives
  // nothing, so the chip is never an empty popover — which is indistinguishable
  // from a control that doesn't work.
  const countryOptions = countryOptionsFromMap(
    countryMap,
    clients.map((client) => ({ iso2: client.countryIso2, name: client.countryName }))
  );

  const { mid } = useClientPathMid();
  const { createClient } = useCreateClient();
  const { updateClient } = useUpdateClient();
  const { uploadContract } = useClientContractUpload();
  const { viewContract } = useClientContractView();
  const { deleteContract } = useClientContractDelete();

  // Both Add client and Save and add another land here; `keepOpen` is the only
  // difference between them, and the modal itself handles resetting the form.
  const onSubmitClient = (values: ClientFormValues, keepOpen: boolean) => {
    // The country string a write carries is the country map's own key for that
    // ISO2 — an "NZ", not a "New Zealand" — because that is what pg-dashboard's
    // select submits. Falls back to the ISO2 itself if the reference call has not
    // resolved, which is the same string in every environment seen so far.
    const payload = toClientApiPayload(values, (iso2) =>
      iso2 ? (countryMap.iso2ToApiCountry[iso2.toUpperCase()] ?? iso2) : ""
    );

    // The contract is uploaded *after* the client is saved, and only when the
    // merchant actually picked a file this session: a contract is attached to a
    // client id, so there is nothing to attach it to until one exists, and an
    // edit form opened over a stored contract carries a name but no file (see
    // ClientFormValues.contract).
    const file = values.contract?.file;

    if (editingRow) {
      updateClient({
        id: editingRow.id,
        rowMid: editingRow.mid,
        payload,
        onUpdated: () => {
          if (file) uploadContract({ clientId: editingRow.id, rowMid: editingRow.mid, file });
        },
      });
      setEditingId(null);
      onAddClientOpenChange(false);
      return;
    }

    createClient(payload, (clientId) => {
      if (clientId && file) uploadContract({ clientId, file });
    });

    // Otherwise the new row can land outside the current filters or on a page the
    // merchant isn't looking at, and the form appears to have done nothing.
    setSearch("");
    setCountryFilters([]);
    setPage(1);
    if (!keepOpen) onAddClientOpenChange(false);
  };

  // Opens the same form the Add client button does, pre-filled from the client's
  // own record. Setting `editingId` is what switches the modal into edit mode and
  // what starts the by-id fetch that fills it.
  const onEditClient = (client: Client) => {
    setEditingId(client.id);
    onAddClientOpenChange(true);
  };

  const closeClientForm = (open: boolean) => {
    if (!open) setEditingId(null);
    onAddClientOpenChange(open);
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
  // Country alone, because that is the only filter pg-dashboard's client list has
  // besides its text search (which v2's search box already is). The Email and
  // Creation date chips that used to sit here had no counterpart on this endpoint,
  // so nothing they sent was ever honoured — they are gone rather than left
  // looking operable.
  //
  // A function, not a stored element: both control rows below are mounted at
  // once (CSS decides which one is visible), so calling this twice gives each
  // row its own chip with its own popover state. Sharing one element — and with
  // it one lifted `openChip` — opened the hidden row's twin of the chip
  // alongside the visible one, and a Radix popover anchored to a display:none
  // trigger never positions, so it mounted as a dismissable layer over the real
  // popover and closed both on the very click that opened them. That is why the
  // chip appeared to do nothing at all. Same fix, and same reason, as
  // McaTransactionTable's renderFilterChips.
  const renderFilterChips = () => (
    <ClientFilterChips
      options={countryOptions}
      value={countryFilters}
      onChange={(next) => {
        setCountryFilters(next);
        setPage(1);
      }}
    />
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

        <div className="flex flex-wrap items-center gap-1.5">{renderFilterChips()}</div>

        <div className="ml-auto flex items-center gap-2">
          {/* Every mutation already invalidates the client list, so this is for
              changes made elsewhere — another tab, or another member of the team.
              Spinning on isFetching (not isLoading) is what makes a press over
              existing rows visibly do something. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Refresh clients"
            disabled={isFetching}
            leftIcon={
              <Icon name="refresh" className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            }
            onClick={refetch}
            className="shrink-0"
          >
            Refresh
          </Button>
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
          {renderFilterChips()}
        </div>
      </div>

      {/* Desktop (lg+): the full table, columns and all. */}
      {!isLoading && pageRows.length === 0 ? (
        <PlaceholderState
          variant="no-data"
          title={emptyTitle}
          description={emptyDescription}
          className="hidden py-16 lg:flex"
        />
      ) : (
        <DataTable
          className="hidden rounded-none border-0 lg:block"
          columns={columns}
          data={pageRows}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          rowKey={(row) => row.id}
          pageSize={CLIENT_PAGE_LIMIT}
          totalRows={totalCount}
          page={page}
          onPageChange={setPage}
          tableLayout="content"
          density="compact"
          isLoading={isLoading}
        // Edit rides the rowAction slot rather than a column of its own — the
        // same arrangement, and the same button treatment, as the Upload Invoice
        // action on the client's transactions table. Revealed on row hover and on
        // keyboard focus within the row, pinned right while the columns scroll
        // under it, and out of the way of column reordering.
        rowAction={(row) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Icon name="pencil" className="h-3 w-3" />}
            onClick={(e) => {
              // The action floats over the row, whose own click opens the
              // details drawer — without this, editing would open both.
              e.stopPropagation();
              onEditClient(row);
            }}
            className="h-auto min-h-0 gap-1 rounded-md bg-card px-2 py-1 text-[11px] whitespace-nowrap shadow-sm"
          >
            Edit
          </Button>
          )}
        />
      )}

      {/* Tablet + mobile (below lg): the same page's rows as cards. */}
      <ClientCardList
        className="lg:hidden"
        rows={pageRows}
        isLoading={isLoading}
        onOpenDetails={openDetails}
        page={page}
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
      />

      {/* One form serving both Add and Edit — the field model is the same, so
          `editing` is the only thing that distinguishes them. */}
      <ClientFormModal
        open={addClientOpen}
        onOpenChange={closeClientForm}
        mode={editingId ? "edit" : "add"}
        // Identifies which record the form is mounted on, so reopening it on a
        // different client starts a fresh form rather than reusing the previous
        // one's state. Absent in Add mode, which has no record.
        recordId={editingId ?? undefined}
        // Strictly the fetched record. `editingRow`'s list fallback exists for the
        // ids the mutations need, not for the fields the form shows.
        initialValues={editingClient ? toClientFormValues(editingClient) : undefined}
        // Nothing to fill the form with yet, so the modal holds a loading state —
        // the same thing pg-dashboard's drawer does while its own refetch is in
        // flight.
        isLoading={!!editingId && (isEditingClientLoading || !editingClient)}
        onSubmit={onSubmitClient}
        onViewStoredContract={
          editingRow?.contract?.fileId
            ? () => viewContract({ clientId: editingRow.id, rowMid: editingRow.mid })
            : undefined
        }
        onRemoveStoredContract={
          editingRow?.contract?.fileId
            ? () => deleteContract({ clientId: editingRow.id, rowMid: editingRow.mid })
            : undefined
        }
      />
    </div>
  );
}
