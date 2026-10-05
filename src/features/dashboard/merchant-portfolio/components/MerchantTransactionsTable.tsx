"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, ColumnManager, DataTableCard, type Column } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { parseApiDateTime } from "@/lib/utils/format";
import { reorderColumns } from "@/lib/utils/columns";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
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
import { PaymentMethodCell } from "@/features/dashboard/pa-transactions/columns";
import {
  amountColumn,
  dateColumn,
  MCA_METHOD_LABELS,
  METHOD_OPTIONS,
  methodLabel,
  statusColumn,
  STATUS_OPTIONS,
  transactionIdColumn,
} from "@/features/dashboard/transaction-overview/columns";
import { TransactionOverviewDrawer } from "@/features/dashboard/transaction-overview/components/TransactionOverviewDrawer";
import type { TransactionRail } from "@/features/dashboard/transaction-overview/types";
import { SettlementBadge } from "@/features/dashboard/merchant-portfolio/components/PortfolioBits";
import { SETTLEMENT_META } from "@/features/dashboard/merchant-portfolio/derive";
import type {
  PortfolioMerchant,
  PortfolioTransaction,
} from "@/features/dashboard/merchant-portfolio/types";

const PAGE_SIZE = 10;

/** Always shown: a transaction row is unreadable without these. */
const FIXED_COLUMN_KEYS = ["amount", "status", "createdAt"];

const RAIL_TABS = [
  { value: "PG", label: "Payment Gateway" },
  { value: "MCA", label: "Multi-Currency Accounts" },
] as const;

const SETTLEMENT_OPTIONS = (Object.keys(SETTLEMENT_META) as (keyof typeof SETTLEMENT_META)[]).map(
  (value) => ({ value, label: SETTLEMENT_META[value].label })
);

type Col = Column<PortfolioTransaction>;

const columnsFor: Col[] = [
  { ...(amountColumn as Col), header: "Amount" },
  { ...(statusColumn as Col), header: "Payment status" },
  {
    key: "settlement",
    header: "Settlement",
    minWidth: 130,
    render: (row) => <SettlementBadge state={row.settlement} />,
  },
  {
    key: "paymentMethod",
    header: "Payment method",
    minWidth: 150,
    render: (row) =>
      row.rail === "PG" ? (
        <PaymentMethodCell row={row} />
      ) : (
        <span className="text-[13px] text-foreground">{methodLabel(row)}</span>
      ),
  },
  {
    key: "customer",
    header: "Customer",
    minWidth: 180,
    render: (row) => (
      <span className="block min-w-0">
        <span className="block truncate text-[13px] text-foreground">{row.customerName}</span>
        <span className="block truncate text-[11px] lowercase text-muted-foreground">
          {row.email}
        </span>
      </span>
    ),
  },
  {
    key: "commission",
    header: "Commission",
    minWidth: 110,
    align: "right",
    render: (row) =>
      row.commission === undefined ? (
        <span className="text-[12px] text-muted-foreground">—</span>
      ) : (
        <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-foreground">
          {formatCurrency(row.commission, "INR")}
        </span>
      ),
  },
  { ...(transactionIdColumn as Col), cellClassName: "pl-6" },
  dateColumn as Col,
];

/**
 * A merchant's transactions, the merchant page's main working area. Built
 * from Transaction Overview's own cells, filters, controls and details
 * drawer, without the Merchant ID column (the merchant is known), plus
 * Settlement and Commission. Payment status and settlement status are
 * separate on purpose: a successful payment can still be on its way.
 */
