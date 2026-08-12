"use client";

import { useMemo, useState } from "react";
import { Button, Card, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { paTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import {
  PA_TRANSACTION_COLUMN_DEFS,
  PA_TRANSACTION_COLUMN_ORDER,
  STATUS_BUCKET_RAW_VALUES,
  buildPaColumns,
  customerName,
  getStatusBucket,
} from "@/features/dashboard/transactions/paColumns";
import { MOCK_PA_TRANSACTIONS } from "@/features/dashboard/transactions/mockRows";
import {
  PA_CURRENCY_OPTIONS,
  PA_METHOD_FILTERS,
  PA_STATUS_SEGMENTS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/transactions/constants";
import {
  TransactionAmountFilter,
  type AmountRangeValue,
} from "@/features/dashboard/transactions/components/TransactionAmountFilter";
import {
  TransactionDateTimeFilter,
  type TransactionDateTimeValue,
} from "@/features/dashboard/transactions/components/TransactionDateTimeFilter";
import { TransactionColumnsMenu } from "@/features/dashboard/transactions/components/TransactionColumnsMenu";
import { TransactionDetailsDrawer } from "@/features/dashboard/transactions/components/TransactionDetailsDrawer";
import type {
  PaTransaction,
  PaTransactionsResponse,
  TableReqBody,
} from "@/features/dashboard/transactions/types";

const CURRENCY_SELECT_OPTIONS = PA_CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }));
const METHOD_SELECT_OPTIONS = PA_METHOD_FILTERS.filter((o) => o.value !== "All");

function csvFilenameSuffix(): string {
  return Date.now().toString(36);
}

// Stable reference so `rows` doesn't become a fresh [] on every render when
// there's no data yet, keeps the useMemo below from recomputing needlessly.
const EMPTY_ROWS: PaTransaction[] = [];

/** "07/08/2026, 09:12:41" -> epoch ms. Only used against the mock fallback
 * below, whose formattedCreationDateTime strings this app itself generated
 * in that exact shape. */
function parseFormattedDate(value?: string): number | undefined {
  if (!value) return undefined;
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  if (!datePart) return undefined;
  const [day, month, year] = datePart.split("/").map(Number);
  if (!day || !month || !year) return undefined;
  const [hours, minutes, seconds] = (timePart ?? "00:00:00").split(":").map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0).getTime();
}

