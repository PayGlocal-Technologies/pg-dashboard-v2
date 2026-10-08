"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button, ColumnManager, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  CurrencyFilterChip,
  FilterChipGroup,
  StatusFilterChip,
} from "@/components/common/filters/FilterChips";
import {
  TransactionDateTimeFilter,
  type TransactionDateTimeValue,
} from "@/features/dashboard/pa-transactions/components/TransactionDateTimeFilter";
import {
  TransactionAmountFilter,
  type AmountRangeValue,
} from "@/features/dashboard/pa-transactions/components/TransactionAmountFilter";
import {
  TransactionDetailsDrawer,
  TransactionDrawerBody,
  PA_DRAWER_WIDTH_PX,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailsDrawer";
import { TransactionDetailsPage } from "@/features/dashboard/pa-transactions/components/TransactionDetailsPage";
import { useDrawerExpand } from "@/components/common/useDrawerExpand";
import { reorderColumns } from "@/lib/utils/columns";
import { cn } from "@/lib/utils";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { paTxnSearchApi } from "@/features/dashboard/pa-transactions/services";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { buildPaColumns } from "@/features/dashboard/pa-transactions/columns";
import {
  PA_CURRENCY_OPTIONS,
  PA_METHOD_CHIP_OPTIONS,
  PA_ORDER_STATUS_OPTIONS,
  PA_PAYMENT_STATUS_OPTIONS,
  PA_VIEW_TABS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/pa-transactions/constants";

import type {
  PaTransaction,
  PaTransactionsResponse,
} from "@/features/dashboard/pa-transactions/types";
import type { TableReqBody } from "@/types/transactions";
import { rowActionColumn } from "@/components/common/rowActionColumn";

/** Always shown: a transaction row is unreadable without these. */
const FIXED_COLUMN_KEYS = ["totalAmount", "externalStatus", "formattedCreationDateTime"];

/** Same set, any order: which tab (if any) a status selection is. */
const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v) => b.includes(v));

interface PaTransactionTableProps {
  /** Fired as the full-page details view opens (true) and closes (false), so
   *  the page can hide its header and metric cards while one transaction is
   *  being viewed. */
  onDetailsOpenChange?: (open: boolean) => void;
}

