"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { cn } from "@/lib/utils";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { mcaTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import { buildMcaColumns } from "@/features/dashboard/transactions/mcaColumns";
import { UploadInvoiceModal } from "@/features/dashboard/transactions/components/UploadInvoiceModal";
import { TransactionDetailsDrawer } from "@/features/dashboard/transactions/components/TransactionDetailsDrawer";
import {
  MCA_STATUS_FILTERS,
  MCA_CURRENCY_FILTERS,
  TRANSACTIONS_PAGE_LIMIT,
} from "@/features/dashboard/transactions/constants";
import type { McaTransaction, McaTransactionsResponse, TableReqBody } from "@/features/dashboard/transactions/types";

const VIEW_TABS = [
  { value: "all", label: "All" },
  { value: "waiting-for-invoice", label: "Waiting for Invoice" },
] as const;

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
      <TabsList className="h-auto justify-start gap-5 rounded-none border-0 bg-transparent p-0">
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

  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("All");
  const [currency, setCurrency] = useState("All");
  const [page, setPage]         = useState(1);

  const [statusOverrides, setStatusOverrides] = useState<Record<string, Partial<McaTransaction>>>({});

  const [uploadRowId, setUploadRowId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen]   = useState(false);

  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen]   = useState(false);

  const externalStatus = status   !== "All" ? [status]    : undefined;
  const currencyFilter = currency !== "All" ? [currency]  : undefined;
  const body = buildTxnRequestBody(
    { externalStatus, currency: currencyFilter },
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

  const uploadRow  = rows.find((r) => r.gid === uploadRowId) ?? null;
  const detailsRow = rows.find((r) => r.gid === detailsRowId) ?? null;

  const onStatus   = (v: string) => { setStatus(v);   setPage(1); };
  const onCurrency = (v: string) => { setCurrency(v); setPage(1); };
  const onSearch   = (v: string) => { setSearch(v);   setPage(1); };
  const onClear    = () => { setStatus("All"); setCurrency("All"); setSearch(""); setPage(1); };
  const activeFilterCount = (status !== "All" ? 1 : 0) + (currency !== "All" ? 1 : 0);

  const openUploadInvoice = (row: McaTransaction) => {
    setUploadRowId(row.gid);
    setUploadOpen(true);
  };

  const openDetails = (row: McaTransaction) => {
    setDetailsRowId(row.gid);
    setDetailsOpen(true);
  };

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

  const columns = buildMcaColumns(isPartnerUser, openUploadInvoice, openDetails);

  return (
    <div className="space-y-3">
      {/* Search & filter container */}
      <div className="bg-card rounded-xl border border-border">
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4">
          {/* View tabs — an underline-style shortcut onto the same `status`
              filter state as the "Waiting for Invoice" pill inside the Filter
              popover, not a separate filter axis. */}
          <TransactionViewTabs
            value={status === "DOCUMENT_PENDING" ? "waiting-for-invoice" : "all"}
            onValueChange={(v) => onStatus(v === "waiting-for-invoice" ? "DOCUMENT_PENDING" : "All")}
          />

          {/* Search + Filter — right-aligned, wraps below the tabs on narrow screens. */}
          <div className="flex items-center gap-2 py-2">
            <RotatingSearchInput
              value={search}
              onSearch={onSearch}
              words={["remitter", "transaction ID", "UTR"]}
              className="w-40 sm:w-56"
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="filter" className="h-3.5 w-3.5" />}
                  rightIcon={
                    activeFilterCount > 0 ? (
                      <Badge variant="default" size="sm" square>
                        {activeFilterCount}
                      </Badge>
                    ) : undefined
                  }
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {MCA_STATUS_FILTERS.map((opt) => (
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
                  </div>

                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Currency
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {MCA_CURRENCY_FILTERS.map((opt) => (
                        <Button
                          key={opt.value}
                          variant={currency === opt.value ? "primary" : "outline"}
                          size="sm"
                          onClick={() => onCurrency(opt.value)}
                          className={cn(
                            "h-auto rounded-full px-2.5 py-1",
                            currency !== opt.value && "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Icon name="x" className="w-3 h-3" />}
                      onClick={onClear}
                      className="w-full justify-center text-muted-foreground hover:text-foreground"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
          data={rows}
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

      <UploadInvoiceModal
        row={uploadRow}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={handleInvoiceSubmitted}
      />

      <TransactionDetailsDrawer
        row={detailsRow}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUploaded={handleInvoiceSubmitted}
        isPartnerUser={isPartnerUser}
      />
    </div>
  );
}
