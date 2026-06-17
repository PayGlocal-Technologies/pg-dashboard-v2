"use client";

import { useState } from "react";
import { Button, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { cn } from "@/lib/utils";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { paTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import { buildPaColumns } from "@/features/dashboard/transactions/paColumns";
import {
  PA_STATUS_FILTERS,
  PA_METHOD_FILTERS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/transactions/constants";
import type { PaTransactionsResponse, TableReqBody } from "@/features/dashboard/transactions/types";

export function PaTransactionTable() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PA");

  const [search, setSearch] = useState("");
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
  const onClear = () => {
    setStatus("All");
    setMethod("All");
    setSearch("");
    setPage(1);
  };
  const hasActive = status !== "All" || method !== "All" || search !== "";

  const columns = buildPaColumns(isPartnerUser);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="bg-card rounded-xl px-4 py-2.5 flex items-center gap-2.5 flex-wrap border border-border">
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

        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={onClear}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {isError ? (
        <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center gap-3 text-center">
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
          data={rows}
          isLoading={isPending}
          skeletonRows={8}
          emptyTitle="No transactions found"
          emptyDescription="Try adjusting your filters or search query"
          rowKey={(row) =>
            row.gid ??
            `${row.merchantId ?? ""}-${row.formattedCreationDateTime ?? ""}-${row.totalAmount ?? ""}`
          }
          pageSize={TRANSACTIONS_PAGE_LIMIT}
          totalRows={totalCount}
          page={page}
          onPageChange={setPage}
          rowCta={{ label: "View details" }}
          density="compact"
        />
      )}
    </div>
  );
}
