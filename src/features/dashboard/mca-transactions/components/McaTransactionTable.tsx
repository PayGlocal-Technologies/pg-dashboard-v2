"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button, DataTable } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  EMPTY_RELATIVE_RANGE,
  FilterChipsRow,
  hasRelativeRange,
  relativeRangeToEpochMs,
  toEndOfDayMs,
  toStartOfDayMs,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import { useQueryClient } from "@tanstack/react-query";
import { usePost, usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import {
  mcaTxnReportDownloadApi,
  mcaTxnSearchApi,
} from "@/features/dashboard/mca-transactions/services";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { buildMcaColumns } from "@/features/dashboard/mca-transactions/columns";
import { ReorderColumnsPopover } from "@/components/common/ReorderColumnsPopover";
import { TransactionCardList } from "@/features/dashboard/mca-transactions/components/TransactionCardList";
import { reorderColumns } from "@/lib/utils/columns";
// Upload Invoice now opens the details page instead of this modal — import
// kept commented out (not deleted) alongside the modal's usage below.
// import { UploadInvoiceModal } from "@/features/dashboard/mca-transactions/components/UploadInvoiceModal";
import { TransactionDetailsPage } from "@/features/dashboard/mca-transactions/components/TransactionDetailsPage";
import { TransactionDetailsDrawer } from "@/features/dashboard/mca-transactions/components/TransactionDetailsDrawer";
import { useFircDownload } from "@/features/dashboard/mca-transactions/hooks";
import { downloadBlob } from "@/lib/utils/format";
import useNewPermissions from "@/hooks/useNewPermissions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MCA_CURRENCY_FILTERS,
  MCA_STATUS_FILTERS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/mca-transactions/constants";
import type { McaTransaction, McaTransactionsResponse } from "@/features/dashboard/mca-transactions/types";
import type { TableReqBody } from "@/types/transactions";

// The same rotating hints pg-dashboard's transactions search offers.
const SEARCH_WORDS = ["Amount", "Customer name", "Transaction ID", "Email"];

// An export is the whole filtered result set, not the visible page. Capped
// rather than unbounded so a merchant with a very large history can't ask the
// server for everything in one request.
const REPORT_EXPORT_LIMIT = 5000;

// The columns the table is meaningless without, so they can't be hidden.
// Same three pg-dashboard pins in its editColumns "Fixed Columns" group.
const FIXED_COLUMN_KEYS = ["amount", "externalStatus", "formattedTransactionCreationDateTime"];

const VIEW_TABS = [
  { value: "invoice-pending", label: "Invoice Pending" },
  { value: "all", label: "All" },
  { value: "settled", label: "Settled" },
] as const;

// externalStatus values each view tab (other than "All") maps onto — kept
// distinct from MCA_STATUS_FILTERS since "Settled" here intentionally covers
// both terminal-success statuses, not a single Filter-panel checkbox value.
const INVOICE_PENDING_STATUSES = ["DOCUMENT_PENDING"];
const SETTLED_STATUSES = ["SETTLED", "FIRC_SETTLED"];

function sameStatusSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

// Sets scrollTop via a standalone function (rather than inline in a
// handler) since the element comes from useContentAreaElement, and React
// Compiler's lint forbids mutating a hook-returned value directly.
function restoreScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}

// Status's own options. Currency used to live here as a second category
// inside the same flyout; it's now its own independent chip (see
// CurrencyFilterChip), so this is a flat single-category list.
const STATUS_OPTIONS = MCA_STATUS_FILTERS.filter((o) => o.value !== "All");

interface McaTransactionTableProps {
  /** The page's analytics summary (see TransactionsAnalyticsCarousel),
   *  composed by the page but rendered here, above this component's own
   *  search/filter controls and table/card list, so the two stay in this
   *  fixed order at every width. */
  analyticsSection?: ReactNode;
}

