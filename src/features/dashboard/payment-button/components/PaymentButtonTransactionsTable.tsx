"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  ColumnManager,
  DataCardList,
  DataTableCard,
  EMPTY_RELATIVE_RANGE,
  Shimmer,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  hasRelativeRange,
  type RelativeRangeValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import {
  CountryFilterChip,
  DateFilterChip,
  FilterChipGroup,
  StatusFilterChip,
  relativeRangeToEpochMs,
  toEndOfDayMs,
  toStartOfDayMs,
  type DateRangeValue,
} from "@/components/common/filters/FilterChips";
import { cn } from "@/lib/utils";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { paTxnSearchApi } from "@/features/dashboard/pa-transactions/services";
import {
  PA_TRANSACTION_COLUMN_DEFS,
  buildPaColumns,
  customerName,
  getDisplayStatus,
} from "@/features/dashboard/pa-transactions/paColumns";
import { TransactionAmount } from "@/features/dashboard/pa-transactions/components/TransactionAmount";
import { TransactionPaymentMethod } from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import {
  PA_METHOD_FILTERS,
  PA_STATUS_FILTERS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/pa-transactions/constants";
import type {
  PaTransaction,
  PaTransactionsResponse,
} from "@/features/dashboard/pa-transactions/types";
import type { TableReqBody } from "@/types/transactions";

/** Tabs: All, then each PA status the Transactions page's pills already name. */
const VIEW_TABS = PA_STATUS_FILTERS.map((opt) => ({
  value: opt.value === "All" ? "all" : opt.value,
  label: opt.label,
}));
/** The same statuses as the Status chip's checklist (everything but "All"). */
const STATUS_OPTIONS = PA_STATUS_FILTERS.filter((opt) => opt.value !== "All");
const METHOD_OPTIONS = PA_METHOD_FILTERS.filter((opt) => opt.value !== "All");
/** Amount, Status and Transaction ID: a row means nothing without them. */
const FIXED_COLUMN_KEYS = ["amount", "status", "transactionId"];
const EMPTY_DATE_RANGE: DateRangeValue = { from: "", to: "" };

function PaTxnCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-5 w-28" />
        <Shimmer className="h-5 w-24" rounded="full" />
      </div>
      <Shimmer className="mt-3 h-3 w-44" />
      <Shimmer className="mt-2 h-3 w-36" />
    </div>
  );
}

