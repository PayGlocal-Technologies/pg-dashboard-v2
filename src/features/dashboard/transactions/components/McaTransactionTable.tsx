"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { cn } from "@/lib/utils";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import { mcaTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import { buildMcaColumns } from "@/features/dashboard/transactions/mcaColumns";
import { ReorderColumnsPopover } from "@/features/dashboard/transactions/components/ReorderColumnsPopover";
// Upload Invoice now opens the details page instead of this modal — import
// kept commented out (not deleted) alongside the modal's usage below.
// import { UploadInvoiceModal } from "@/features/dashboard/transactions/components/UploadInvoiceModal";
import { TransactionDetailsPage } from "@/features/dashboard/transactions/components/TransactionDetailsPage";
import { TransactionDetailsDrawer } from "@/features/dashboard/transactions/components/TransactionDetailsDrawer";
import {
  MCA_STATUS_FILTERS,
  MCA_CURRENCY_FILTERS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/transactions/constants";
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

// yyyy-mm-dd (native <input type="date"> value) → start/end-of-day epoch ms,
// what buildTxnRequestBody's startTime/endTime already expect.
function toStartOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getTime();
}
function toEndOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999`).getTime();
}

// Re-orders an already-built column list to match a saved key order (from
// ReorderColumnsPopover), keeping "action" pinned last regardless of order:
// it's a utility column, not a data field a merchant would want to move
// around. Appends any column missing from `order` (e.g. Merchant ID, which
// only exists for partner users) right before it.
function reorderColumns<T>(cols: Column<T>[], order: string[] | null): Column<T>[] {
  if (!order) return cols;
  const actionCol = cols.find((c) => c.key === "action");
  const reorderable = cols.filter((c) => c.key !== "action");
  const byKey = new Map(reorderable.map((c) => [c.key, c]));
  const ordered = order.map((k) => byKey.get(k)).filter((c): c is Column<T> => !!c);
  const missing = reorderable.filter((c) => !order.includes(c.key));
  return [...ordered, ...missing, ...(actionCol ? [actionCol] : [])];
}

// Sets scrollTop via a standalone function (rather than inline in a
// handler) since the element comes from useContentAreaElement, and React
// Compiler's lint forbids mutating a hook-returned value directly.
function restoreScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}

// ── Filter categories — left column of the filter flyout. Adding a new
// filterable field is just one more entry here; the panel scales without
// layout changes since options render in the shared right column. ──────────
type FilterCategoryKey = "status" | "currency";

const FILTER_CATEGORIES: { key: FilterCategoryKey; label: string; options: { value: string; label: string }[] }[] = [
  { key: "status", label: "Status", options: MCA_STATUS_FILTERS.filter((o) => o.value !== "All") },
  { key: "currency", label: "Currency", options: MCA_CURRENCY_FILTERS.filter((o) => o.value !== "All") },
];

// Two-column filter flyout: categories on the left (hover/click to preview),
// that category's multi-select options on the right. Selections for every
// category persist across hovers since state lives in the parent, not here.
function TransactionFilterPanel({
  selected,
  onToggle,
  onClear,
}: {
  selected: Record<FilterCategoryKey, string[]>;
  onToggle: (category: FilterCategoryKey, value: string) => void;
  onClear: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<FilterCategoryKey>("status");
  const activeOptions = FILTER_CATEGORIES.find((c) => c.key === activeCategory)?.options ?? [];
  const totalSelected = FILTER_CATEGORIES.reduce((sum, c) => sum + selected[c.key].length, 0);

  return (
    <div className="w-72 p-3">
      <div className="flex">
        <div className="w-28 shrink-0 border-r border-border py-1.5">
          {FILTER_CATEGORIES.map((category) => (
            <button
              key={category.key}
              type="button"
              onMouseEnter={() => setActiveCategory(category.key)}
              onClick={() => setActiveCategory(category.key)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                activeCategory === category.key
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span>{category.label}</span>
              {selected[category.key].length > 0 && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-40 flex-1 py-1.5 pl-2">
          {activeOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-muted/50"
            >
              <Checkbox
                checked={selected[activeCategory].includes(option.value)}
                onCheckedChange={() => onToggle(activeCategory, option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between px-1 pt-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="x" className="w-3 h-3" />}
          onClick={onClear}
          disabled={totalSelected === 0}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear filters
        </Button>
        {totalSelected > 0 && (
          <span className="pr-1 text-[11px] text-muted-foreground">{totalSelected} selected</span>
        )}
      </div>
    </div>
  );
}

// Shared trigger styling for the Date/Amount/Status filter chips: dashed
// outline + a leading plus icon, matching the "add a filter" affordance in
// the reference design, with the plus swapped for a small count badge once
// that chip has an active value.
function FilterChipTrigger({
  label,
  active,
  count,
}: {
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={
        active && count ? (
          <Badge variant="default" size="sm" square>
            {count}
          </Badge>
        ) : (
          <Icon name="plus" className="h-3 w-3" />
        )
      }
      className={cn(
        "shrink-0 rounded-full text-muted-foreground hover:text-foreground",
        active ? "border-solid border-primary/40 text-foreground" : "border-dashed"
      )}
    >
      {label}
    </Button>
  );
}

interface DateRangeValue {
  from: string;
  to: string;
}

function DateFilterChip({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
}) {
  const isActive = !!(value.from && value.to);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterChipTrigger label="Date" active={isActive} count={isActive ? 1 : undefined} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3 p-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor="txn-date-from">
            From
          </label>
          <Input
            id="txn-date-from"
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor="txn-date-to">
            To
          </label>
          <Input
            id="txn-date-to"
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="x" className="w-3 h-3" />}
          onClick={() => onChange({ from: "", to: "" })}
          disabled={!value.from && !value.to}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  );
}

interface AmountRangeValue {
  min: string;
  max: string;
}

// Filters only the rows already fetched for the current page: there's no
// amount-range query parameter in TableReqBody today (see
// buildRequestBody.ts), so this can't narrow the server-side result set or
// totalCount the way the Date/Status filters do. Flagged here rather than
// guessing an unsupported API field; revisit once a real range-query param
// exists.
function AmountFilterChip({
  value,
  onChange,
}: {
  value: AmountRangeValue;
  onChange: (next: AmountRangeValue) => void;
}) {
  const isActive = !!(value.min || value.max);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterChipTrigger label="Amount" active={isActive} count={isActive ? 1 : undefined} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3 p-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor="txn-amount-min">
            Min amount
          </label>
          <Input
            id="txn-amount-min"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={value.min}
            onChange={(e) => onChange({ ...value, min: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor="txn-amount-max">
            Max amount
          </label>
          <Input
            id="txn-amount-max"
            type="number"
            inputMode="decimal"
            placeholder="No limit"
            value={value.max}
            onChange={(e) => onChange({ ...value, max: e.target.value })}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Applies to the transactions currently loaded.</p>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="x" className="w-3 h-3" />}
          onClick={() => onChange({ min: "", max: "" })}
          disabled={!value.min && !value.max}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function StatusFilterChip({
  selected,
  onToggle,
  onClear,
}: {
  selected: Record<FilterCategoryKey, string[]>;
  onToggle: (category: FilterCategoryKey, value: string) => void;
  onClear: () => void;
}) {
  const count = selected.status.length + selected.currency.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterChipTrigger label="Status" active={count > 0} count={count} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <TransactionFilterPanel selected={selected} onToggle={onToggle} onClear={onClear} />
      </PopoverContent>
    </Popover>
  );
}

// A single shared active indicator that slides between tabs, rather than each
// tab drawing its own underline. Its position/width are measured from the DOM
// (text-based tabs have different widths, so this can't be derived from
// props/state alone) and it's positioned to sit flush on the tab row's own
// bottom border instead of floating below the label.
function TransactionViewTabs({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = tabRefs.current[value];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    // Deferred to a rAF/resize callback (not called synchronously in the
    // effect body) since it depends on post-layout DOM measurements that
    // can't be derived from render — see CLAUDE.md's purity rules.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [value]);

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      {/* relative here (not on some external wrapper) so the sliding
          indicator's positioning context travels with this component
          wherever it's rendered: it now sits directly on the page,
          outside the controls container below. */}
      <TabsList className="relative h-auto justify-start gap-5 rounded-none border-0 bg-transparent p-0">
        {VIEW_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            ref={(el) => {
              tabRefs.current[tab.value] = el;
            }}
            value={tab.value}
            className="h-auto rounded-none px-0 py-2.5 text-[13px] font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
        <span
          aria-hidden
          className="absolute bottom-0 h-0.5 bg-primary transition-all duration-200 ease-out"
          style={{
            left: indicator?.left ?? 0,
            width: indicator?.width ?? 0,
            opacity: indicator ? 1 : 0,
          }}
        />
      </TabsList>
    </Tabs>
  );
}

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

  const toggleFilter = (category: FilterCategoryKey, value: string) => {
    const setter = category === "status" ? setStatusFilters : setCurrencyFilters;
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    setPage(1);
  };

  const onClearFilters = () => {
    setStatusFilters([]);
    setCurrencyFilters([]);
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

  // Clicking a row in the Linked Transactions section swaps the currently
  // shown transaction in place, in whichever view is open (drawer or page),
  // rather than closing back to the table first. The clicked row comes from a
  // separate query (see LinkedTransactionsSection), not the table's own
  // fetched page, so it's stored directly instead of looked up by id.
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

  const baseColumns = buildMcaColumns(isPartnerUser, openDetails);
  const columns = reorderColumns(baseColumns, columnOrder);
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  // The details page replaces the table in place (same component instance,
  // same closed-over search/filter/page state) rather than overlaying it —
  // this is what makes Back restore the table's previous state for free.
  if (detailsOpen && detailsRow) {
    return (
      <TransactionDetailsPage
        row={detailsRow}
        onBack={closeDetails}
        onUploaded={handleInvoiceSubmitted}
        onOpenTransaction={openLinkedTransaction}
        isPartnerUser={isPartnerUser}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar: page-level navigation, sits directly on the page with no
          surrounding container. An underline-style shortcut onto the same
          status filter state as the "Invoice Pending" option inside the
          Status flyout, not a separate filter axis. */}
      <TransactionViewTabs
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

      {/* Controls container: search left, filter chips + Reorder Columns
          right. Separate from the tab bar above so the tabs read as page
          navigation and this reads as controls scoped to the table below. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={["remitter", "transaction ID", "UTR"]}
          className="w-40 sm:w-56"
        />

        <div className="flex flex-wrap items-center gap-2">
          <DateFilterChip
            value={dateRange}
            onChange={(next) => {
              setDateRange(next);
              setPage(1);
            }}
          />
          <AmountFilterChip value={amountRange} onChange={setAmountRange} />
          <StatusFilterChip
            selected={{ status: statusFilters, currency: currencyFilters }}
            onToggle={toggleFilter}
            onClear={onClearFilters}
          />
          <ReorderColumnsPopover
            columns={reorderableColumns}
            order={currentColumnOrder}
            onOrderChange={setColumnOrder}
          />
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