export function McaTransactionTable({ analyticsSection }: McaTransactionTableProps) {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PACB");
  const contentEl = useContentAreaElement();
  const queryClient = useQueryClient();
  const [scrollPosition, setScrollPosition] = useState(0);

  const [search, setSearch]     = useState("");
  // Defaults to "Invoice Pending" (rather than "All") when the page loads.
  const [statusFilters, setStatusFilters]     = useState<string[]>(INVOICE_PENDING_STATUSES);
  const [currencyFilters, setCurrencyFilters] = useState<string[]>([]);
  const [dateRange, setDateRange]     = useState<{ from: string; to: string }>({ from: "", to: "" });
  // "Last N weeks/days/hours/minutes", kept as two pieces of state on
  // purpose. `relativeRange` is what the chip shows and re-seeds from;
  // `relativeWindow` is that range resolved to absolute epoch millis at the
  // moment it was applied.
  //
  // Resolving it per render instead would be a bug, not just impure: the
  // request body is part of the query key, so a window recomputed from
  // Date.now() on every render would produce a new key every render and
  // refetch forever. Mutually exclusive with dateRange — applying either
  // clears the other (see DateFilterChip) — so at most one start/end pair
  // ever reaches the request body.
  const [relativeRange, setRelativeRange] = useState<RelativeRangeValue>(EMPTY_RELATIVE_RANGE);
  const [relativeWindow, setRelativeWindow] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  // null until the merchant actually drags a column, at which point
  // DataTable renders that order instead of buildMcaColumns' own default.
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  // Columns the merchant has hidden. Amount/Status/Date are pinned (see
  // FIXED_COLUMN_KEYS) and can never end up in here.
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage]         = useState(1);

  // Upload Invoice modal — superseded by the drawer's inline upload flow
  // (Upload Invoice now opens the Transaction Details Drawer). Kept
  // commented out, not deleted, so it can be restored if needed.
  // const [uploadRowId, setUploadRowId] = useState<string | null>(null);
  // const [uploadOpen, setUploadOpen]   = useState(false);

  // detailsRowId identifies which transaction is being viewed; the drawer and
  // the full page are two presentations of that same selection, so they share
  // it. drawerOpen and detailsOpen are mutually exclusive: a row click opens
  // the drawer, and Expand hands the same transaction off to the page.
  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [detailsOpen, setDetailsOpen]   = useState(false);
  // Set when navigating to a linked transaction that isn't part of the
  // table's own currently-fetched page (see openLinkedTransaction below) —
  // takes precedence over the rows.find lookup so the details page can show
  // a transaction the table itself never fetched.
  const [detailsOverrideRow, setDetailsOverrideRow] = useState<McaTransaction | null>(null);

  const router = useRouter();
  const checkPermissions = useNewPermissions();
  const canManageInvoices = checkPermissions(["getAllMerchantInvoice"]);
  const { downloadFirc } = useFircDownload();

  const body = buildTxnRequestBody(
    {
      externalStatus: statusFilters.length ? statusFilters : undefined,
      currency: currencyFilters.length ? currencyFilters : undefined,
      startTime:
        relativeWindow?.startTime ?? (dateRange.from ? toStartOfDayMs(dateRange.from) : undefined),
      endTime: relativeWindow?.endTime ?? (dateRange.to ? toEndOfDayMs(dateRange.to) : undefined),
    },
    {
      searchQuery: search || undefined,
      selectedMid: midFilter,
      pageLimit: TRANSACTIONS_PAGE_LIMIT,
      from: (page - 1) * TRANSACTIONS_PAGE_LIMIT,
    }
  );

  // isPending vs isFetching: isPending is true only while there is no cached
  // data at all, so it drives the table's first-load skeleton. A refetch over
  // existing data leaves it false and shows only in isFetching — which is
  // what the Refresh button reflects, since otherwise pressing it did
  // nothing visible.
  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    McaTransactionsResponse,
    TableReqBody
  >(
    ["mca-transactions", urlMid, ...(midFilter?.value ?? [])],
    mcaTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    isReady
  );

  const rows       = data?.data?.data ?? [];
  const totalCount = data?.data?.totalCount ?? 0;

  // Every filter is server-side, so what the API returned is what the table
  // shows — no client-side narrowing, and pagination's totalCount always
  // describes the same set the rows came from.
  const tableRows = rows;

  // const uploadRow = rows.find((r) => r.gid === uploadRowId) ?? null;
  const detailsRow = detailsOverrideRow ?? rows.find((r) => r.gid === detailsRowId) ?? null;

  const onSearch = (v: string) => { setSearch(v); setPage(1); };

  // const openUploadInvoice = (row: McaTransaction) => {
  //   setUploadRowId(row.gid);
  //   setUploadOpen(true);
  // };

  // Clicking a row opens the drawer, not the full page. The table stays
  // mounted underneath it, so filters, sorting, pagination, and scroll are
  // untouched for the whole time the drawer is open and after it closes.
  const openDetails = (row: McaTransaction) => {
    setDetailsOverrideRow(null);
    setDetailsRowId(row.gid);
    setDrawerOpen(true);
  };

  // Expand hands the drawer's current transaction off to the full page.
  // detailsRowId/detailsOverrideRow already hold that selection, so the page
  // renders exactly what the drawer was showing. The table's scroll position
  // is captured here (rather than when the drawer opened) because this is the
  // point the table actually leaves the screen and Back has to restore it.
  const expandToPage = (row: McaTransaction) => {
    if (contentEl) setScrollPosition(contentEl.scrollTop);
    setDetailsRowId(row.gid);
    setDrawerOpen(false);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsOverrideRow(null);
  };

  // Collapse reverses Expand: closes the full page and reopens the same
  // transaction in the drawer. Deliberately doesn't touch detailsRowId or
  // detailsOverrideRow (unlike closeDetails), so whichever transaction was
  // showing, including one reached via Linked Transactions, stays showing;
  // the scroll-restore effect below puts the table back where expandToPage
  // found it, same as if Expand had never been clicked.
  const collapseToDrawer = () => {
    setDetailsOpen(false);
    setDrawerOpen(true);
  };

  // Passed through as onOpenTransaction to TransactionDetailsPage/Drawer:
  // swaps the currently shown transaction in place, in whichever view is
  // open (drawer or page), rather than closing back to the table first. Not
  // currently invoked from within the details view itself (the Linked
  // Transactions section that used to call it has been removed), but kept
  // as the mechanism for any future "jump to another transaction" entry
  // point, so the row is stored directly rather than looked up by id, in
  // case such an entry point surfaces a transaction outside the table's own
  // fetched page.
  const openLinkedTransaction = (row: McaTransaction) => {
    setDetailsOverrideRow(row);
    setDetailsRowId(row.gid);
    // Only meaningful for the full page, where contentEl is what scrolls and
    // a new transaction should start at the top. The drawer scrolls its own
    // container, so touching contentEl there would move the background
    // table instead.
    if (detailsOpen && contentEl) restoreScrollTop(contentEl, 0);
  };

  // Restores the table's scroll position after the details page unmounts and
  // the table re-renders in its place — deferred to an effect (rather than
  // set inline in closeDetails) so it runs after the table's own content is
  // back in the DOM, not while the details page is still on screen.
  useEffect(() => {
    if (!detailsOpen && contentEl) {
      restoreScrollTop(contentEl, scrollPosition);
    }
  }, [detailsOpen, contentEl, scrollPosition]);

  // The invoice upload is a real mutation, so the server is the authority on
  // what the transaction's status became — this refetches rather than
  // optimistically rewriting the row. The drawer's own timeline and documents
  // queries are invalidated alongside it, since submitting an invoice changes
  // both.
  // A refetch can complete in well under the time it takes to notice a
  // spinner, so the outcome is confirmed explicitly rather than left to a
  // flicker the merchant may miss entirely.
  const handleRefresh = async () => {
    const { isError: failed } = await refetch();
    if (failed) toast.error("Couldn't refresh transactions. Please try again.");
    else toast.success("Transactions updated");
  };

  const handleInvoiceSubmitted = (row: McaTransaction) => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ["mca-txn-timeline", row.gid] });
    void queryClient.invalidateQueries({ queryKey: ["mca-txn-documents", row.merchantId, row.gid] });
  };

  // Export runs the table's current request body against the download
  // endpoint, so the file matches exactly what is on screen — same filters,
  // same search, same MID scope. `from`/`pageLimit` are dropped: an export is
  // the whole result set, not the page being viewed.
  const { mutate: downloadReport, isPending: isReportPending } = usePost<Blob, TableReqBody>(
    mcaTxnReportDownloadApi(urlMid),
    {
      download: true,
      invalidateQueries: false,
      onSuccess: (blob) => {
        downloadBlob(blob, `transactions-${new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      onError: (error) => {
        toast.error(error.message || "Couldn't generate the report. Please try again.");
      },
    }
  );

  const handleReport = () => {
    const { from: _from, ...exportBody } = body;
    downloadReport({ ...exportBody, pageLimit: REPORT_EXPORT_LIMIT, from: 0 } as TableReqBody);
  };

  const baseColumns = buildMcaColumns(isPartnerUser, {
    onOpenDetails: openDetails,
    onDownloadFirc: (row) => downloadFirc(row.merchantId, row.gid),
    onCreateInvoice: (row) => router.push(`/create-invoice?gid=${row.gid}`),
    onLinkInvoice: (row) => router.push(`/mca-invoices?linkTo=${row.gid}`),
    canManageInvoices,
  });
  const orderedColumns = reorderColumns(baseColumns, columnOrder);
  // Actions is never listed as hideable (it holds the row's controls, not
  // data), so it is filtered against hiddenColumns like the rest but never
  // appears in the popover to be ticked off.
  const columns = orderedColumns.filter((col) => !hiddenColumns.includes(col.key));
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  // Date/Amount/Status/Currency read as one cohesive filtering control,
  // configured identically for the desktop and tablet/mobile control rows
  // below so the two can never drift out of sync.
  //
  // A function, not a stored element: both control rows are mounted at once
  // (CSS decides which is visible), so calling this twice gives each row its
  // own FilterChipsRow instance with its own open-popover state. Sharing one
  // element — and with it one lifted `openChip` — used to open the hidden
  // row's twin of every chip alongside the visible one, and a Radix popover
  // anchored to a display:none trigger never positions, so it sat off-screen
  // above the real popover and swallowed the interaction. See FilterChipsRow.
  const renderFilterChips = () => (
    <FilterChipsRow
      dateRange={dateRange}
      onDateRangeChange={(next) => {
        setDateRange(next);
        setRelativeRange(EMPTY_RELATIVE_RANGE);
        setRelativeWindow(null);
        setPage(1);
      }}
      relativeDateRange={relativeRange}
      onRelativeDateRangeChange={(next) => {
        setRelativeRange(next);
        // Date.now() belongs here, in the handler, not in render.
        setRelativeWindow(hasRelativeRange(next) ? relativeRangeToEpochMs(next) : null);
        setPage(1);
      }}
      statusOptions={STATUS_OPTIONS}
      statusFilters={statusFilters}
      onStatusFiltersChange={(next) => {
        setStatusFilters(next);
        setPage(1);
      }}
      currencyOptions={MCA_CURRENCY_FILTERS}
      currencyFilters={currencyFilters}
      onCurrencyFiltersChange={(next) => {
        setCurrencyFilters(next);
        setPage(1);
      }}
    />
  );

  // Search + Report on one row that never wraps (search takes the flexible
  // remaining width), then the filter chips on their own row beneath,
  // scrolling horizontally on a single line since there's no room to show all
  // four at once next to search. Its scrollbar is hidden (scrollbar-none, the
  // same utility the multi-currency account carousel uses) so the chips read
  // as a row of controls rather than a scroll region: the gesture still works,
  // there's just no persistent indicator, and no custom one replaces it.
  //
  // No Reorder Columns at either width: there's no table to reorder columns
  // on below lg, just the card list.
  //
  // Rendered below lg, as a row inside the table's own container, directly
  // above the card list it filters.
  const compactControls = (
    <>
      <div className="flex flex-nowrap items-center gap-2">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={SEARCH_WORDS}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
          onClick={handleReport}
          isLoading={isReportPending}
          className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
        >
          Report
        </Button>
      </div>

      <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
        {renderFilterChips()}
      </div>
    </>
  );

  // The details page replaces the table in place (same component instance,
  // same closed-over search/filter/page state) rather than overlaying it —
  // this is what makes Back restore the table's previous state for free.
  if (detailsOpen && detailsRow) {
    return (
      <TransactionDetailsPage
        row={detailsRow}
        onBack={closeDetails}
        onCollapse={collapseToDrawer}
        onUploaded={handleInvoiceSubmitted}
        onOpenTransaction={openLinkedTransaction}
        isPartnerUser={isPartnerUser}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* mb-4 below lg, giving 32px (this margin plus the flex gap) between
          the analytics summary and the transaction section below it, against
          the 8px between the carousel and its indicator: a clear break
          between the summary metrics and the transaction data, without the
          indicator drifting away from the carousel it belongs to. Collapses
          at lg, the same breakpoint TransactionsAnalyticsCarousel itself
          switches from the carousel (with its indicator) to the plain grid,
          where the flex gap alone matches the previous spacing. */}
      {analyticsSection && <div className="mb-4 lg:mb-0">{analyticsSection}</div>}

      {/* Tab bar, search/filters, and the table itself all share one
          bordered surface (rounded-xl border border-border bg-card,
          matching every other card on this page) instead of each drawing
          its own box. DataTable's own border/radius/background are
          neutralised below
          (className="rounded-none border-0") since this wrapper already
          provides them; a border-b under each of the first two rows stands
          in for the border that would otherwise separate them. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Tab bar: page-level navigation. An underline-style shortcut onto
            the same status filter state as the "Invoice Pending" option
            inside the Status flyout, not a separate filter axis. No bottom
            padding here: TabsTrigger's own py-2.5 already clears the
            border-b below before the sliding indicator meets it. */}
        <div className="border-b border-border px-4 pt-3">
          <UnderlineTabs
            tabs={VIEW_TABS}
            value={
              sameStatusSet(statusFilters, INVOICE_PENDING_STATUSES)
                ? "invoice-pending"
                : sameStatusSet(statusFilters, SETTLED_STATUSES)
                  ? "settled"
                  : "all"
            }
            onValueChange={(v) => {
              setStatusFilters(
                v === "invoice-pending" ? INVOICE_PENDING_STATUSES : v === "settled" ? SETTLED_STATUSES : []
              );
              setPage(1);
            }}
          />
        </div>

        {/* Desktop (lg+): search, filter chips, and the Reorder
            Columns/Report actions all share one row, actions pushed to the
            far right via ml-auto. Unchanged from before. */}
        <div className="hidden flex-wrap items-center gap-2 border-b border-border px-4 py-3 lg:flex">
          <RotatingSearchInput
            value={search}
            onSearch={onSearch}
            words={SEARCH_WORDS}
            className="w-40 sm:w-56"
          />

          <div className="flex flex-wrap items-center gap-1.5">{renderFilterChips()}</div>

          <div className="ml-auto flex items-center gap-2">
            <ReorderColumnsPopover
              columns={reorderableColumns}
              order={currentColumnOrder}
              onOrderChange={setColumnOrder}
              onReset={() => {
                setColumnOrder(null);
                setHiddenColumns([]);
              }}
              hiddenKeys={hiddenColumns}
              onHiddenKeysChange={setHiddenColumns}
              fixedKeys={FIXED_COLUMN_KEYS}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={
                <Icon
                  name="refresh"
                  className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
                />
              }
              onClick={() => void handleRefresh()}
              disabled={isFetching}
              className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
            >
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
              onClick={handleReport}
              isLoading={isReportPending}
              className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
            >
              Report
            </Button>
          </div>
        </div>

        {/* Tablet + mobile (below lg): the compact search/filter controls,
            directly above the card list they filter, inside this same
            bordered container, below the tab bar. No Reorder Columns here at
            either width: there's no table to reorder columns on below lg,
            just the card list. */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:hidden">
          {compactControls}
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <Icon name="alert-circle" size={22} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load transactions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Something went wrong while fetching data.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button>
          </div>
        ) : (
          <>
            {/* Desktop (lg+): the full table, columns and all. */}
            <DataTable
              className="hidden rounded-none border-0 lg:block"
              columns={columns}
              data={tableRows}
              isLoading={isPending}
              skeletonRows={8}
              emptyTitle="No transactions found"
              emptyDescription="Try adjusting your filters or search query"
              rowKey={(row) => row.gid}
              pageSize={TRANSACTIONS_PAGE_LIMIT}
              totalRows={totalCount}
              page={page}
              onPageChange={setPage}
              tableLayout="content"
              density="compact"
            />

            {/* Tablet + mobile (below lg): a vertical list of transaction
                cards instead of table columns/header. `tableRows` is
                already just this server-paginated page's rows (the same
                array DataTable's own controlled `page`/`data` above
                consumes), so this reads it directly rather than re-slicing
                or re-fetching anything. */}
            <TransactionCardList
              className="lg:hidden"
              rows={tableRows}
              isLoading={isPending}
              onOpenDetails={openDetails}
              page={page}
              onPageChange={setPage}
              totalRows={totalCount}
              pageSize={TRANSACTIONS_PAGE_LIMIT}
              emptyTitle="No transactions found"
              emptyDescription="Try adjusting your filters or search query"
            />
          </>
        )}
      </div>

      {/* Upload Invoice now opens the details page's inline upload flow
          instead of this modal — commented out, not deleted, so it can be
          restored.
      <UploadInvoiceModal
        row={uploadRow}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={handleInvoiceSubmitted}
      />
      */}

      {/* Rendered alongside the table (not in place of it) so closing it
          leaves the table exactly as it was. Shares the same handlers as the
          full page, so the invoice upload flow and Linked Transactions
          navigation behave identically in both. */}
      <TransactionDetailsDrawer
        row={detailsRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onExpand={expandToPage}
        onUploaded={handleInvoiceSubmitted}
        onOpenTransaction={openLinkedTransaction}
        isPartnerUser={isPartnerUser}
      />
    </div>
  );
}
