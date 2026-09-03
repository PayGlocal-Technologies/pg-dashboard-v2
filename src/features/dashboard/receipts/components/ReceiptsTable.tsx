"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DataTable } from "@/components/ui";
import { cn } from "@/lib/utils";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { type AmountRangeValue } from "@/components/common/filters/FilterChips";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { usePost } from "@/lib/api/hooks";
import { buildReceiptColumns, ReceiptDownloadAction } from "@/features/dashboard/receipts/columns";
import { ReceiptCardList } from "@/features/dashboard/receipts/components/ReceiptCardList";
import { ReceiptFilterChips } from "@/features/dashboard/receipts/components/ReceiptFilterChips";
import {
  merchantInvoiceDownloadApi,
  merchantInvoicesViewApi,
} from "@/features/dashboard/receipts/services";
import {
  filterReceipts,
  getDefault18MonthRange,
  mapInvoiceRecordToReceipt,
  receiptMonthRange,
  receiptMonthsWithData,
} from "@/features/dashboard/receipts/utils";
import {
  DEFAULT_RECEIPT_PRODUCT,
  RECEIPTS_PAGE_LIMIT,
  RECEIPT_PRODUCT_LABEL,
  RECEIPT_PRODUCT_TABS,
  RECEIPT_SEARCH_ARIA_LABEL,
  RECEIPT_SEARCH_HINTS,
} from "@/features/dashboard/receipts/constants";
import type {
  InvoiceDownloadResponse,
  InvoiceDownloadViewResponse,
  InvoiceViewRequestParams,
  Receipt,
  ReceiptProduct,
} from "@/features/dashboard/receipts/types";

const EMPTY_AMOUNT_RANGE: AmountRangeValue = { min: "", max: "" };
const EMPTY_ROWS: Receipt[] = [];

/**
 * The receipts table: product tabs, search/filter controls, and the rows
 * themselves, all inside one bordered surface.
 *
 * Rows come from the real invoice-list endpoint (ported from pg-dashboard's
 * invoice-download feature). Because a merchant's receipts are spread across
 * every MID they hold, the list is fetched once per MID and merged — exactly
 * as the old dashboard did — then every filter (product tab, search, amount,
 * month) is applied client-side over the merged set. A multi-MID merchant with
 * no MID selected also sees a Merchant ID column (see buildReceiptColumns).
 */
