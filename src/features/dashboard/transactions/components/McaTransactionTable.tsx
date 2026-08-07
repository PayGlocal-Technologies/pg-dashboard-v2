"use client";

import { useState } from "react";
import { Button, DataTable } from "@/components/ui";
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
import { mcaTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import { buildMcaColumns } from "@/features/dashboard/transactions/mcaColumns";
import { ReorderColumnsPopover } from "@/features/dashboard/transactions/components/ReorderColumnsPopover";
import { CURRENCY_FILTER_OPTIONS } from "@/features/dashboard/multi-currency/constants";
import { reorderColumns } from "@/lib/utils/columns";
// Upload Invoice now opens the details page instead of this modal — import
// kept commented out (not deleted) alongside the modal's usage below.
// import { UploadInvoiceModal } from "@/features/dashboard/transactions/components/UploadInvoiceModal";
import { TransactionDetailsPanel } from "@/features/dashboard/transactions/components/TransactionDetailsPanel";
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

// Status's own options. Currency used to live here as a second category
// inside the same flyout; it's now its own independent chip (see
// CurrencyFilterChip), so this is a flat single-category list.
const STATUS_OPTIONS = MCA_STATUS_FILTERS.filter((o) => o.value !== "All");

export function McaTransactionTable() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PACB");

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
  // the expanded page are two presentations of that same selection (see
  // TransactionDetailsPanel), so they share it. mode tracks which
  // presentation, if any, is showing: a row click opens "drawer", and
  // Expand/Collapse toggle between "drawer" and "page" without ever closing
  // the panel in between, which is what lets it animate smoothly between the
  // two instead of unmounting one and mounting the other.
  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
  const [mode, setMode] = useState<"drawer" | "page" | null>(null);
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
  // mounted underneath it (TransactionDetailsPanel is a fixed overlay, never
  // a replacement of the table's own tree), so filters, sorting, pagination,
  // and scroll are untouched for the whole time the drawer is open and after
  // it closes.
  const openDetails = (row: McaTransaction) => {
    setDetailsOverrideRow(null);
    setDetailsRowId(row.gid);
    setMode("drawer");
  };

  // Expand/Collapse just flip `mode` between "drawer" and "page". The panel
  // itself never closes and reopens in between, which is what lets it
  // animate smoothly rather than cutting between two separately-mounted
  // views. detailsRowId/detailsOverrideRow already hold the transaction
  // being shown, so neither needs to change here.
  const expandToPage = () => setMode("page");
  const collapseToDrawer = () => setMode("drawer");

  const closeDetails = () => {
    setMode(null);
    setDetailsOverrideRow(null);
  };

  // Passed through as onOpenTransaction to TransactionDetailsPanel: swaps
  // the currently shown transaction in place, in whichever presentation is
  // open, rather than closing back to the table first. Not currently invoked
  // from within the details view itself (the Linked Transactions section
  // that used to call it has been removed), but kept as the mechanism for
  // any future "jump to another transaction" entry point, so the row is
  // stored directly rather than looked up by id, in case such an entry point
  // surfaces a transaction outside the table's own fetched page.
  const openLinkedTransaction = (row: McaTransaction) => {
    setDetailsOverrideRow(row);
    setDetailsRowId(row.gid);
  };

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

  const baseColumns = buildMcaColumns(isPartnerUser, openDetails);
  const columns = reorderColumns(baseColumns, columnOrder);
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  return (
    <div className="space-y-4">
      {/* Tab bar: page-level navigation, sits directly on the page with no
          surrounding container. An underline-style shortcut onto the same
          status filter state as the "Invoice Pending" option inside the
          Status flyout, not a separate filter axis. */}
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

      {/* Controls container: search, then the filter chip group, sit
          together on the left with tight spacing; the Reorder
          Columns/Download action group is pushed to the far right (ml-auto
          below) rather than spread apart via justify-between, so the chips
          read as immediately following search instead of floating in the
          middle of a wide gap. */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={["remitter", "transaction ID", "UTR"]}
          className="w-40 sm:w-56"
        />

        {/* Filter group: Date, Amount, Status, Currency read as one
            cohesive filtering control, so the gap within it is tight. */}
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

        {/* Action group: Reorder Columns, then Download. ml-auto pushes
            this group all the way to the right regardless of how much
            space the search/filter groups take up. The resulting gap
            (rather than a divider) is what separates it from the filter
            chips. */}
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
            onClick={() => {
              // TODO: wire up once a transactions export endpoint exists,
              // same gap as the page-level "Export Report" button in
              // index.tsx and "Download FIRA" in TransactionDetailsPage.tsx.
            }}
            className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
          >
            Report
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center gap-3 text-center">
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

      {/* Rendered alongside the table (never in place of it, in either mode)
          so the table's own filters/sort/pagination/scroll are never
          touched while this is open. Single panel for both the drawer and
          the expanded page. See TransactionDetailsPanel for how it morphs
          between the two instead of one unmounting and the other mounting
          in its place. */}
      <TransactionDetailsPanel
        row={detailsRow}
        mode={mode}
        onClose={closeDetails}
        onExpand={expandToPage}
        onCollapse={collapseToDrawer}
        onUploaded={handleInvoiceSubmitted}
        onOpenTransaction={openLinkedTransaction}
        isPartnerUser={isPartnerUser}
      />
    </div>
  );
}
