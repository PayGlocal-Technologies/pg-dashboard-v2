"use client";

import { useEffect, useState } from "react";
import { Button, DataTable, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  AmountFilterChip,
  CurrencyFilterChip,
  DateFilterChip,
  StatusFilterChip,
  toEndOfDayMs,
  toStartOfDayMs,
} from "@/components/common/filters/FilterChips";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import { mcaTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import { buildMcaColumns } from "@/features/dashboard/transactions/mcaColumns";
import { ReorderColumnsPopover } from "@/features/dashboard/transactions/components/ReorderColumnsPopover";
import { CURRENCY_FILTER_OPTIONS } from "@/features/dashboard/multi-currency/constants";
import { reorderColumns } from "@/lib/utils/columns";
// Upload Invoice now opens the details page instead of this modal — import
// kept commented out (not deleted) alongside the modal's usage below.
// import { UploadInvoiceModal } from "@/features/dashboard/transactions/components/UploadInvoiceModal";
import { TransactionDetailsPage } from "@/features/dashboard/transactions/components/TransactionDetailsPage";
import { TransactionDetailsDrawer } from "@/features/dashboard/transactions/components/TransactionDetailsDrawer";
import { MCA_STATUS_FILTERS, TRANSACTIONS_PAGE_LIMIT } from "@/features/dashboard/transactions/constants";
import type { McaTransaction, McaTransactionsResponse, TableReqBody } from "@/features/dashboard/transactions/types";

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

export function McaTransactionTable() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PACB");
  const contentEl = useContentAreaElement();
  const [scrollPosition, setScrollPosition] = useState(0);

  const [search, setSearch]     = useState("");
  // Defaults to "Invoice Pending" (rather than "All") when the page loads.
  const [statusFilters, setStatusFilters]     = useState<string[]>(INVOICE_PENDING_STATUSES);
  const [currencyFilters, setCurrencyFilters] = useState<string[]>([]);
  const [dateRange, setDateRange]     = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  // null until the merchant actually drags a column, at which point
  // DataTable renders that order instead of buildMcaColumns' own default.
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  // Which of the Date/Amount/Status/Currency filter chip popovers is open,
  // if any: shared so opening one closes whichever other one was open.
  const [openChip, setOpenChip] = useState<"date" | "amount" | "status" | "currency" | null>(null);
  const [page, setPage]         = useState(1);

  const [statusOverrides, setStatusOverrides] = useState<Record<string, Partial<McaTransaction>>>({});

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
  // Transaction gids whose settlement feedback has already been submitted or
  // dismissed. Owned here (rather than by the drawer or the page) since
  // Expand/Collapse swap those two components in and out of the tree, and
  // state either one held locally would be lost the moment the other took
  // over. Both read and write this same set, so a transaction resolved in
  // one is never shown again in the other.
  const [resolvedFeedbackIds, setResolvedFeedbackIds] = useState<Set<string>>(() => new Set());
  // Set when navigating to a linked transaction that isn't part of the
  // table's own currently-fetched page (see openLinkedTransaction below) —
  // takes precedence over the rows.find lookup so the details page can show
  // a transaction the table itself never fetched.
  const [detailsOverrideRow, setDetailsOverrideRow] = useState<McaTransaction | null>(null);

  const body = buildTxnRequestBody(
    {
      externalStatus: statusFilters.length ? statusFilters : undefined,
      currency: currencyFilters.length ? currencyFilters : undefined,
      startTime: dateRange.from ? toStartOfDayMs(dateRange.from) : undefined,
      endTime: dateRange.to ? toEndOfDayMs(dateRange.to) : undefined,
    },
    {
      searchQuery: search || undefined,
      selectedMid: midFilter,
      pageLimit: TRANSACTIONS_PAGE_LIMIT,
      from: (page - 1) * TRANSACTIONS_PAGE_LIMIT,
    }
  );

  const { data, isPending, isError, refetch } = usePostQuery<McaTransactionsResponse, TableReqBody>(
    ["mca-transactions", urlMid, ...(midFilter?.value ?? [])],
    mcaTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    isReady
  );

  const rawRows    = data?.data?.data ?? [];
  const rows       = rawRows.map((r) => (statusOverrides[r.gid] ? { ...r, ...statusOverrides[r.gid] } : r));
  const totalCount = data?.data?.totalCount ?? 0;

  // Amount has no server-side range param (see AmountFilterChip's comment),
  // so it narrows only the rows already on this page; totalCount/pagination
  // below still reflect the server's unfiltered count.
  const minAmount = amountRange.min ? parseFloat(amountRange.min) : undefined;
  const maxAmount = amountRange.max ? parseFloat(amountRange.max) : undefined;
  const tableRows =
    minAmount == null && maxAmount == null
      ? rows
      : rows.filter((r) => {
          const amt = parseFloat(r.amount ?? "0");
          if (minAmount != null && amt < minAmount) return false;
          if (maxAmount != null && amt > maxAmount) return false;
          return true;
        });

  // const uploadRow = rows.find((r) => r.gid === uploadRowId) ?? null;
  const detailsRow = detailsOverrideRow ?? rows.find((r) => r.gid === detailsRowId) ?? null;

  const onSearch = (v: string) => { setSearch(v); setPage(1); };

  const toggleStatusFilter = (value: string) => {
    setStatusFilters((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    setPage(1);
  };

  const onClearStatusFilter = () => {
    setStatusFilters([]);
    setPage(1);
  };

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

  // Optimistically moves a "waiting for invoice" row to "Sent for Review" once
  // its invoice is submitted. There's no real invoice-upload endpoint yet (see
  // UploadInvoiceForm's simulateSaveInvoice TODO), so this keeps the drawer's
  // timeline and the table's Settlement Status column in sync with each other
  // without a round trip to the server.
  const handleInvoiceSubmitted = (row: McaTransaction) => {
    setStatusOverrides((prev) => ({
      ...prev,
      [row.gid]: { externalStatus: "SENT_FOR_REVIEW", frmStatus: "REVIEW_IN_PROGRESS" },
    }));
  };

  const handleFeedbackResolved = (gid: string) => {
    setResolvedFeedbackIds((prev) => new Set(prev).add(gid));
  };

  const baseColumns = buildMcaColumns(isPartnerUser, openDetails);
  const columns = reorderColumns(baseColumns, columnOrder);
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  const handleReport = () => {
    // TODO: wire up once a transactions export endpoint exists, same gap
    // as the page-level "Export Report" button in index.tsx and
    // "Download FIRA" in TransactionDetailsPage.tsx.
  };

  // Date/Amount/Status/Currency read as one cohesive filtering control
  // (tight gap), shared verbatim between the desktop and tablet/mobile
  // control row layouts below so the two can never drift out of sync.
  const filterChips = (
    <div className="flex flex-wrap items-center gap-1.5">
      <DateFilterChip
        value={dateRange}
        onChange={(next) => {
          setDateRange(next);
          setPage(1);
        }}
        open={openChip === "date"}
        onOpenChange={(next) => setOpenChip(next ? "date" : null)}
      />
      <AmountFilterChip
        value={amountRange}
        onChange={setAmountRange}
        open={openChip === "amount"}
        onOpenChange={(next) => setOpenChip(next ? "amount" : null)}
        idPrefix="txn-amount"
        hint="Applies to the transactions currently loaded."
      />
      <StatusFilterChip
        options={STATUS_OPTIONS}
        selected={statusFilters}
        onToggle={toggleStatusFilter}
        onClear={onClearStatusFilter}
        open={openChip === "status"}
        onOpenChange={(next) => setOpenChip(next ? "status" : null)}
      />
      <CurrencyFilterChip
        options={CURRENCY_FILTER_OPTIONS}
        value={currencyFilters}
        onChange={(next) => {
          setCurrencyFilters(next);
          setPage(1);
        }}
        open={openChip === "currency"}
        onOpenChange={(next) => setOpenChip(next ? "currency" : null)}
      />
    </div>
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
        resolvedFeedbackIds={resolvedFeedbackIds}
        onFeedbackResolved={handleFeedbackResolved}
      />
    );
  }

  return (
    <div className="space-y-4">
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
            words={["remitter", "transaction ID", "UTR"]}
            className="w-40 sm:w-56"
          />

          {filterChips}

          <div className="ml-auto flex items-center gap-2">
            <ReorderColumnsPopover
              columns={reorderableColumns}
              order={currentColumnOrder}
              onOrderChange={setColumnOrder}
              onReset={() => setColumnOrder(null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
              onClick={handleReport}
              className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
            >
              Report
            </Button>
          </div>
        </div>

        {/* Tablet + mobile (below lg): Reorder Columns and Report shrink to
            icon-only buttons (no room for their labels beside a flexible
            search field) and sit on the same row as search, which never
            wraps. Filter chips move to their own row directly beneath,
            rather than trying to also fit them into that first row. */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:hidden">
          <div className="flex flex-nowrap items-center gap-2">
            <RotatingSearchInput
              value={search}
              onSearch={onSearch}
              words={["remitter", "transaction ID", "UTR"]}
              className="min-w-0 flex-1"
            />
            <ReorderColumnsPopover
              columns={reorderableColumns}
              order={currentColumnOrder}
              onOrderChange={setColumnOrder}
              onReset={() => setColumnOrder(null)}
              triggerVariant="icon"
            />
            <IconButton
              aria-label="Report"
              variant="outline"
              size="sm"
              onClick={handleReport}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Icon name="download" className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          {filterChips}
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
          <DataTable
            className="rounded-none border-0"
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
        resolvedFeedbackIds={resolvedFeedbackIds}
        onFeedbackResolved={handleFeedbackResolved}
      />
    </div>
  );
}
