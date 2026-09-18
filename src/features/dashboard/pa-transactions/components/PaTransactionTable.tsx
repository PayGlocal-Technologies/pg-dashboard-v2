"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { paTxnSearchApi } from "@/features/dashboard/pa-transactions/services";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { buildPaColumns } from "@/features/dashboard/pa-transactions/columns";
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

export function PaTransactionTable() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PA");

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount; the URL is not kept in sync as
  // the merchant edits filters afterwards.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState("All");
  const [method, setMethod] = useState("All");
  const [page, setPage] = useState(1);

  const externalStatus = status !== "All" ? [status] : undefined;
  const paymentInstrument = method !== "All" ? [method] : undefined;
  const body = buildTxnRequestBody(
    { externalStatus, paymentInstrument },
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

  const rows = data?.data?.data ?? [];
  const totalCount = data?.data?.totalCount ?? 0;

  const onStatus = (v: string) => {
    setStatus(v);
    setPage(1);
  };
  const onMethod = (v: string) => {
    setMethod(v);
    setPage(1);
  };
  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const onViewDetails = (row: PaTransaction) => {
    // TODO: open the transaction details view for this row (keyed by row.gid).
    void row;
  };

  const columns = buildPaColumns(isPartnerUser);

  return (
    <DataTableCard<PaTransaction>
      /* Search, the status pills and the method pills, on one row inside the
         card rather than in a detached bar above it — the same toolbar every
         other table on the app carries. */
      toolbar={
        <div className="flex items-center gap-2.5 flex-wrap">
          <RotatingSearchInput
            value={search}
            onSearch={onSearch}
            words={["email", "transaction ID", "order ID"]}
            className="min-w-[160px] max-w-xs flex-1"
          />

          <div className="hidden sm:block h-4 w-px bg-border" />

          <div className="flex items-center gap-1 flex-wrap">
            {PA_STATUS_FILTERS.map((opt) => (
              <Button
                key={opt.value}
                variant={status === opt.value ? "primary" : "outline"}
                size="sm"
                onClick={() => onStatus(opt.value)}
                className={cn(
                  "h-auto rounded-full px-2.5 py-1",
                  status === opt.value
                    ? "bg-foreground text-background border-foreground hover:bg-foreground/90"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="hidden sm:block h-4 w-px bg-border" />

          <div className="flex items-center gap-1 flex-wrap">
            {PA_METHOD_FILTERS.map((opt) => (
              <Button
                key={opt.value}
                variant={method === opt.value ? "primary" : "outline"}
                size="sm"
                onClick={() => onMethod(opt.value)}
                className={cn(
                  "h-auto rounded-full px-2.5 py-1",
                  method !== opt.value && "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </Button>
            ))}
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