export function ReceiptsTable() {
  const paMids = useApp((s) => s.paMids);
  const paCbMids = useApp((s) => s.paCbMids);
  const profileMid = useApp((s) => s.profile?.mid);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  const [product, setProduct] = useState<ReceiptProduct>(DEFAULT_RECEIPT_PRODUCT);
  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount; the URL is not kept in sync as
  // the merchant edits filters afterwards.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [amountRange, setAmountRange] = useState<AmountRangeValue>(EMPTY_AMOUNT_RANGE);
  const [monthFilters, setMonthFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<Receipt[]>(EMPTY_ROWS);
  const [isLoading, setIsLoading] = useState(false);

  // MID resolution, ported from pg-dashboard's invoiceDownloadTable: an
  // explicitly-selected MID wins, else fetch across all PA + PACB MIDs, else
  // fall back to the profile MID.
  const midsToFetch = useMemo(() => {
    if (selectedMid) return [selectedMid];
    const mids = [...paMids, ...paCbMids].filter(Boolean);
    if (mids.length > 0) return mids;
    return profileMid ? [profileMid] : [];
  }, [selectedMid, paMids, paCbMids, profileMid]);

  const showMerchantId = isMultiMidUser && !selectedMid;

  // Lazy init so `new Date()` runs once on mount, not on every render (see
  // CLAUDE.md hooks purity). No `products` filter — everything is fetched and
  // the product tabs slice client-side.
  const [reqBody] = useState<InvoiceViewRequestParams>(() => getDefault18MonthRange());

  const midsKey = midsToFetch.join(",");
  const enabled = midsToFetch.length > 0 && !isGuestUser;

  const { mutateAsync: fetchInvoices } = usePost<
    InvoiceDownloadViewResponse,
    { dynamicUrl: string; reqBody: InvoiceViewRequestParams }
  >("");
  const { mutate: downloadInvoice } = usePost<InvoiceDownloadResponse, { dynamicUrl: string }>("");

  // Fetch per MID and merge. `setState` only ever fires inside the async
  // callback, never in the effect body (CLAUDE.md rule).
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      const responses = await Promise.all(
        midsToFetch.map((mid) =>
          fetchInvoices({ dynamicUrl: merchantInvoicesViewApi(mid), reqBody }).catch(() => null)
        )
      );
      if (cancelled) return;
      const merged = responses
        .flatMap((res) => res?.data?.views ?? [])
        .map(mapInvoiceRecordToReceipt);
      setRows(merged);
      setIsLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [midsKey, enabled, reqBody, fetchInvoices, midsToFetch]);

  // When the query is gated off (guest / no MID) show nothing rather than any
  // rows left over from a previous state — derived so the effect never has to
  // reset state synchronously.
  const sourceRows = enabled ? rows : EMPTY_ROWS;

  // The months the Month grid may offer: the window the request itself covers, so
  // the chip is drawn even before any row lands (see receiptMonthRange).
  const monthRange = useMemo(() => receiptMonthRange(reqBody), [reqBody]);

  // Which of those months this product has a receipt for — the grid's dots.
  // Computed before the other filters are applied: narrowing it as the merchant
  // filters would unmark the month they just ticked.
  const monthsWithData = useMemo(
    () => receiptMonthsWithData(sourceRows.filter((r) => r.product === product)),
    [sourceRows, product]
  );

  const filtered = useMemo(
    () => filterReceipts(sourceRows, { product, search, amountRange, monthFilters }),
    [sourceRows, product, search, amountRange, monthFilters]
  );

  const totalCount = filtered.length;

  const pageRows = useMemo(() => {
    const start = (page - 1) * RECEIPTS_PAGE_LIMIT;
    return filtered.slice(start, start + RECEIPTS_PAGE_LIMIT);
  }, [filtered, page]);

  const columns = useMemo(() => buildReceiptColumns(showMerchantId), [showMerchantId]);

  // Every control that changes what matches also returns to page 1 — otherwise a
  // merchant filtering while on page 3 lands on an empty page of a shorter list.
  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Switching products keeps every filter — search, amount range and months — the
  // same way SkuTable keeps its search across type tabs. The months used to be
  // cleared here because the chip's options were the selected product's own rows,
  // so a month carried across could be one the new tab had no checkbox for; the
  // grid now spans the whole fetched window for every product, so a carried-over
  // month is always a month the new tab can show (and unmark, if it has no receipt
  // for it).
  const onProductChange = (value: string) => {
    setProduct(value as ReceiptProduct);
    setPage(1);
  };

  // One handler for both the table's pinned action and the card list's. Ported
  // from pg-dashboard: the download endpoint is addressed by the receipt's MID +
  // productServicePeriod, and returns a presigned URL opened in a new tab.
  const onDownloadReceipt = (row: Receipt) => {
    if (!row.merchantId || !row.servicePeriod) return;
    downloadInvoice(
      { dynamicUrl: merchantInvoiceDownloadApi(row.merchantId, row.servicePeriod) },
      {
        onSuccess: (res) => {
          const url = res?.data?.presignedUrl;
          if (url) window.open(url, "_blank");
          else toast.error("Failed to download receipt");
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const renderFilterChips = (idPrefix: string) => (
    <ReceiptFilterChips
      idPrefix={idPrefix}
      amountRange={amountRange}
      onAmountRangeChange={(next) => {
        setAmountRange(next);
        setPage(1);
      }}
      monthRange={monthRange}
      monthsWithData={monthsWithData}
      monthFilters={monthFilters}
      onMonthFiltersChange={(next) => {
        setMonthFilters(next);
        setPage(1);
      }}
    />
  );

  const searchInput = (
    <RotatingSearchInput
      value={search}
      onSearch={onSearch}
      words={RECEIPT_SEARCH_HINTS}
      ariaLabel={RECEIPT_SEARCH_ARIA_LABEL[product]}
      className="w-full lg:w-56"
    />
  );

  const emptyTitle = "No receipts found";
  const emptyDescription = "Try adjusting your filters or search query";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="scrollbar-none overflow-x-auto border-b border-border px-4 pt-3">
        <UnderlineTabs
          tabs={RECEIPT_PRODUCT_TABS}
          value={product}
          onValueChange={onProductChange}
        />
      </div>

      <div className="hidden flex-wrap items-center gap-2 border-b border-border px-4 py-3 lg:flex">
        {searchInput}
        <div className="flex flex-wrap items-center gap-1.5">
          {renderFilterChips("receipt-amount-wide")}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:hidden">
        {searchInput}
        <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
          {renderFilterChips("receipt-amount-compact")}
        </div>
      </div>

      {!isLoading && pageRows.length === 0 ? (
        <PlaceholderState
          variant="no-data"
          title={emptyTitle}
          description={emptyDescription}
          className="hidden py-16 lg:flex"
        />
      ) : (
        <DataTable
          className={cn(
            "hidden rounded-none border-0 lg:block",
            "[&_td.sticky]:z-[2] [&_td.sticky>span]:opacity-100"
          )}
          columns={columns}
          data={pageRows}
          isLoading={isLoading}
          skeletonRows={8}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          rowKey={(row) => row.gid}
          pageSize={RECEIPTS_PAGE_LIMIT}
          totalRows={totalCount}
          page={page}
          onPageChange={setPage}
          rowAction={(row) => <ReceiptDownloadAction row={row} onDownload={onDownloadReceipt} />}
          tableLayout="content"
          density="compact"
        />
      )}

      <ReceiptCardList
        className="lg:hidden"
        rows={pageRows}
        isLoading={isLoading}
        onDownload={onDownloadReceipt}
        page={page}
        onPageChange={setPage}
        totalRows={totalCount}
        pageSize={RECEIPTS_PAGE_LIMIT}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}
