"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useProductContext, toProductType } from "@/stores/useProductContext";
import { settlementListPath } from "@/features/dashboard/settlement-reports/routes";
import { useApp } from "@/stores/useApp";
import { useGet, usePostQuery } from "@/lib/api/hooks";
import { MidGuard } from "@/components/common/MidGuard";
import { Button, Card, DataTable, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { TransactionColumnsMenu } from "@/features/dashboard/settlement-reports/components/TransactionColumnsMenu";
import type { TableReqBody } from "@/types/transactions";
import {
  formatDayMonth,
  formatWeekdayDate,
  formatWeekdayName,
} from "@/features/dashboard/settlement-reports/calendarUtils";
import { SettlementCalendarButton } from "@/features/dashboard/settlement-reports/components/SettlementCalendarButton";
import { SettlementCycleInfoPanel } from "@/features/dashboard/settlement-reports/components/SettlementCycleInfoPanel";
import { SettlementDetailsDialog } from "@/features/dashboard/settlement-reports/components/SettlementDetailsDialog";
import { SettlementStatCards } from "@/features/dashboard/settlement-reports/components/SettlementStatCards";
import {
  SettlementDurationFilter,
  type SettlementDurationValue,
} from "@/features/dashboard/settlement-reports/components/SettlementDurationFilter";
import {
  SETTLEMENT_COLUMN_DEFS,
  SETTLEMENT_COLUMN_ORDER,
  buildSettlementColumns,
} from "@/features/dashboard/settlement-reports/columns";
import {
  SETTLEMENT_CALENDAR_TODAY,
  mcaSettlementRows,
  mcaSettlementSummary,
  mcaTotalSettledChartsByTimeframe,
  settlementRows,
  settlementSummary,
  totalSettledChartsByTimeframe,
} from "@/features/dashboard/settlement-reports/mock-data";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import {
  ffmsSettlementDownloadApi,
  ffmsSettlementSummaryApi,
  paSettlementDownloadApi,
  paSettlementReportsApi,
} from "@/features/dashboard/settlement-reports/services";
import {
  mapFfmsRowToRow,
  mapPaViewToRow,
  triggerBrowserDownload,
} from "@/features/dashboard/settlement-reports/helper";
import type {
  FfmsSettlementDownloadResponse,
  FfmsSettlementResponse,
  PaSettlementDownloadResponse,
  PaSettlementResponse,
  SettlementRow,
} from "@/features/dashboard/settlement-reports/types";

const SETTLEMENT_PAGE_LIMIT = 50;

function formatLakh(amount: number): string {
  return `₹${(amount / 100_000).toFixed(2)}L`;
}

/** "Tonight" only holds when today's payments are still on track for a plain
 * T+1 cutoff, once a weekend/holiday pushes the date out, name the actual day
 * instead so the merchant isn't left assuming it's still settling tonight. */
function upcomingSettlementTimeLabel(summary: typeof settlementSummary): string {
  if (!summary.upcomingSettlement.affectedByNonWorkingDay) return "Tonight · 12:00 AM IST";
  const { expectedDate } = summary.upcomingSettlement;
  return `${formatWeekdayName(expectedDate)} · ${formatDayMonth(expectedDate)}`;
}

export function SettlementReportsFeature() {
  const router = useRouter();

  // Which product (Payments / Multi-Currency Accounts) this shared screen is
  // currently scoped to, set by the Header's top-level tabs, see
  // useProductContext.ts. "Home" has no product of its own and falls back to
  // PA. The real settlement endpoint differs per product: PA is a GET
  // summary, FFMS (PACB) is a POST summary.
  const activeContext = useProductContext((s) => s.activeContext);
  const activeProduct = toProductType(activeContext);
  const isMca = activeProduct === "PACB";
  const listPath = settlementListPath(activeContext);

  const { urlMid, midFilter } = useResolvedMids(activeProduct);
  const isGuestUser = useApp((s) => s.isGuestUser);
  // Partner users carry the MID in the URL path; merchants resolve it from the
  // product MID filter. Both settlement endpoints are keyed by a single MID.
  const mid = urlMid || midFilter?.value?.[0] || "";

  const [search, setSearch] = useState("");
  const [duration, setDuration] = useState<SettlementDurationValue | undefined>(undefined);
  const [showCycleInfo, setShowCycleInfo] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>(SETTLEMENT_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  // Set when a row's download is requested; drives the lazy download queries
  // below (mirrors pg-dashboard's reportDownloadDate + refetch pattern).
  const [downloadDate, setDownloadDate] = useState<string | null>(null);

  const durationEnd = duration
    ? duration.mode === "range"
      ? (duration.to ?? duration.from)
      : duration.from
    : undefined;
  const startTime = duration ? new Date(`${duration.from}T00:00:00`).getTime() : undefined;
  const endTime = durationEnd ? new Date(`${durationEnd}T23:59:59.999`).getTime() : undefined;

  // ── PA (Payments) settlement summary — GET, date range in the URL path ──────
  const dateRange = duration ? `${duration.from}/${durationEnd ?? duration.from}` : undefined;
  const paQuery = useGet<PaSettlementResponse>(
    ["settlement-pa", mid, dateRange ?? ""],
    paSettlementReportsApi(mid, dateRange),
    { enabled: !isMca && !!mid && !isGuestUser }
  );

  // ── FFMS (PACB) settlement summary — POST minimal TableReqBody ───────────────
  const ffmsBody: TableReqBody = {
    pageLimit: SETTLEMENT_PAGE_LIMIT,
    from: 0,
    ...(startTime && endTime ? { startTime, endTime } : {}),
  };
  const ffmsQuery = usePostQuery<FfmsSettlementResponse, TableReqBody>(
    ["settlement-ffms", mid],
    ffmsSettlementSummaryApi(mid),
    ffmsBody,
    { staleTime: 0 },
    isMca && !!mid && !isGuestUser
  );

  // ── Lazy per-row download queries (fired via refetch on downloadDate) ────────
  const paDownloadQuery = useGet<PaSettlementDownloadResponse>(
    ["settlement-pa-download", mid, downloadDate ?? ""],
    paSettlementDownloadApi(mid, downloadDate ?? ""),
    { enabled: false }
  );
  const ffmsDownloadQuery = usePostQuery<FfmsSettlementDownloadResponse, Record<string, never>>(
    ["settlement-ffms-download", mid, downloadDate ?? ""],
    ffmsSettlementDownloadApi(mid, downloadDate ?? ""),
    {},
    undefined,
    false
  );

  const { refetch: refetchPaDownload } = paDownloadQuery;
  const { refetch: refetchFfmsDownload } = ffmsDownloadQuery;

  useEffect(() => {
    if (!downloadDate) return;
    let cancelled = false;
    const run = async () => {
      // Separate branches so each refetch keeps its own response type (the
      // PA endpoint returns { downloadUrl }, FFMS returns { presignedUrl }).
      let link: string | undefined;
      if (isMca) {
        const res = await refetchFfmsDownload();
        link = res.data?.data?.presignedUrl;
      } else {
        const res = await refetchPaDownload();
        link = res.data?.data?.downloadUrl;
      }
      if (cancelled) return;
      if (link) triggerBrowserDownload(link);
      // Reset inside the async callback (not the effect body) per CLAUDE.md.
      setDownloadDate(null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [downloadDate, isMca, refetchPaDownload, refetchFfmsDownload]);

  // Mock-only summary/calendar/detail data — see BACKEND GAP below.
  const summary = isMca ? mcaSettlementSummary : settlementSummary;
  const chartsByTimeframe = isMca
    ? mcaTotalSettledChartsByTimeframe
    : totalSettledChartsByTimeframe;
  const mockSettlementRows = isMca ? mcaSettlementRows : settlementRows;

  const onSearch = (v: string) => setSearch(v);
  const onDuration = (v: SettlementDurationValue | undefined) => setDuration(v);
  const onClear = () => {
    setSearch("");
    setDuration(undefined);
  };
  const hasActive = search !== "" || !!duration;

  const onToggleColumn = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const onResetColumns = () => {
    setColumnOrder(SETTLEMENT_COLUMN_ORDER);
    setHiddenColumns(new Set());
  };

  // Real settlement rows from the API, mapped onto SettlementRow.
  const apiRows: SettlementRow[] = useMemo(() => {
    if (isMca) return (ffmsQuery.data?.data?.summary ?? []).map(mapFfmsRowToRow);
    return (paQuery.data?.data?.views ?? []).map(mapPaViewToRow);
  }, [isMca, paQuery.data, ffmsQuery.data]);

  // The old settlement tables only supported a date filter server-side; text
  // search over the visible UTR / settlement date stays client-side.
  const filteredSettlementRows = useMemo(() => {
    if (!search) return apiRows;
    const q = search.toLowerCase();
    return apiRows.filter(
      (row) => (row.utrNumber ?? "").toLowerCase().includes(q) || row.id.toLowerCase().includes(q)
    );
  }, [apiRows, search]);

  const isPending = isMca ? ffmsQuery.isPending : paQuery.isPending;
  const isError = isMca ? ffmsQuery.isError : paQuery.isError;
  const refetch = isMca ? ffmsQuery.refetch : paQuery.refetch;

  const upcoming = summary.upcomingSettlement;
  const showHolidayBanner =
    upcoming.affectedByNonWorkingDay && upcoming.nonWorkingDayReason === "holiday";

  return (
    <MidGuard productType={activeProduct}>
      <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden overflow-y-visible">
        {/* BACKEND GAP: the non-working-day banner, the summary StatCards
         * (trend %, previous/upcoming settlement breakdown, held funds) and the
         * per-settlement detail page below are all driven by mock-data.ts. The
         * old settlement API only returns the flat table (date / amount / txn
         * count / UTR) + a download URL, there is no summary or detail endpoint
         * to back these. They stay on mock, clearly flagged, until a backend
         * contract exists — the table and downloads are the real, wired parts. */}
        {showHolidayBanner && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <Icon name="alert-triangle" size={13} className="shrink-0" />
            <p className="min-w-0 flex-1">
              <span className="font-semibold">Upcoming bank holiday.</span> Banks are closed on{" "}
              {formatWeekdayDate(upcoming.nonWorkingDayDate!)} for {upcoming.nonWorkingDayName}.
              Settlements due around this date are scheduled for the next working day,{" "}
              {formatDayMonth(upcoming.expectedDate)}.
            </p>
          </div>
        )}

        <PageHeader
          title="Settlement Reports"
          subtitle="Daily settlement activity and bank transfers"
          actions={
            <>
              <SettlementDetailsDialog
                cycleValue={summary.cycle.value}
                cycleFrequency={summary.cycle.frequency}
                bankAccount={summary.bankAccount}
                bankAccountStatus={summary.bankAccountStatus}
              />
              <SettlementCalendarButton rows={mockSettlementRows} />
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
              >
                Export
              </Button>
            </>
          }
        />

        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-4">
            {/* BACKEND GAP: mock summary — see the banner note above. */}
            <SettlementStatCards
              totalSettledLabel={formatLakh(summary.totalSettled)}
              totalSettledTrendPct={summary.totalSettledTrendPct}
              totalSettledChartsByTimeframe={chartsByTimeframe}
              previousSettledLabel={formatCurrency(summary.previousSettled.amount, "INR")}
              previousSettledDateLabel={summary.previousSettled.dateLabel}
              previousSettledTimeLabel={summary.previousSettled.timeLabel}
              previousSettledTransactionCount={summary.previousSettled.transactionCount}
              previousSettledUtrNumber={summary.previousSettled.utrNumber}
              previousSettledGrossLabel={formatCurrency(summary.previousSettled.grossAmount, "INR")}
              previousSettledTaxLabel={formatCurrency(summary.previousSettled.tax, "INR")}
              previousSettledFeeLabel={formatCurrency(summary.previousSettled.fee, "INR")}
              onShowPreviousSettledInfo={() => setShowCycleInfo(true)}
              // BACKEND GAP: the "previous settled" summary card is mock data
              // (no summary endpoint), so there is no real settlement date to
              // download here. Row-level downloads in the table below are wired.
              onDownloadPreviousSettled={() => {}}
              upcomingSettlementLabel={formatCurrency(summary.upcomingSettlement.amount, "INR")}
              upcomingSettlementTimeLabel={upcomingSettlementTimeLabel(summary)}
              pendingInvoiceCount={isMca ? mcaSettlementSummary.pendingInvoiceCount : undefined}
              onUploadInvoice={() => {}}
            />

            <Card className="gap-0 overflow-hidden p-0">
              <div className="pl-5 pr-3 pb-3 pt-5">
                {/* Status SegmentedTabs removed: the settlement summary API only
                 * returns already-completed settlements, so there is no per-row
                 * status to filter on (see BACKEND GAP in helper.ts). */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <RotatingSearchInput
                    value={search}
                    onSearch={onSearch}
                    words={["UTR", "Settlement ID"]}
                    className="min-w-40 max-w-xs flex-1"
                  />

                  <div className="hidden sm:block h-4 w-px bg-border" />

                  <div className="flex items-center gap-2 flex-wrap">
                    <SettlementDurationFilter value={duration} onChange={onDuration} />
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
                      items={SETTLEMENT_COLUMN_DEFS}
                      order={columnOrder}
                      hidden={hiddenColumns}
                      onOrderChange={setColumnOrder}
                      onToggle={onToggleColumn}
                      onReset={onResetColumns}
                    />
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
                      Couldn&apos;t load settlements
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
                  columns={buildSettlementColumns({ columnOrder, hiddenColumns })}
                  data={filteredSettlementRows}
                  isLoading={isPending}
                  skeletonRows={8}
                  emptyTitle="No settlements yet"
                  emptyDescription="Settlement reports will appear here once transactions are processed"
                  rowKey={(row) => row.id}
                  pageSize={10}
                  density="compact"
                  tableLayout="content"
                  className="rounded-none border-0 border-t border-border"
                  rowAction={(row) => (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDownloadDate(row.id)}
                        leftIcon={<Icon name="download" className="h-2.5 w-2.5" />}
                        className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
                      >
                        Download
                      </Button>
                      {/* BACKEND GAP: detail route is mock-backed (no per-settlement
                       * detail endpoint in the old API). */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`${listPath}/${row.id}`)}
                        rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
                        className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
                      >
                        View details
                      </Button>
                    </div>
                  )}
                />
              )}
            </Card>
          </div>

          {showCycleInfo && (
            <aside className="w-[320px] shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
              <SettlementCycleInfoPanel
                onClose={() => setShowCycleInfo(false)}
                previousSettledDateLabel={summary.previousSettled.dateLabel}
                previousSettledTimeLabel={summary.previousSettled.timeLabel}
                previousSettledTransactionCount={summary.previousSettled.transactionCount}
                upcomingSchedule={{
                  affectedByNonWorkingDay: summary.upcomingSettlement.affectedByNonWorkingDay,
                  paymentReceivedDate: SETTLEMENT_CALENDAR_TODAY,
                  nonWorkingDayDate: summary.upcomingSettlement.nonWorkingDayDate ?? undefined,
                  nonWorkingDayReason: summary.upcomingSettlement.nonWorkingDayReason ?? undefined,
                  nonWorkingDayName: summary.upcomingSettlement.nonWorkingDayName ?? undefined,
                  settlementDate: summary.upcomingSettlement.expectedDate,
                }}
              />
            </aside>
          )}
        </div>
      </div>
    </MidGuard>
  );
}
