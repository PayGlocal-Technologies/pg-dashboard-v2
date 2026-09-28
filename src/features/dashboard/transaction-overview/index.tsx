"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, ColumnManager, DataCardList, DataTableCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { parseApiDateTime } from "@/lib/utils/format";
import { reorderColumns } from "@/lib/utils/columns";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import {
  CountryFilterChip,
  CurrencyFilterChip,
  DateFilterChip,
  EMPTY_RELATIVE_RANGE,
  FilterChipGroup,
  hasRelativeRange,
  relativeRangeToEpochMs,
  StatusFilterChip,
  toEndOfDayMs,
  toStartOfDayMs,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import { COUNTRY_NAME_MAP } from "@/features/dashboard/mca-transactions/constants";
import {
  buildTransactionOverviewColumns,
  CURRENCY_OPTIONS,
  FIXED_COLUMN_KEYS,
  matchesCurrencyFilter,
  METHOD_OPTIONS,
  STATUS_OPTIONS,
} from "@/features/dashboard/transaction-overview/columns";
import { TransactionOverviewCard } from "@/features/dashboard/transaction-overview/components/TransactionOverviewCard";
import { TransactionOverviewDrawer } from "@/features/dashboard/transaction-overview/components/TransactionOverviewDrawer";
import {
  MCA_TRANSACTIONS,
  PG_TRANSACTIONS,
} from "@/features/dashboard/transaction-overview/mock-data";
import type {
  PartnerTransaction,
  TransactionRail,
} from "@/features/dashboard/transaction-overview/types";

/**
 * DESIGN MOCK: the partner Transaction Overview (Header's Partners tab), at
 * /transaction-overview. Built from the Multi-Currency Accounts transactions
 * page's own pieces (PageHeader, DataTableCard with an UnderlineTabs bar, the
 * rotating search, flux filter chips, Refresh / Edit columns / Report, the card
 * list below lg, a details drawer on row click) so it looks and behaves like
 * that page. Each tab has its own filters and columns, as pg-dashboard's
 * partner view does: Payment Gateway filters by country and payment method,
 * Multi-Currency Accounts by currency, like the merchant-side MCA table.
 *
 * Runs on fictional rows (see mock-data.ts) filtered client-side; Refresh and
 * Report are UI only. TODO(integration): swap in the partner transaction
 * search and report endpoints once confirmed against pg-dashboard, moving the
 * filters server-side the way McaTransactionTable does.
 */

const PAGE_SIZE = 15;

const RAIL_TABS = [
  { value: "PG", label: "Payment Gateway" },
  { value: "MCA", label: "Multi-Currency Accounts" },
] as const;

const ROWS: Record<TransactionRail, PartnerTransaction[]> = {
  PG: PG_TRANSACTIONS,
  MCA: MCA_TRANSACTIONS,
};

const SEARCH_WORDS: Record<TransactionRail, string[]> = {
  PG: ["Email", "Customer name", "Transaction ID", "Merchant ID"],
  MCA: ["Remitter name", "Transaction ID", "Merchant ID"],
};

const COUNTRY_LABELS: Record<string, string> = {
  ...COUNTRY_NAME_MAP,
  IN: "India",
  DE: "Germany",
  AE: "United Arab Emirates",
  SG: "Singapore",
  AU: "Australia",
  CA: "Canada",
};

function countryOptionsFor(rows: PartnerTransaction[]) {
  return [...new Set(rows.map((r) => r.country))]
    .map((iso2) => ({ value: iso2, label: COUNTRY_LABELS[iso2] ?? iso2 }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function TransactionOverviewFeature() {
  const [rail, setRail] = useState<TransactionRail>("PG");
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [methodFilters, setMethodFilters] = useState<string[]>([]);
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [currencyFilters, setCurrencyFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  // Same split as McaTransactionTable: the relative range as picked, and its
  // window resolved once when applied (Date.now() in the handler, not render).
  const [relativeRange, setRelativeRange] = useState<RelativeRangeValue>(EMPTY_RELATIVE_RANGE);
  const [relativeWindow, setRelativeWindow] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // The drawer keeps showing its row while it animates closed, so the row is
  // held separately from the open flag.
  const [detailsRow, setDetailsRow] = useState<PartnerTransaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDetails = (row: PartnerTransaction) => {
    setDetailsRow(row);
    setDrawerOpen(true);
  };

  const railRows = ROWS[rail];
  const startTime =
    relativeWindow?.startTime ?? (dateRange.from ? toStartOfDayMs(dateRange.from) : undefined);
  const endTime =
    relativeWindow?.endTime ?? (dateRange.to ? toEndOfDayMs(dateRange.to) : undefined);
  const query = search.trim().toLowerCase();

  const filtered = railRows.filter((row) => {
    if (statusFilters.length && !statusFilters.includes(row.status)) return false;
    if (methodFilters.length && !methodFilters.includes(row.paymentMethod)) return false;
    if (countryFilters.length && !countryFilters.includes(row.country)) return false;
    if (!matchesCurrencyFilter(row.currency, currencyFilters)) return false;
    if (startTime !== undefined || endTime !== undefined) {
      const at = parseApiDateTime(row.createdAt)?.getTime();
      if (at === undefined) return false;
      if (startTime !== undefined && at < startTime) return false;
      if (endTime !== undefined && at > endTime) return false;
    }
    if (query) {
      const haystack = [row.email, row.customerName, row.id, row.merchantId]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasNarrowingFilters =
    !!query ||
    statusFilters.length > 0 ||
    methodFilters.length > 0 ||
    countryFilters.length > 0 ||
    currencyFilters.length > 0 ||
    startTime !== undefined ||
    endTime !== undefined;

  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No matching transactions",
        description: "Try a different search, or clear a filter to widen the results.",
      }
    : {
        title: "Your merchants' payments will appear here",
        description:
          "As your merchants get paid, each transaction lands here with its status, method and merchant.",
      };

  function switchRail(next: TransactionRail) {
    // Each tab has its own status options, filters and columns, so none of
    // those selections carry over; search and dates still make sense and stay.
    setRail(next);
    setStatusFilters([]);
    setMethodFilters([]);
    setCountryFilters([]);
    setCurrencyFilters([]);
    setColumnOrder(null);
    setHiddenColumns([]);
    setPage(1);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Transactions updated");
    }, 600);
  }

  function handleReport() {
    toast.message("Report download isn't connected yet", {
      description: "This screen is a design preview. Nothing was generated.",
    });
  }

  const baseColumns = buildTransactionOverviewColumns(rail, { onOpenDetails: openDetails });
  const columns = reorderColumns(baseColumns, columnOrder).filter(
    (col) => !hiddenColumns.includes(col.key)
  );
  // Actions holds the row's control, not data, so it's never listed to hide.
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({
      key: c.key,
      label: typeof c.header === "string" ? c.header : c.key,
    }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  // A function, not a shared element: the desktop and compact rows are both
  // mounted, and each needs its own FilterChipGroup (see McaTransactionTable).
  const renderFilterChips = () => (
    <FilterChipGroup className="contents">
      <DateFilterChip
        label="Date and time"
        value={dateRange}
        onChange={(next) => {
          setDateRange(next);
          setRelativeRange(EMPTY_RELATIVE_RANGE);
          setRelativeWindow(null);
          setPage(1);
        }}
        relativeValue={relativeRange}
        onRelativeChange={(next) => {
          setRelativeRange(next);
          setDateRange({ from: "", to: "" });
          setRelativeWindow(hasRelativeRange(next) ? relativeRangeToEpochMs(next) : null);
          setPage(1);
        }}
      />
      {rail === "PG" && (
        <CountryFilterChip
          options={countryOptionsFor(railRows)}
          value={countryFilters}
          onChange={(next) => {
            setCountryFilters(next);
            setPage(1);
          }}
        />
      )}
      {rail === "MCA" && (
        <CurrencyFilterChip
          options={CURRENCY_OPTIONS}
          value={currencyFilters}
          onChange={(next) => {
            setCurrencyFilters(next);
            setPage(1);
          }}
        />
      )}
      <StatusFilterChip
        options={STATUS_OPTIONS[rail]}
        selected={statusFilters}
        onChange={(next) => {
          setStatusFilters(next);
          setPage(1);
        }}
      />
      {rail === "PG" && (
        <StatusFilterChip
          label="Payment method"
          options={METHOD_OPTIONS}
          selected={methodFilters}
          onChange={(next) => {
            setMethodFilters(next);
            setPage(1);
          }}
        />
      )}
    </FilterChipGroup>
  );

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const reportButton = (
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
  );

  const tabBar = (
    <UnderlineTabs
      tabs={RAIL_TABS}
      value={rail}
      onValueChange={(v) => switchRail(v as TransactionRail)}
    />
  );

  const desktopControls = (
    <div className="flex flex-wrap items-center gap-2">
      <RotatingSearchInput
        value={search}
        onSearch={onSearch}
        words={SEARCH_WORDS[rail]}
        className="w-40 sm:w-56"
      />
      <div className="flex flex-wrap items-center gap-1.5">{renderFilterChips()}</div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={
            <Icon name="refresh" className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          }
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
        >
          Refresh
        </Button>
        <ColumnManager
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
          fixedReason="Always shown. A transaction row is unreadable without these columns."
        />
        {reportButton}
      </div>
    </div>
  );

  const compactControls = (
    <>
      <div className="flex flex-nowrap items-center gap-2">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={SEARCH_WORDS[rail]}
          className="min-w-0 flex-1"
        />
        {reportButton}
      </div>
      <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
        {renderFilterChips()}
      </div>
    </>
  );

  const pagination = {
    mode: "page",
    page,
    pageSize: PAGE_SIZE,
    total: filtered.length,
    onPageChange: setPage,
  } as const;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Transaction Overview"
        subtitle="View transaction activity across your merchants and download detailed reports."
      />

      {/* Desktop (lg+): tab bar, toolbar, grid and pager on one card surface. */}
      <DataTableCard<PartnerTransaction>
        className="hidden lg:block"
        tabs={tabBar}
        toolbar={desktopControls}
        columns={columns}
        data={pageRows}
        isLoading={false}
        rowKey={(row) => row.id}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        emptyState={
          <PlaceholderState
            variant="no-transactions"
            title={emptyCopy.title}
            description={emptyCopy.description}
            className="py-16"
          />
        }
        // The whole row opens the details drawer; the row's own buttons
        // are skipped by DataTable, as on the MCA table.
        onRowClick={openDetails}
        pagination={pagination}
        maxBodyHeight="none"
      />

      {/* Tablet + mobile (below lg): the same tabs and controls over a card list. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <div className="border-b border-border px-4 pt-3">{tabBar}</div>
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          {compactControls}
        </div>
        <DataCardList<PartnerTransaction>
          bordered={false}
          rows={pageRows}
          rowKey={(row) => row.id}
          isLoading={false}
          renderCard={(row) => <TransactionOverviewCard row={row} onOpenDetails={openDetails} />}
          emptyState={
            <PlaceholderState
              variant="no-transactions"
              size="sm"
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          }
          pagination={pagination}
        />
      </div>

      <TransactionOverviewDrawer row={detailsRow} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
