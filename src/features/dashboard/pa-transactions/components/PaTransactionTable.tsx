"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ColumnManager, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import {
  DateFilterChip,
  EMPTY_RELATIVE_RANGE,
  FilterChipGroup,
  StatusFilterChip,
  hasRelativeRange,
  relativeRangeToEpochMs,
  toEndOfDayMs,
  toStartOfDayMs,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import { cn } from "@/lib/utils";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { paTxnSearchApi } from "@/features/dashboard/pa-transactions/services";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { buildPaColumns } from "@/features/dashboard/pa-transactions/columns";
import { reorderColumns } from "@/lib/utils/columns";
import { TransactionDetailsDrawer } from "@/features/dashboard/pa-transactions/components/TransactionDetailsDrawer";
import { TransactionDetailView } from "@/features/dashboard/pa-transactions/components/TransactionDetailFeature";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import { useDrawerMorph } from "@/components/common/drawer-morph/useDrawerMorph";
import { setScrollTop } from "@/components/common/drawer-morph/drawerMorph";
import {
  PA_STATUS_FILTERS,
  PA_METHOD_FILTERS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/pa-transactions/constants";
import type {
  PaTransaction,
  PaTransactionsResponse,
} from "@/features/dashboard/pa-transactions/types";
import type { TableReqBody } from "@/types/transactions";

// Status/Method chips drop "All" — an empty selection already means "every
// value", the same convention every other filter chip in the app follows.
const STATUS_OPTIONS = PA_STATUS_FILTERS.filter((o) => o.value !== "All");
const METHOD_OPTIONS = PA_METHOD_FILTERS.filter((o) => o.value !== "All");

// Amount/Status/Date are unreadable to drop, same rule MCA's table pins.
const FIXED_COLUMN_KEYS = ["totalAmount", "externalStatus", "formattedCreationDateTime"];

interface PaTransactionTableProps {
  /** Fired as the full-page details view opens and closes, so the page can
   *  hide what belongs to the list (title row, metrics) while it shows. */
  onDetailsOpenChange?: (open: boolean) => void;
}

export function PaTransactionTable({ onDetailsOpenChange }: PaTransactionTableProps) {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const contentEl = useContentAreaElement();
  const { urlMid, midFilter, isReady } = useResolvedMids("PA");

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount; the URL is not kept in sync as
  // the merchant edits filters afterwards.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [methodFilters, setMethodFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  // Mutually exclusive with dateRange, same split as MCA's table — applying
  // either clears the other, so at most one start/end pair reaches the body.
  const [relativeRange, setRelativeRange] = useState<RelativeRangeValue>(EMPTY_RELATIVE_RANGE);
  const [relativeWindow, setRelativeWindow] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
  // The transaction the drawer/page opened on, held as the object itself: a
  // refetch can drop it from `rows` (a filter, a page change) and the open
  // view must not go blank when it does.
  const [detailsRecord, setDetailsRecord] = useState<PaTransaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The full-page view replaces the table in place, so Back returns to the
  // same filters, page and scroll for free.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const showPage = (open: boolean) => {
    setDetailsOpen(open);
    onDetailsOpenChange?.(open);
  };
  const morph = useDrawerMorph({
    id: "pa-transaction",
    // main's p-6, the page's title (32) and Back row (20), each followed by
    // its space-y-5 gap.
    pageAnchorOffset: 118,
    contentEl,
    showPage,
    setDrawerOpen,
  });

  const startTime =
    relativeWindow?.startTime ?? (dateRange.from ? toStartOfDayMs(dateRange.from) : undefined);
  const endTime =
    relativeWindow?.endTime ?? (dateRange.to ? toEndOfDayMs(dateRange.to) : undefined);

  const body = buildTxnRequestBody(
    {
      externalStatus: statusFilters.length ? statusFilters : undefined,
      paymentInstrument: methodFilters.length ? methodFilters : undefined,
      startTime,
      endTime,
    },
    {
      searchQuery: search || undefined,
      selectedMid: midFilter,
      pageLimit: TRANSACTIONS_PAGE_LIMIT,
      from: (page - 1) * TRANSACTIONS_PAGE_LIMIT,
    }
  );

  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    PaTransactionsResponse,
    TableReqBody
  >(
    ["pa-transactions", urlMid, ...(midFilter?.value ?? [])],
    paTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    isReady
  );

  const rows = data?.data?.data ?? [];
  const totalCount = data?.data?.totalCount ?? 0;

  // Which empty state applies: nothing matched what was asked for, or nothing
  // has come in yet. No filter defaults to "everything selected", so an empty
  // array on either chip doesn't count as narrowing.
  const hasNarrowingFilters =
    !!search.trim() ||
    statusFilters.length > 0 ||
    methodFilters.length > 0 ||
    !!dateRange.from ||
    !!dateRange.to ||
    relativeWindow !== null;

  /** Payments arrive rather than being created here, so the first-time state
   *  says what will land here instead of pushing an action this page lacks. */
  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No matching transactions",
        description: "Try a different search, or clear a filter to widen the results.",
      }
    : {
        title: "Your payments will appear here",
        description:
          "As customers pay you, each transaction lands here with its status, method and amount.",
      };

  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const detailsRow =
    rows.find((r) => r.gid === detailsRowId) ??
    (detailsRecord?.gid === detailsRowId ? detailsRecord : null);

  const onViewDetails = (row: PaTransaction) => {
    setDetailsRowId(row.gid ?? null);
    setDetailsRecord(row);
    morph.reset();
    setDrawerOpen(true);
  };

  // Expand grows the drawer into the page in place; the page mounts once it
  // has landed (useDrawerMorph). The table's scroll is captured here, the
  // point it actually leaves the screen, for Back/Collapse to restore.
  const expandToPage = (row: PaTransaction) => {
    if (contentEl) setScrollPosition(contentEl.scrollTop);
    setDetailsRowId(row.gid ?? null);
    setDetailsRecord(row);
    if (morph.expand()) return;
    setDrawerOpen(false);
    showPage(true);
  };

  const collapseToDrawer = () => {
    if (morph.collapse()) return;
    showPage(false);
    setDrawerOpen(true);
  };

  const closeDetails = () => {
    morph.reset();
    showPage(false);
  };

  // Puts the table back where it was once it is in the DOM again, after the
  // page unmounts (Back, or Collapse's swap under the drawer).
  useEffect(() => {
    if (!detailsOpen && contentEl) setScrollTop(contentEl, scrollPosition);
  }, [detailsOpen, contentEl, scrollPosition]);

  const handleRefresh = () => void refetch();

  const baseColumns = buildPaColumns(isPartnerUser);
  const orderedColumns = reorderColumns(baseColumns, columnOrder);
  const columns = orderedColumns.filter((col) => !hiddenColumns.includes(col.key));
  const reorderableColumns = baseColumns.map((c) => ({
    key: c.key,
    label: typeof c.header === "string" ? c.header : c.key,
  }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  if (detailsOpen && detailsRow) {
    return (
      <>
        <TransactionDetailView
          transaction={detailsRow}
          onBack={closeDetails}
          onCollapse={collapseToDrawer}
        />
        <TransactionDetailsDrawer
          transaction={detailsRow}
          open={drawerOpen}
          onOpenChange={morph.onDrawerOpenChange}
          onExpand={expandToPage}
          morph={morph.morph}
          onMorphStep={morph.onMorphStep}
        />
      </>
    );
  }

  return (
    <>
      <DataTableCard<PaTransaction>
        /* Search, the Date/Status/Method chips, then Refresh and Columns pushed
         right — the same toolbar shape every table in the app shares. */
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <RotatingSearchInput
              value={search}
              onSearch={onSearch}
              words={["email", "transaction ID", "order ID"]}
              className="w-40 sm:w-56"
            />

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
                label="Method"
                options={METHOD_OPTIONS}
                selected={methodFilters}
                onChange={(next) => {
                  setMethodFilters(next);
                  setPage(1);
                }}
              />
            </FilterChipGroup>

            <div className="ml-auto flex items-center gap-2">
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
                onClick={handleRefresh}
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
            </div>
          </div>
        }
        errorState={
          isError ? (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                <Icon name="alert-circle" size={22} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Couldn&apos;t load transactions
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Something went wrong while fetching data.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : undefined
        }
        emptyState={
          <PlaceholderState
            variant="empty-table"
            title={emptyCopy.title}
            description={emptyCopy.description}
            className="py-16"
          />
        }
        columns={columns}
        data={rows}
        isLoading={isPending}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        rowKey={(row) =>
          row.gid ??
          `${row.merchantId ?? ""}-${row.formattedCreationDateTime ?? ""}-${row.totalAmount ?? ""}`
        }
        pagination={{
          mode: "page",
          page,
          pageSize: TRANSACTIONS_PAGE_LIMIT,
          total: totalCount,
          onPageChange: setPage,
        }}
        maxBodyHeight="none"
        onRowClick={onViewDetails}
        rowAction={(row) => (
          <Button
            variant="outline"
            size="sm"
            rightIcon={<Icon name="chevron-right" className="w-2.5 h-2.5" />}
            className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
            onClick={() => onViewDetails(row)}
          >
            View details
          </Button>
        )}
      />

      <TransactionDetailsDrawer
        transaction={detailsRow}
        open={drawerOpen}
        onOpenChange={morph.onDrawerOpenChange}
        onExpand={expandToPage}
        morph={morph.morph}
        onMorphStep={morph.onMorphStep}
      />
    </>
  );
}
