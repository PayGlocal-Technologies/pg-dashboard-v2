"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DataCardList, DataTableCard } from "@/components/ui";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { type AmountRangeValue } from "@/components/common/filters/FilterChips";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { usePost } from "@/lib/api/hooks";
import { buildReceiptColumns, ReceiptDownloadAction } from "@/features/dashboard/mca-receipts/columns";
import {
  ReceiptCard,
  ReceiptCardSkeleton,
} from "@/features/dashboard/mca-receipts/components/ReceiptCardList";
import { ReceiptFilterChips } from "@/features/dashboard/mca-receipts/components/ReceiptFilterChips";
import {
  merchantInvoiceDownloadApi,
  merchantInvoicesViewApi,
} from "@/features/dashboard/mca-receipts/services";
import {
  buildReceiptRequestBody,
  defaultReceiptPeriod,
  filterReceipts,
  mapInvoiceRecordToReceipt,
  receiptMonthsWithData,
  receiptPeriodBounds,
} from "@/features/dashboard/mca-receipts/utils";
import {
  RECEIPTS_PAGE_LIMIT,
  RECEIPT_PRODUCT,
  RECEIPT_SEARCH_ARIA_LABEL,
  RECEIPT_SEARCH_HINTS,
} from "@/features/dashboard/mca-receipts/constants";
import type {
  InvoiceDownloadResponse,
  InvoiceDownloadViewResponse,
  InvoiceViewRequestParams,
  Receipt,
} from "@/features/dashboard/mca-receipts/types";
import type { MonthRange } from "@/components/common/filters/FilterChips";

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
export function McaReceiptTable() {
  const paMids = useApp((s) => s.paMids);
  const paCbMids = useApp((s) => s.paCbMids);
  const profileMid = useApp((s) => s.profile?.mid);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount; the URL is not kept in sync as
  // the merchant edits filters afterwards.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [amountRange, setAmountRange] = useState<AmountRangeValue>(EMPTY_AMOUNT_RANGE);
  // The service window the list request is bounded by. Lazy initialisers: both
  // read the clock, which must not happen during render (CLAUDE.md).
  const [defaultPeriod] = useState<MonthRange>(() => defaultReceiptPeriod());
  const [periodBounds] = useState<MonthRange>(() => receiptPeriodBounds());
  const [period, setPeriod] = useState<MonthRange>(defaultPeriod);
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

  // Both the selected tab and the period go to the server, so this is derived
  // from them rather than fixed on mount. It used to be built once with neither:
  // every tab fetched every product over a hardcoded 15-month window, and the
  // tabs and the month chip then filtered the result client-side.
  const reqBody = useMemo(() => buildReceiptRequestBody(RECEIPT_PRODUCT, period), [period]);

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

  // Which months in the window this product has a receipt for — the grid's dots.
  // Computed before search/amount are applied: narrowing it as the merchant
  // filters would unmark months that do have a receipt.
  const monthsWithData = useMemo(() => receiptMonthsWithData(sourceRows), [sourceRows]);

  const filtered = useMemo(
    () => filterReceipts(sourceRows, { search, amountRange }),
    [sourceRows, search, amountRange]
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

  const renderFilterChips = () => (
    <ReceiptFilterChips
      amountRange={amountRange}
      onAmountRangeChange={(next) => {
        setAmountRange(next);
        setPage(1);
      }}
      periodBounds={periodBounds}
      monthsWithData={monthsWithData}
      period={period}
      defaultPeriod={defaultPeriod}
      onPeriodChange={(next) => {
        setPeriod(next);
        setPage(1);
      }}
    />
  );

  const searchInput = (
    <RotatingSearchInput
      value={search}
      onSearch={onSearch}
      words={RECEIPT_SEARCH_HINTS}
      ariaLabel={RECEIPT_SEARCH_ARIA_LABEL}
      className="w-full lg:w-56"
    />
  );

  const emptyTitle = "No receipts found";
  const emptyDescription = "Try adjusting your filters or search query";

  return (
    // Two surfaces, one visible at a time: the table card from `lg` up, the
    // card list below it. CSS decides, not a media-query hook.
    <>
      <DataTableCard
        className="hidden lg:block [&_td.sticky]:z-[2] [&_td.sticky>span]:opacity-100"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            {searchInput}
            <div className="flex flex-wrap items-center gap-1.5">
              {renderFilterChips()}
            </div>
          </div>
        }
        // The download action floats over the row; these lift it above the
        // frozen cells and keep it opaque while they scroll under it.
        columns={columns}
        data={pageRows}
        rowKey={(row) => row.gid}
        isLoading={isLoading}
        emptyState={
          <PlaceholderState
            variant="no-data"
            title={emptyTitle}
            description={emptyDescription}
            className="py-16"
          />
        }
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        pagination={{
          mode: "page",
          page,
          pageSize: RECEIPTS_PAGE_LIMIT,
          total: totalCount,
          onPageChange: setPage,
        }}
        rowAction={(row) => <ReceiptDownloadAction row={row} onDownload={onDownloadReceipt} />}
        tableLayout="content"
        maxBodyHeight="none"
      />

      {/* Tablet + mobile (below lg): the same page's rows as cards, in their
          own copy of the surface with its own compact controls. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          {searchInput}
          <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
            {renderFilterChips()}
          </div>
        </div>

        <DataCardList
          bordered={false}
          rows={pageRows}
          rowKey={(row) => row.gid}
          renderCard={(row) => <ReceiptCard row={row} onDownload={onDownloadReceipt} />}
          renderSkeleton={() => <ReceiptCardSkeleton />}
          isLoading={isLoading}
          emptyState={
            <PlaceholderState
              variant="no-data"
              size="sm"
              title={emptyTitle}
              description={emptyDescription}
            />
          }
          pagination={{
            mode: "page",
            page,
            pageSize: RECEIPTS_PAGE_LIMIT,
            total: totalCount,
            onPageChange: setPage,
          }}
        />
      </div>
    </>
  );
}
