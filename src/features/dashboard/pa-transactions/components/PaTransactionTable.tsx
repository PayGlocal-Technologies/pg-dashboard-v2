"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ColumnManager, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { FilterChipGroup } from "@/components/common/filters/FilterChips";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import {
  TransactionAmountFilter,
  type AmountRangeValue,
} from "@/features/dashboard/pa-transactions/components/TransactionAmountFilter";
import {
  TransactionDateTimeFilter,
  type TransactionDateTimeValue,
} from "@/features/dashboard/pa-transactions/components/TransactionDateTimeFilter";
import { useApp } from "@/stores/useApp";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import {
  buildDisputeIdColumn,
  buildPaColumns,
  buildRefundIdColumn,
  customerName,
  getDisplayStatusBucket,
  PA_TRANSACTION_COLUMN_DEFS,
  PA_TRANSACTION_COLUMN_ORDER,
  type TransactionStatusBucket,
} from "@/features/dashboard/pa-transactions/paColumns";
import { parseFormattedTimestamp } from "@/features/dashboard/pa-transactions/financial/generateTimeline";
import { MOCK_PA_TRANSACTIONS } from "@/features/dashboard/pa-transactions/mockRows";
import {
  PA_METHOD_FILTERS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/pa-transactions/constants";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

type StatusSegment = "All" | TransactionStatusBucket;

// Same 5-tab shape as Dispute Management's own SegmentedTabs (All + one tab
// per real status bucket) — deliberately not the earlier 6-pill row, which
// used flux Buttons instead of SegmentedTabs and included a "Pending" pill
// this page's own spec conversation dropped. Values are the exact
// TransactionStatusBucket strings buildPaColumns/getDisplayStatusBucket
// already use, so there's only ever one status vocabulary in play.
const STATUS_SEGMENTS: { value: StatusSegment; label: string }[] = [
  { value: "All", label: "All" },
  { value: "success", label: "Success" },
  { value: "refunded", label: "Refunded" },
  { value: "disputed", label: "Disputed" },
  { value: "failed", label: "Failed" },
];

/** The table's own multi-select "Status" chip, distinct from the
 * single-select SegmentedTabs above it — same "combine any two segments"
 * purpose Dispute Management's own Status chip serves. */
const STATUS_FILTER_OPTIONS = STATUS_SEGMENTS.filter((s) => s.value !== "All").map((s) => ({
  value: s.value,
  label: s.label,
}));

const METHOD_FILTER_OPTIONS = PA_METHOD_FILTERS.filter((opt) => opt.value !== "All").map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

/** The rows a segmented tab actually shows. Refunded/Disputed are NOT
 * mutually exclusive buckets here: a refund and a dispute are separate
 * events that both live on the same parent transaction (linked to its one
 * transaction ID via their own refund/dispute IDs), so a transaction that
 * is genuinely both refunded and disputed — chip reads "Refunded and
 * disputed" — belongs under BOTH tabs at once, each still showing the
 * parent row itself (never a flattened child pseudo-row) with its own full
 * combined status chip. Presence of a refund/dispute event is therefore
 * what gates these two tabs, not the aggregate bucket precedence that
 * gates Success/Failed. */
function rowsForSegment(segment: StatusSegment, source: PaTransaction[]): PaTransaction[] {
  if (segment === "refunded") return source.filter((row) => (row.refunds ?? []).length > 0);
  if (segment === "disputed") return source.filter((row) => (row.disputes ?? []).length > 0);
  if (segment === "failed") return source.filter((row) => getDisplayStatusBucket(row) === "failed");
  if (segment === "success")
    return source.filter((row) => getDisplayStatusBucket(row) === "success");
  return source;
}

export function PaTransactionTable() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const router = useRouter();
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount; the URL is not kept in sync as
  // the merchant edits filters afterwards.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statusSegment, setStatusSegment] = useState<StatusSegment>("All");
  const [statusFilter, setStatusFilter] = useState<string[] | undefined>(undefined);
  const [currency, setCurrency] = useState<string[] | undefined>(undefined);
  const [method, setMethod] = useState<string[] | undefined>(undefined);
  const [amountRange, setAmountRange] = useState<AmountRangeValue | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<TransactionDateTimeValue | undefined>(undefined);

  const [columnOrder, setColumnOrder] = useState<string[]>(PA_TRANSACTION_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // TODO(integration): this table is mock data ONLY for now — see
  // mockRows.ts (one row per status-vocabulary term). It used to call
  // paTxnSearchApi and only fall back to MOCK_PA_TRANSACTIONS once that
  // came back empty, but a real environment's own transactions (whatever
  // real, narrow set of statuses they happen to carry) then took over and
  // the full demo set — the entire reason this page needs to show every
  // status at once — never rendered at all. Re-wire this to usePostQuery +
  // paTxnSearchApi (see the previous version of this file in git history
  // for the exact call) once there's a real status-vocabulary-aligned
  // endpoint to demo against instead of a mock one; until then this always
  // shows the full mock set, unconditionally.
  const isPending = false;
  const isError = false;
  const refetch = () => Promise.resolve();
  const sourceRows = MOCK_PA_TRANSACTIONS;

  const rows = useMemo(() => {
    let result = rowsForSegment(statusSegment, sourceRows);

    // Rows are always parent-level now (see rowsForSegment), so the
    // multi-select Status chip can narrow on top of any tab, not just "All".
    if (statusFilter?.length) {
      result = result.filter((row) => statusFilter.includes(getDisplayStatusBucket(row)));
    }

    if (currency?.length) {
      result = result.filter((row) => currency.includes(row.txnCurrency ?? ""));
    }

    if (method?.length) {
      result = result.filter((row) => method.includes(row.paymentInstrument ?? ""));
    }

    if (amountRange) {
      result = result.filter((row) => {
        const amount = parseFloat(row.totalAmount ?? "0");
        if (amountRange.min != null && amount < amountRange.min) return false;
        if (amountRange.max != null && amount > amountRange.max) return false;
        return true;
      });
    }

    if (dateFilter) {
      result = result.filter((row) => {
        const t = parseFormattedTimestamp(row.formattedCreationDateTime);
        return t >= dateFilter.startTime && t <= dateFilter.endTime;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (row) =>
          customerName(row).toLowerCase().includes(q) ||
          (row.encEmailId ?? "").toLowerCase().includes(q) ||
          (row.gid ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [statusSegment, statusFilter, currency, method, amountRange, dateFilter, search, sourceRows]);

  // Built off the currently loaded source (not the filtered result, so
  // picking a currency doesn't shrink the list of currencies left to pick
  // from), same pattern Payment Links' own Currency chip uses.
  const currencyOptions = useMemo(
    () =>
      Array.from(new Set(sourceRows.map((row) => row.txnCurrency).filter(Boolean))).map((c) => ({
        value: c as string,
        label: c as string,
      })),
    [sourceRows]
  );

  const hasActiveFilters =
    !!statusFilter?.length ||
    !!currency?.length ||
    !!method?.length ||
    !!amountRange ||
    !!dateFilter ||
    search !== "";

  const onClearFilters = () => {
    setStatusFilter(undefined);
    setCurrency(undefined);
    setMethod(undefined);
    setAmountRange(undefined);
    setDateFilter(undefined);
    setSearch("");
  };

  const onResetColumns = () => {
    setColumnOrder(PA_TRANSACTION_COLUMN_ORDER);
    setHiddenColumns(new Set());
  };

  // Rows in this table are always the parent transaction now — a refund or
  // dispute is never its own row here (see rowsForSegment) — so "View
  // details" always opens the parent's own transaction page. Its Linked
  // Transactions section is what surfaces the sibling refund/dispute (see
  // linkedChildRecords.ts's getRefundDetailLinkedRows/getDisputeDetailLinkedRows).
  // The detail page reads the transaction from useTransactionDetail (an
  // in-memory store, not fetched independently by ID, see
  // TransactionDetailFeature's own not-found fallback), so it must be seeded
  // here BEFORE navigating — same pattern TransactionDetailFeature's own
  // goToDetail/DisputeDetailFeature's goToLinked already use.
  const onViewDetails = (row: PaTransaction) => {
    setStoredTransaction(row);
    router.push(`/pa-transactions/${encodeURIComponent(row.gid ?? "")}`);
  };

  const baseColumns = buildPaColumns({ isPartnerUser, columnOrder, hiddenColumns });
  // Refunded/Disputed each swap the parent's own Transaction ID column for
  // just the one event-ID column that tab is about — Transaction ID isn't
  // shown (the parent link lives in "View details"/Linked Transactions
  // instead), and the OTHER event's ID column isn't shown either, since a
  // row on the Refunded tab is there because it has a refund, not because
  // it also happens to have a dispute.
  let columns = baseColumns;
  if (statusSegment === "refunded") {
    columns = [...baseColumns.filter((c) => c.key !== "transactionId"), buildRefundIdColumn()];
  } else if (statusSegment === "disputed") {
    columns = [...baseColumns.filter((c) => c.key !== "transactionId"), buildDisputeIdColumn()];
  }

  return (
    <DataTableCard<PaTransaction>
      tabs={
        <SegmentedTabs
          options={STATUS_SEGMENTS}
          value={statusSegment}
          onChange={(v) => setStatusSegment(v as StatusSegment)}
        />
      }
      /* Search, then the Date/Currency/Status/Payment method/Amount filter
         chips, matching Dispute Management's own toolbar shape exactly —
         one FilterChipGroup so opening one chip closes whichever other one
         was open, a Clear button that only appears once something is
         actually set, and ColumnManager pinned to the far right. */
      toolbar={
        <div className="flex items-center gap-2.5 flex-wrap">
          <RotatingSearchInput
            value={search}
            onSearch={setSearch}
            words={["email", "transaction ID", "order ID"]}
            className="min-w-40 max-w-xs flex-1"
          />

          <div className="hidden sm:block h-4 w-px bg-border" />

          <FilterChipGroup className="flex items-center gap-2 flex-wrap">
            <TransactionDateTimeFilter value={dateFilter} onChange={setDateFilter} />
            <MultiSelectChipFilter
              value={currency}
              options={currencyOptions}
              onChange={setCurrency}
              placeholder="Currency"
            />
            <MultiSelectChipFilter
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={setStatusFilter}
              placeholder="Status"
            />
            <MultiSelectChipFilter
              value={method}
              options={METHOD_FILTER_OPTIONS}
              onChange={setMethod}
              placeholder="Payment method"
            />
            <TransactionAmountFilter value={amountRange} onChange={setAmountRange} />
          </FilterChipGroup>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="x" className="w-3 h-3" />}
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <ColumnManager
              columns={PA_TRANSACTION_COLUMN_DEFS}
              order={columnOrder}
              onOrderChange={setColumnOrder}
              hiddenKeys={[...hiddenColumns]}
              onHiddenKeysChange={(next) => setHiddenColumns(new Set(next))}
              onReset={onResetColumns}
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
          variant="no-transactions"
          title="No transactions found"
          description="Try adjusting your filters or search query"
          className="py-16"
        />
      }
      columns={columns}
      data={rows}
      isLoading={isPending}
      emptyTitle="No transactions found"
      emptyDescription="Try adjusting your filters or search query"
      rowKey={(row) =>
        row.gid ?? `${row.merchantId ?? ""}-${row.formattedCreationDateTime ?? ""}-${row.totalAmount ?? ""}`
      }
      pagination={{
        mode: "client",
        pageSize: TRANSACTIONS_PAGE_LIMIT,
      }}
      maxBodyHeight="none"
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
  );
}