/** One transaction as a card below `lg`: the table's columns, stacked. */
function PaTxnCard({ row, onOpen }: { row: PaTransaction; onOpen: (row: PaTransaction) => void }) {
  const status = getDisplayStatus(row);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open transaction ${row.gid ?? ""}`}
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(row);
        }
      }}
      className="cursor-pointer rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <div className="flex items-start justify-between gap-2">
        <TransactionAmount
          amount={parseFloat(row.totalAmount ?? "0")}
          currency={row.txnCurrency ?? "INR"}
        />
        <StatusBadgeWithTooltip
          variant={status.variant}
          label={status.label}
          trailIcon={status.trailIcon}
          tooltip={status.tooltip}
          size="sm"
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="truncate text-[12.5px] text-foreground">{customerName(row) || "—"}</span>
        <TransactionPaymentMethod row={row} />
      </div>
      <p className="mt-1.5 truncate font-mono text-[11.5px] text-muted-foreground">
        {row.gid ?? "—"}
      </p>
    </div>
  );
}

/**
 * A payment button's transactions, on the MCA Transactions table's layout:
 * tabs across the top, a search box with filter chips, Refresh / Columns /
 * Report on the right, and a card list below `lg`.
 *
 * The data is PA, since payment buttons are a PA product. It is the PA search
 * scoped the way pg-dashboard scopes its embedded CardsTable: the button's MID
 * as the merchant filter, and the button id as the full-text query. The chips
 * are the filters that search supports (pg-dashboard's CARDS_TABLE_FILTERS):
 * Date, Status, Payment method, Country. There is no Currency chip, because
 * PA search has no currency filter.
 *
 * Because the button id already occupies the full-text query, the search box
 * narrows the loaded page client-side instead: a second query would replace
 * the first rather than narrow it.
 *
 * Report is drawn but not wired. PA exports are pg-dashboard's asynchronous
 * request-then-poll flow (`/reports/txn/download` + `/reports/txn/status`),
 * which this app has not ported yet.
 */
export function PaymentButtonTransactionsTable({
  mid,
  buttonId,
}: {
  mid: string;
  buttonId: string;
}) {
  const router = useRouter();
  const countryCurrencyMap = useApp((s) => s.countryCurrencyMap);
  // Partners address the search by MID in the path; everyone else sends "".
  const { urlMid } = useResolvedMids("PA");

  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [methodFilters, setMethodFilters] = useState<string[]>([]);
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeValue>(EMPTY_DATE_RANGE);
  const [relativeRange, setRelativeRange] = useState<RelativeRangeValue>(EMPTY_RELATIVE_RANGE);
  // Resolved to epoch ms when picked, never during render (see CLAUDE.md).
  const [relativeWindow, setRelativeWindow] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const body = buildTxnRequestBody(
    {
      externalStatus: statusFilters.length ? statusFilters : undefined,
      paymentInstrument: methodFilters.length ? methodFilters : undefined,
      iso2Code: countryFilters.length ? countryFilters : undefined,
      startTime:
        relativeWindow?.startTime ?? (dateRange.from ? toStartOfDayMs(dateRange.from) : undefined),
      endTime: relativeWindow?.endTime ?? (dateRange.to ? toEndOfDayMs(dateRange.to) : undefined),
    },
    {
      searchQuery: buttonId,
      selectedMid: { key: "merchantId", value: [mid] },
      pageLimit: TRANSACTIONS_PAGE_LIMIT,
      from: (page - 1) * TRANSACTIONS_PAGE_LIMIT,
    }
  );

  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    PaTransactionsResponse,
    TableReqBody
  >(
    ["payment-button-transactions", mid, buttonId],
    paTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    !!mid
  );

  const totalCount = data?.data?.totalCount ?? 0;

  const query = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const fetched = data?.data?.data ?? [];
    if (!query) return fetched;
    return fetched.filter((row) =>
      [row.gid, row.encEmailId, customerName(row)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [data, query]);

  const countryOptions = useMemo(
    () =>
      countryCurrencyMap.map((entry) => ({
        value: entry.iso2CountryCode,
        label: entry.countryName,
        iso2: entry.iso2CountryCode,
      })),
    [countryCurrencyMap]
  );

  // Status tabs are a view, not the merchant's own narrowing (see the MCA table).
  const hasNarrowingFilters =
    !!query ||
    methodFilters.length > 0 ||
    countryFilters.length > 0 ||
    !!dateRange.from ||
    !!dateRange.to ||
    relativeWindow !== null;

  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No matching transactions",
        description: "Try a different search, or clear a filter to widen the results.",
      }
    : {
        title: "No payments yet",
        description:
          "Each payment taken through this button lands here with its status and method.",
      };

  const openTransaction = (row: PaTransaction) => {
    if (row.gid) router.push(`/pa-transactions/${encodeURIComponent(row.gid)}`);
  };

  const handleRefresh = async () => {
    const { isError: failed } = await refetch();
    if (failed) toast.error("Couldn't refresh transactions. Please try again.");
    else toast.success("Transactions updated");
  };

  const columns = buildPaColumns({
    isPartnerUser: false,
    columnOrder: columnOrder ?? undefined,
    hiddenColumns: new Set(hiddenColumns),
  });
  const reorderableColumns = PA_TRANSACTION_COLUMN_DEFS;
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  const tabValue =
    statusFilters.length === 1 && VIEW_TABS.some((tab) => tab.value === statusFilters[0])
      ? statusFilters[0]
      : "all";

  const tabBar = (
    <UnderlineTabs
      tabs={VIEW_TABS}
      value={tabValue}
      onValueChange={(v) => {
        setStatusFilters(v === "all" ? [] : [v]);
        setPage(1);
      }}
    />
  );

  // Rendered in both the desktop toolbar and the compact one; the group keeps
  // its own open state so the hidden copy never opens (see ReceiptFilterChips).
  const renderFilterChips = () => (
    <FilterChipGroup className="contents">
      <DateFilterChip
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
          setRelativeWindow(hasRelativeRange(next) ? relativeRangeToEpochMs(next) : null);
          setDateRange(EMPTY_DATE_RANGE);
          setPage(1);
        }}
      />
      <StatusFilterChip
        options={STATUS_OPTIONS}
        selected={statusFilters}
        onChange={(next) => {
          setStatusFilters(next);
          setPage(1);
        }}
      />
      <StatusFilterChip
        label="Payment method"
        options={METHOD_OPTIONS}
        selected={methodFilters}
        onChange={(next) => {
          setMethodFilters(next);
          setPage(1);
        }}
      />
      <CountryFilterChip
        options={countryOptions}
        value={countryFilters}
        onChange={(next) => {
          setCountryFilters(next);
          setPage(1);
        }}
      />
    </FilterChipGroup>
  );

  const reportButton = (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        {/* A disabled button takes no pointer events; the tip hangs off a wrapper. */}
        <TooltipTrigger asChild>
          <span tabIndex={0} className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
              className="h-auto min-h-0 py-1 text-muted-foreground"
            >
              Report
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Transaction reports are coming soon</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const desktopControls = (
    <div className="flex flex-wrap items-center gap-2">
      <RotatingSearchInput
        value={search}
        onSearch={setSearch}
        words={["customer", "email", "transaction ID"]}
        className="w-40 sm:w-56"
      />
      <div className="flex flex-wrap items-center gap-1.5">{renderFilterChips()}</div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={
            <Icon name="refresh" className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          }
          onClick={() => void handleRefresh()}
          disabled={isFetching}
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
          onSearch={setSearch}
          words={["customer", "email", "transaction ID"]}
          className="min-w-0 flex-1"
        />
        {reportButton}
      </div>
      <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
        {renderFilterChips()}
      </div>
    </>
  );

  const errorPanel = isError ? (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
        <Icon name="alert-circle" size={22} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load transactions</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Something went wrong while fetching data.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void refetch()}>
        Retry
      </Button>
    </div>
  ) : undefined;

  const pagination = {
    mode: "page",
    page,
    pageSize: TRANSACTIONS_PAGE_LIMIT,
    total: totalCount,
    onPageChange: setPage,
  } as const;

  return (
    <>
      <DataTableCard<PaTransaction>
        className="hidden lg:block"
        title="Linked transactions"
        tabs={tabBar}
        toolbar={desktopControls}
        columns={columns}
        data={rows}
        isLoading={isPending}
        rowKey={(row) =>
          row.gid ?? `${row.merchantId ?? ""}-${row.formattedCreationDateTime ?? ""}`
        }
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
        errorState={errorPanel}
        onRowClick={openTransaction}
        pagination={pagination}
        maxBodyHeight="none"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <div className="border-b border-border px-4 pt-3">{tabBar}</div>
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          {compactControls}
        </div>
        <DataCardList<PaTransaction>
          bordered={false}
          rows={rows}
          rowKey={(row) =>
            row.gid ?? `${row.merchantId ?? ""}-${row.formattedCreationDateTime ?? ""}`
          }
          isLoading={isPending}
          renderCard={(row) => <PaTxnCard row={row} onOpen={openTransaction} />}
          renderSkeleton={() => <PaTxnCardSkeleton />}
          emptyState={
            <PlaceholderState
              variant="no-transactions"
              size="sm"
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          }
          errorState={errorPanel}
          pagination={pagination}
        />
      </div>
    </>
  );
}