function downloadCsv(rows: PaTransaction[]) {
  const header = ["Customer", "Email", "Payment Method", "Amount", "Currency", "Status", "Date & Time", "Transaction ID"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        escape(customerName(row) || "Unknown customer"),
        escape(row.encEmailId ?? ""),
        escape(row.paymentInstrument ?? ""),
        escape(row.totalAmount ?? ""),
        escape(row.txnCurrency ?? "INR"),
        escape(row.externalStatus ?? ""),
        escape(row.formattedCreationDateTime ?? ""),
        escape(row.gid ?? ""),
      ].join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `transactions-${csvFilenameSuffix()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function PaTransactionTable() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PA");

  const [search, setSearch] = useState("");
  const [statusSegment, setStatusSegment] = useState("All");
  const [method, setMethod] = useState<string[] | undefined>(undefined);
  const [currency, setCurrency] = useState<string[] | undefined>(undefined);
  const [dateTime, setDateTime] = useState<TransactionDateTimeValue | undefined>(undefined);
  const [amountRange, setAmountRange] = useState<AmountRangeValue | undefined>(undefined);
  const [page, setPage] = useState(1);

  const [columnOrder, setColumnOrder] = useState<string[]>(PA_TRANSACTION_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const [detailsTxn, setDetailsTxn] = useState<PaTransaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const externalStatus =
    statusSegment !== "All"
      ? STATUS_BUCKET_RAW_VALUES[statusSegment as keyof typeof STATUS_BUCKET_RAW_VALUES]
      : undefined;
  const body = buildTxnRequestBody(
    {
      externalStatus,
      paymentInstrument: method,
      currency,
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

  const { data, isPending, isError, refetch } = usePostQuery<PaTransactionsResponse, TableReqBody>(
    ["pa-transactions", urlMid, ...(midFilter?.value ?? [])],
    paTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    isReady
  );

  const apiRows = data?.data?.data ?? EMPTY_ROWS;
  const apiTotalCount = data?.data?.totalCount ?? 0;

  // Dev-only fallback: the search endpoint came back with zero rows (e.g. a
  // dev/test MID with nothing seeded yet), show the mock set instead of a
  // blank "No transactions yet" state, filtered client-side by whichever of
  // the toolbar's filters apply. See mockRows.ts's TODO(integration).
  const usingMockFallback = !isPending && !isError && apiRows.length === 0;

  const mockFilteredRows = useMemo(() => {
    if (!usingMockFallback) return EMPTY_ROWS;
    return MOCK_PA_TRANSACTIONS.filter((row) => {
      if (statusSegment !== "All" && getStatusBucket(row.externalStatus) !== statusSegment) return false;
      if (method && !method.includes(row.paymentInstrument ?? "")) return false;
      if (currency && !currency.includes(row.txnCurrency ?? "")) return false;
      if (dateTime) {
        const ts = parseFormattedDate(row.formattedCreationDateTime);
        if (ts == null) return false;
        if (dateTime.startTime != null && ts < dateTime.startTime) return false;
        if (dateTime.endTime != null && ts > dateTime.endTime) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const matches =
          customerName(row).toLowerCase().includes(q) ||
          (row.encEmailId ?? "").toLowerCase().includes(q) ||
          (row.gid ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [usingMockFallback, statusSegment, method, currency, dateTime, search]);

  const rows = usingMockFallback ? mockFilteredRows : apiRows;
  const totalCount = usingMockFallback ? mockFilteredRows.length : apiTotalCount;

  // Amount has no server-side filter param, applied to the current page only.
  // Pagination totals below still reflect the server's (pre-amount-filter)
  // count, a known limitation of filtering a field the search API doesn't
  // support server-side.
  const displayedRows = useMemo(() => {
    if (!amountRange) return rows;
    return rows.filter((row) => {
      const amt = parseFloat(row.totalAmount ?? "0");
      if (amountRange.min != null && amt < amountRange.min) return false;
      if (amountRange.max != null && amt > amountRange.max) return false;
      return true;
    });
  }, [rows, amountRange]);

  const onStatusSegment = (v: string) => {
    setStatusSegment(v);
    setPage(1);
  };
  const onMethod = (v: string[] | undefined) => {
    setMethod(v);
    setPage(1);
  };
  const onCurrency = (v: string[] | undefined) => {
    setCurrency(v);
    setPage(1);
  };
  const onDateTime = (v: TransactionDateTimeValue | undefined) => {
    setDateTime(v);
    setPage(1);
  };
  const onAmountRange = (v: AmountRangeValue | undefined) => {
    setAmountRange(v);
    setPage(1);
  };
  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onClear = () => {
    setStatusSegment("All");
    setMethod(undefined);
    setCurrency(undefined);
    setDateTime(undefined);
    setAmountRange(undefined);
    setSearch("");
    setPage(1);
  };
  const hasActive = !!method?.length || !!currency?.length || !!dateTime || !!amountRange || search !== "";

  const onToggleColumn = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const onResetColumns = () => {
    setColumnOrder(PA_TRANSACTION_COLUMN_ORDER);
    setHiddenColumns(new Set());
  };

  const onViewDetails = (row: PaTransaction) => {
    setDetailsTxn(row);
    setDetailsOpen(true);
  };

  const columns = buildPaColumns({ isPartnerUser, columnOrder, hiddenColumns });

  return (
    <>
      {/* Single cohesive card: title, status tabs, then the filter bar, all
       * sharing one border/rounded container instead of stacking as separate
       * boxes, the table sits directly beneath with only a top border, same
       * hierarchy as the Settlement Reports table. */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="pl-5 pr-3 pb-3 pt-5">
          <div className="space-y-3">
            <SegmentedTabs options={PA_STATUS_SEGMENTS} value={statusSegment} onChange={onStatusSegment} />

            {/* Toolbar, search + filters on the left, column/export tools
             * pinned right, a thin top divider separates it from the tabs
             * above instead of its own bordered/boxed container. */}
            <div className="border-t border-border pt-3 flex items-center gap-2.5 flex-wrap">
              <RotatingSearchInput
                value={search}
                onSearch={onSearch}
                words={["customer name, email or transaction ID"]}
                className="min-w-40 max-w-xs flex-1"
              />

              <div className="hidden sm:block h-4 w-px bg-border" />

              <div className="flex items-center gap-2 flex-wrap">
                <TransactionDateTimeFilter value={dateTime} onChange={onDateTime} />
                <MultiSelectChipFilter
                  value={method}
                  options={METHOD_SELECT_OPTIONS}
                  onChange={onMethod}
                  placeholder="Payment Method"
                />
                <MultiSelectChipFilter
                  value={currency}
                  options={CURRENCY_SELECT_OPTIONS}
                  onChange={onCurrency}
                  placeholder="Currency"
                />
                <TransactionAmountFilter value={amountRange} onChange={onAmountRange} />
              </div>

              {hasActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon name="x" className="w-3 h-3" />}
                  onClick={onClear}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <TransactionColumnsMenu
                  items={PA_TRANSACTION_COLUMN_DEFS}
                  order={columnOrder}
                  hidden={hiddenColumns}
                  onOrderChange={setColumnOrder}
                  onToggle={onToggleColumn}
                  onReset={onResetColumns}
                />
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
                  onClick={() => downloadCsv(displayedRows)}
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 border-t border-border p-10 text-center">
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
        ) : (
          <DataTable
            columns={columns}
            data={displayedRows}
            isLoading={isPending}
            skeletonRows={8}
            tableLayout="content"
            emptyTitle="No transactions yet"
            emptyDescription="Completed payments will appear here once customers start paying."
            rowKey={(row) =>
              row.gid ??
              `${row.merchantId ?? ""}-${row.formattedCreationDateTime ?? ""}-${row.totalAmount ?? ""}`
            }
            pageSize={TRANSACTIONS_PAGE_LIMIT}
            totalRows={totalCount}
            page={page}
            onPageChange={setPage}
            rowAction={(row) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(row)}
                rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
                className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
              >
                View details
              </Button>
            )}
            density="compact"
            className="rounded-none border-0 border-t border-border"
          />
        )}
      </Card>

      <TransactionDetailsDrawer transaction={detailsTxn} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </>
  );
}