export function PaTransactionTable({ onDetailsOpenChange }: PaTransactionTableProps = {}) {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PA");

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount; the URL is not kept in sync as
  // the merchant edits filters afterwards.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  // The tabs are a shortcut onto the Status chip's own selection (as on MCA
  // Transactions), not a second filter: one state, both controls.
  const [statuses, setStatuses] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [dateTime, setDateTime] = useState<TransactionDateTimeValue | undefined>();
  const [amount, setAmount] = useState<AmountRangeValue | undefined>();
  const [page, setPage] = useState(1);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const body = buildTxnRequestBody(
    {
      externalStatus: statuses.length ? statuses : undefined,
      paymentInstrument: methods.length ? methods : undefined,
      orderStatus: orderStatuses.length ? orderStatuses : undefined,
      currency: currencies.length ? currencies : undefined,
      startTime: dateTime?.startTime,
      endTime: dateTime?.endTime,
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

  // Amount narrows the page that came back. STOPGAP: the search request has
  // no amount-range field, so this can't reach the server yet and only
  // filters the rows on screen. TODO(integration): send it once the field
  // is confirmed against pg-dashboard.
  const rows = (data?.data?.data ?? []).filter((row) => {
    if (!amount) return true;
    const value = parseFloat(row.totalAmount ?? "");
    if (Number.isNaN(value)) return false;
    if (amount.min != null && value < amount.min) return false;
    if (amount.max != null && value > amount.max) return false;
    return true;
  });
  const totalCount = data?.data?.totalCount ?? 0;

  // Which empty state applies: nothing matched what was asked for, or nothing
  // has come in yet. Both controls default to "All", so neither counts as a
  // filter until the merchant actually changes one.
  const hasNarrowingFilters =
    !!search.trim() ||
    statuses.length > 0 ||
    methods.length > 0 ||
    orderStatuses.length > 0 ||
    currencies.length > 0 ||
    !!dateTime ||
    !!amount;

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

  const onStatuses = (v: string[]) => {
    setStatuses(v);
    setPage(1);
  };
  const onMethods = (v: string[]) => {
    setMethods(v);
    setPage(1);
  };
  // Every filter change goes back to page 1.
  const resetPage =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  // A refetch can finish faster than a spinner is noticeable, so the outcome
  // is confirmed explicitly.
  const handleRefresh = async () => {
    const { isError: failed } = await refetch();
    if (failed) toast.error("Couldn't refresh transactions. Please try again.");
    else toast.success("Transactions updated");
  };

  // Details: a row opens the drawer, Expand widens it into a full page in
  // place of the list, Collapse and Back return (see useDrawerExpand). The
  // page also hides this page's header, so it lands from the slot's parent.
  const {
    record,
    pageOpen,
    drawerOpen,
    instantDrawer,
    slotRef,
    open: onViewDetails,
    onDrawerOpenChange,
    expand,
    collapse,
    back,
    morphLayer,
  } = useDrawerExpand<PaTransaction>({
    drawerWidthPx: PA_DRAWER_WIDTH_PX,
    measureFrom: "parent",
    onPageOpenChange: onDetailsOpenChange,
  });

  const baseColumns = buildPaColumns(isPartnerUser);
  const columns = reorderColumns(baseColumns, columnOrder).filter(
    (col) => !hiddenColumns.includes(col.key)
  );
  const reorderableColumns = baseColumns.map((c) => ({
    key: c.key,
    label: typeof c.header === "string" ? c.header : c.key,
  }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  const tabValue =
    PA_VIEW_TABS.find((t) => t.value !== "all" && sameSet(t.statuses, statuses))?.value ?? "all";
  const tabBar = (
    <UnderlineTabs
      tabs={PA_VIEW_TABS.map(({ value, label }) => ({ value, label }))}
      value={tabValue}
      onValueChange={(v) =>
        onStatuses([...(PA_VIEW_TABS.find((t) => t.value === v)?.statuses ?? [])])
      }
    />
  );

  // The page replaces the list in place (same instance, same filter, page
  // and search state), so Back restores the list as it was for free.
  const view =
    pageOpen && record ? (
      <TransactionDetailsPage transaction={record} onBack={back} onCollapse={collapse} />
    ) : (
      <DataTableCard<PaTransaction>
        // Flat buttons throughout the card (row action, pager), not flux's
        // default control lift.
        className="[&_button]:shadow-none"
        tabs={tabBar}
        toolbar={
          // [&_*]:shadow-none also flattens the filter chips, whose shell
          // carries flux's shadow with no className to override it. Their
          // popovers are portalled out, so they keep theirs.
          <div className="flex flex-wrap items-center gap-2 [&_*]:shadow-none">
            <RotatingSearchInput
              value={search}
              onSearch={onSearch}
              words={["email", "transaction ID", "order ID"]}
              className="w-40 sm:w-56"
            />
            <div className="hidden h-5 w-px bg-border sm:block" />
            <FilterChipGroup className="flex flex-wrap items-center gap-1.5">
              <TransactionDateTimeFilter
                value={dateTime}
                onChange={resetPage(setDateTime)}
                triggerLabel="Date and time"
              />
              <CurrencyFilterChip
                options={PA_CURRENCY_OPTIONS}
                value={currencies}
                onChange={resetPage(setCurrencies)}
              />
              <StatusFilterChip
                options={PA_PAYMENT_STATUS_OPTIONS}
                selected={statuses}
                onChange={onStatuses}
              />
              <StatusFilterChip
                label="Payment method"
                options={PA_METHOD_CHIP_OPTIONS}
                selected={methods}
                onChange={onMethods}
              />
              <StatusFilterChip
                label="Order status"
                options={PA_ORDER_STATUS_OPTIONS}
                selected={orderStatuses}
                onChange={resetPage(setOrderStatuses)}
              />
              <TransactionAmountFilter value={amount} onChange={resetPage(setAmount)} />
            </FilterChipGroup>
            <div className="ml-auto flex items-center gap-2">
              {/* Re-runs the same query; the icon spins while it's in flight. */}
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
                className="h-auto min-h-0 shrink-0 py-1 text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.12)]!"
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
                // This card flattens every shadow inside it ([&_*]:shadow-none
                // above), so the toolbar's lift is restated as important, as
                // the Refresh button beside it does.
                className="shadow-[0_1px_2px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.12)]!"
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
        columns={[
          ...columns,
          rowActionColumn((row) => (
            <Button
              variant="outline"
              size="sm"
              rightIcon={<Icon name="chevron-right" className="w-2.5 h-2.5" />}
              // Revealed on row hover or focus, as on MCA Transactions.
              className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap shadow-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              onClick={() => onViewDetails(row)}
            >
              View details
            </Button>
          )),
        ]}
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
        // The whole row opens the drawer; clicks on the row's own buttons are
        // skipped by DataTable, so View details does only its own job.
        onRowClick={onViewDetails}
      />
    );

  // One stable slot for the hand-off layer, so swapping list and page under
  // it never remounts it and replays the animation.
  return (
    <>
      <div ref={slotRef}>{view}</div>
      <TransactionDetailsDrawer
        transaction={record}
        open={drawerOpen}
        onOpenChange={onDrawerOpenChange}
        onExpand={expand}
        instant={instantDrawer}
      />
      {/* The drawer's and the page's real insides for the hand-off (inert,
          so the handlers never fire). */}
      {morphLayer((transaction) => ({
        drawer: (
          <TransactionDrawerBody transaction={transaction} onClose={() => {}} onExpand={() => {}} />
        ),
        page: (
          <TransactionDetailsPage
            transaction={transaction}
            onBack={() => {}}
            onCollapse={() => {}}
            decorative
          />
        ),
      }))}
    </>
  );
}