export function MerchantTransactionsTable({
  merchant,
  transactions,
}: {
  merchant: PortfolioMerchant;
  transactions: PortfolioTransaction[];
}) {
  const rails: TransactionRail[] = [
    ...(merchant.products.includes("PA") ? (["PG"] as const) : []),
    ...(merchant.products.includes("MCA") ? (["MCA"] as const) : []),
  ];
  const [rail, setRail] = useState<TransactionRail>(rails[0] ?? "PG");
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [settlements, setSettlements] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [relativeRange, setRelativeRange] = useState<RelativeRangeValue>(EMPTY_RELATIVE_RANGE);
  const [relativeWindow, setRelativeWindow] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailsRow, setDetailsRow] = useState<PortfolioTransaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filterKey = JSON.stringify([
    rail,
    search,
    statuses,
    methods,
    settlements,
    dateRange,
    relativeWindow,
  ]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });

  const startTime =
    relativeWindow?.startTime ?? (dateRange.from ? toStartOfDayMs(dateRange.from) : undefined);
  const endTime =
    relativeWindow?.endTime ?? (dateRange.to ? toEndOfDayMs(dateRange.to) : undefined);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (t.rail !== rail) return false;
      if (statuses.length && !statuses.includes(t.status)) return false;
      if (methods.length && !methods.includes(t.paymentMethod)) return false;
      if (settlements.length && (!t.settlement || !settlements.includes(t.settlement)))
        return false;
      if (startTime !== undefined || endTime !== undefined) {
        const at = parseApiDateTime(t.createdAt)?.getTime();
        if (at === undefined) return false;
        if (startTime !== undefined && at < startTime) return false;
        if (endTime !== undefined && at > endTime) return false;
      }
      if (q && !`${t.customerName} ${t.email} ${t.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, rail, statuses, methods, settlements, startTime, endTime, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageState.key === filterKey ? pageState.page : 1, pageCount);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const methodOptions =
    rail === "PG"
      ? METHOD_OPTIONS
      : Object.entries(MCA_METHOD_LABELS).map(([value, label]) => ({ value, label }));

  const columns = reorderColumns(columnsFor, columnOrder).filter(
    (c) => !hiddenColumns.includes(c.key)
  );
  const reorderable = columnsFor.map((c) => ({
    key: c.key,
    label: typeof c.header === "string" ? c.header : c.key,
  }));

  const switchRail = (next: TransactionRail) => {
    setRail(next);
    setStatuses([]);
    setMethods([]);
  };

  const narrowed =
    !!search.trim() ||
    statuses.length > 0 ||
    methods.length > 0 ||
    settlements.length > 0 ||
    startTime !== undefined;
  const emptyCopy = narrowed
    ? {
        title: "No matching transactions",
        description: "Try a different search, or clear a filter to widen the results.",
      }
    : {
        title: "No transactions yet",
        description: "This merchant's payments will appear here as they come in.",
      };

  const controlButton =
    "h-auto min-h-0 shrink-0 py-1 text-muted-foreground shadow-none hover:text-foreground";

  return (
    <>
      <DataTableCard<PortfolioTransaction>
        tabs={
          rails.length > 1 ? (
            <UnderlineTabs
              tabs={RAIL_TABS}
              value={rail}
              onValueChange={(v) => switchRail(v as TransactionRail)}
            />
          ) : undefined
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <RotatingSearchInput
              value={search}
              onSearch={setSearch}
              words={["Customer name", "Email", "Transaction ID"]}
              className="w-40 sm:w-56"
            />
            <FilterChipGroup className="flex flex-wrap items-center gap-1.5">
              <DateFilterChip
                label="Date and time"
                value={dateRange}
                onChange={(next) => {
                  setDateRange(next);
                  setRelativeRange(EMPTY_RELATIVE_RANGE);
                  setRelativeWindow(null);
                }}
                relativeValue={relativeRange}
                onRelativeChange={(next) => {
                  setRelativeRange(next);
                  setDateRange({ from: "", to: "" });
                  setRelativeWindow(hasRelativeRange(next) ? relativeRangeToEpochMs(next) : null);
                }}
              />
              <StatusFilterChip
                options={STATUS_OPTIONS[rail]}
                selected={statuses}
                onChange={setStatuses}
              />
              <StatusFilterChip
                label="Payment method"
                options={methodOptions}
                selected={methods}
                onChange={setMethods}
              />
              <StatusFilterChip
                label="Settlement"
                options={SETTLEMENT_OPTIONS}
                selected={settlements}
                onChange={setSettlements}
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
                    className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                  />
                }
                onClick={() => {
                  setIsRefreshing(true);
                  window.setTimeout(() => {
                    setIsRefreshing(false);
                    toast.success("Transactions updated");
                  }, 600);
                }}
                disabled={isRefreshing}
                className={controlButton}
              >
                Refresh
              </Button>
              <ColumnManager
                columns={reorderable}
                order={columnOrder ?? reorderable.map((c) => c.key)}
                onOrderChange={setColumnOrder}
                onReset={() => {
                  setColumnOrder(null);
                  setHiddenColumns([]);
                }}
                hiddenKeys={hiddenColumns}
                onHiddenKeysChange={setHiddenColumns}
                fixedKeys={FIXED_COLUMN_KEYS}
                fixedReason="Always shown. A transaction row is unreadable without these columns."
                className="shadow-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
                onClick={() =>
                  toast.message("Report download isn't connected yet", {
                    description: "This screen is a design preview. Nothing was generated.",
                  })
                }
                className={controlButton}
              >
                Report
              </Button>
            </div>
          </div>
        }
        emptyState={
          <PlaceholderState
            variant="no-transactions"
            title={emptyCopy.title}
            description={emptyCopy.description}
            className="py-14"
          />
        }
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        columns={columns}
        data={pageRows}
        isLoading={false}
        rowKey={(t) => t.id}
        onRowClick={(t) => {
          setDetailsRow(t);
          setDrawerOpen(true);
        }}
        pagination={{
          mode: "page",
          page,
          pageSize: PAGE_SIZE,
          total: filtered.length,
          onPageChange: (next) => setPageState({ key: filterKey, page: next }),
        }}
        maxBodyHeight="none"
      />
      {/* "What happened with this payment": Transaction Overview's own drawer. */}
      <TransactionOverviewDrawer row={detailsRow} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
