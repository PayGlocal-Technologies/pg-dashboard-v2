"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { toProductType, type NavContext } from "@/stores/useProductContext";
import { settlementListPath } from "@/features/dashboard/settlement-reports/routes";
import { useApp } from "@/stores/useApp";
import { useGet, usePostQuery } from "@/lib/api/hooks";
import { MidGuard } from "@/components/common/MidGuard";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { Button, Card, DataTable, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { TransactionColumnsMenu } from "@/features/dashboard/settlement-reports/components/TransactionColumnsMenu";
import type { TableReqBody } from "@/types/transactions";
import { formatDayMonth, formatWeekdayDate, formatWeekdayName } from "@/lib/utils/format";
import type { SettlementSchedule } from "@/features/dashboard/settlement-reports/calendarUtils";
import { SettlementCalendarButton } from "@/features/dashboard/settlement-reports/components/SettlementCalendarButton";
import { SettlementCycleInfoPanel } from "@/features/dashboard/settlement-reports/components/SettlementCycleInfoPanel";
// MOCK (hidden): SettlementDetailsDialog shows the mock cycle/bank account —
// re-enable with its usage in the header actions below.
// import { SettlementDetailsDialog } from "@/features/dashboard/settlement-reports/components/SettlementDetailsDialog";
import { SettlementStatCards } from "@/features/dashboard/settlement-reports/components/SettlementStatCards";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import {
  MCA_SETTLEMENT_GUIDE_KEY,
  MCA_SETTLEMENT_GUIDE_STEPS,
} from "@/features/dashboard/settlement-reports/guide";
import { ClassicSettlementTable } from "@/features/dashboard/settlement-reports/components/ClassicSettlementTable";
import {
  SettlementDateFilter,
  type SettlementDateValue,
} from "@/features/dashboard/settlement-reports/components/SettlementDateFilter";
import {
  SETTLEMENT_COLUMN_DEFS,
  SETTLEMENT_COLUMN_ORDER,
  buildSettlementColumns,
} from "@/features/dashboard/settlement-reports/columns";
import {
  mcaSettlementSummary,
  mockSettlementRowsFor,
  // MOCK (unused — chart has no fallback now): mcaTotalSettledChartsByTimeframe,
  settlementSummary,
  // MOCK (unused — chart has no fallback now): totalSettledChartsByTimeframe,
  type TotalSettledTimeframe,
} from "@/features/dashboard/settlement-reports/mock-data";
import {
  useSettlementCalendar,
  useSettlementOverview,
  useSettlementUpcoming,
} from "@/features/dashboard/settlement-reports/hooks";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
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
function upcomingSettlementTimeLabel(schedule: SettlementSchedule): string {
  if (!schedule.affectedByNonWorkingDay) return "Tonight · 12:00 AM IST";
  const { settlementDate } = schedule;
  return `${formatWeekdayName(settlementDate)} · ${formatDayMonth(settlementDate)}`;
}

interface SettlementReportsFeatureProps {
  /** Which product's settlements this screen shows. Comes from the route:
   *  /settlement-report is PA, /mca-settlement-report is PACB. */
  product: NavContext;
}

/**
 * Whether an empty settlement list falls back to the mock dataset.
 *
 * Development only. See the `rows` memo below for why the fallback exists and
 * why it must never reach a merchant.
 */
const SHOW_MOCK_SETTLEMENTS = process.env.NODE_ENV !== "production";

type SettlementView = "enhanced" | "classic";

/** Labelled for what each one IS, not for which codebase it came from: a
 *  merchant reading this toggle has never heard of pg-dashboard. */
const SETTLEMENT_VIEWS: { value: SettlementView; label: string }[] = [
  { value: "enhanced", label: "Enhanced" },
  { value: "classic", label: "Classic" },
];

export function SettlementReportsFeature({ product }: SettlementReportsFeatureProps) {
  const router = useRouter();

  const activeContext = product;
  const activeProduct = toProductType(activeContext);
  const isMca = activeProduct === "PACB";
  const listPath = settlementListPath(activeContext);

  // Real bank-holiday calendar (/gcc/v1/calendar). Everything date-shaped on
  // this page now derives from it: today, the next settlement, the T+1 pushout
  // behind the banner, and the calendar popover's holiday markers. Only the
  // settlement *money* below is still mock.
  const calendar = useSettlementCalendar();

  const { urlMid, midFilter } = useResolvedMids(activeProduct);
  const isGuestUser = useApp((s) => s.isGuestUser);
  // The one id every path-scoped endpoint on this page takes: the product MID
  // for a single-MID account, the selected MID, or the UCIC id for a multi-MID
  // account with nothing selected. The FFMS settlement endpoints accept the
  // UCIC id in that slot, so the table and the cards share this scope and
  // always report over the same set of accounts.
  const { scopeId } = useScopeId(activeProduct);
  // The PA settlement endpoints are not confirmed to take a UCIC id, so they
  // stay on a single MID. Remove this once PA is confirmed and the whole page
  // can move to scopeId.
  const paMid = urlMid || midFilter?.value?.[0] || "";

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount; the URL is not kept in sync as
  // the merchant edits filters afterwards.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [dateFilter, setDateFilter] = useState<SettlementDateValue | undefined>(undefined);
  const [showCycleInfo, setShowCycleInfo] = useState(false);
  /**
   * Which version of this page to render.
   *
   * "enhanced" is v2's own: summary cards and chart, the settlement calendar,
   * the bank-holiday banner, search, column controls, per-row status and the
   * per-settlement detail page behind each row.
   *
   * "classic" reproduces pg-dashboard's settlement report as it stands today —
   * five columns, a date filter, refresh, download — so the two can be compared
   * side by side without leaving the app. See ClassicSettlementTable.
   */
  const [view, setView] = useState<SettlementView>("enhanced");
  /** The classic table pages at 15 rows to production's own pageLimit, so it
   *  keeps a page index separate from the enhanced table's 10. */
  const [classicPage, setClassicPage] = useState(1);
  const isClassic = view === "classic";
  const [columnOrder, setColumnOrder] = useState<string[]>(SETTLEMENT_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  // Set when a row's download is requested; drives the lazy download queries
  // below (mirrors pg-dashboard's reportDownloadDate + refetch pattern). Both
  // the date and the merchant come off the clicked row, so a row from a
  // UCIC-scoped summary downloads against its own merchant rather than the
  // scope the list was fetched at.
  const [downloadTarget, setDownloadTarget] = useState<{
    date: string;
    merchantId: string;
  } | null>(null);
  const downloadDate = downloadTarget?.date ?? null;

  const dateFilterEnd = dateFilter
    ? dateFilter.mode === "range"
      ? (dateFilter.to ?? dateFilter.from)
      : dateFilter.from
    : undefined;
  const startTime = dateFilter ? new Date(`${dateFilter.from}T00:00:00`).getTime() : undefined;
  const endTime = dateFilterEnd ? new Date(`${dateFilterEnd}T23:59:59.999`).getTime() : undefined;

  // ── PA (Payments) settlement summary — GET, date range in the URL path ──────
  const dateRange = dateFilter
    ? `${dateFilter.from}/${dateFilterEnd ?? dateFilter.from}`
    : undefined;
  const paQuery = useGet<PaSettlementResponse>(
    ["settlement-pa", paMid, dateRange ?? ""],
    paSettlementReportsApi(paMid, dateRange),
    { enabled: !isMca && !!paMid && !isGuestUser }
  );

  // ── FFMS (PACB) settlement summary — POST minimal TableReqBody ───────────────
  const ffmsBody: TableReqBody = {
    pageLimit: SETTLEMENT_PAGE_LIMIT,
    from: 0,
    ...(startTime && endTime ? { startTime, endTime } : {}),
  };
  const ffmsQuery = usePostQuery<FfmsSettlementResponse, TableReqBody>(
    ["settlement-ffms", scopeId],
    ffmsSettlementSummaryApi(scopeId),
    ffmsBody,
    { staleTime: 0 },
    isMca && !!scopeId && !isGuestUser
  );

  // ── Lazy per-row download queries (fired via refetch on downloadDate) ────────
  const paDownloadQuery = useGet<PaSettlementDownloadResponse>(
    ["settlement-pa-download", paMid, downloadDate ?? ""],
    paSettlementDownloadApi(paMid, downloadDate ?? ""),
    { enabled: false }
  );
  // Scoped to the clicked row's own merchant, not to the scope the summary was
  // fetched at: a UCIC-scoped summary can return rows from several merchants.
  const ffmsDownloadMid = downloadTarget?.merchantId ?? "";
  const ffmsDownloadQuery = usePostQuery<FfmsSettlementDownloadResponse, Record<string, never>>(
    ["settlement-ffms-download", ffmsDownloadMid, downloadDate ?? ""],
    ffmsSettlementDownloadApi(ffmsDownloadMid, downloadDate ?? ""),
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
      setDownloadTarget(null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [downloadDate, isMca, refetchPaDownload, refetchFfmsDownload]);

  // Mock-only summary/calendar/detail data — see BACKEND GAP below.
  const summary = isMca ? mcaSettlementSummary : settlementSummary;
  // MOCK (unused now the chart has no fallback — kept for later):
  // const chartsByTimeframe = isMca
  //   ? mcaTotalSettledChartsByTimeframe
  //   : totalSettledChartsByTimeframe;

  // Total settled card is now live: the selected timeframe drives the overview
  // fetch, so total / trend / chart all move together. Falls back to the mock
  // summary while loading or if the endpoint is unavailable (e.g. the PA path).
  const [settlementTimeframe, setSettlementTimeframe] = useState<TotalSettledTimeframe>("ytd");
  const { overview } = useSettlementOverview(scopeId, settlementTimeframe);

  // No mock fallback: an unloaded/unsupported overview shows 0 / empty, never a
  // fake figure.
  const totalSettledLabel = formatLakh(overview?.totalSettled ?? 0);
  const totalSettledTrendPct = overview?.totalSettledTrendPct ?? 0;
  const totalSettledChartData = overview
    ? overview.series.map((point) => ({ x: point.label, y: point.value }))
    : [];

  // Previous settled: amount / date / count from the overview, else zeros. The
  // UTR and gross/tax/fee breakup have no endpoint and stay hidden (see below).
  const prevSettlement = overview?.previousSettlement;
  const previousSettledLabel = formatCurrency(prevSettlement?.amount ?? 0, "INR");
  const previousSettledDateLabel = prevSettlement
    ? formatDayMonth(prevSettlement.settlementDate)
    : "—";
  const previousSettledTransactionCount = prevSettlement?.transactionCount ?? 0;

  // Upcoming settlement — live, current-state (no date range). No mock fallback:
  // we don't show a placeholder amount while it loads.
  const { upcoming: upcomingSettlementData } = useSettlementUpcoming(scopeId);
  const upcomingSettlementLabel = upcomingSettlementData
    ? formatCurrency(upcomingSettlementData.amount, "INR")
    : "—";
  const upcomingPendingInvoiceCount = upcomingSettlementData?.pendingInvoiceCount;

  const onSearch = (v: string) => setSearch(v);
  const onDateFilter = (v: SettlementDateValue | undefined) => setDateFilter(v);

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

  const isPending = isMca ? ffmsQuery.isPending : paQuery.isPending;

  /**
   * Sample rows, when the endpoint has answered with none.
   *
   * Most dev and UAT accounts have no settlement history, so this page rendered
   * as an empty table and there was no way to review the states it is supposed
   * to draw — every status, the non-working-day pushes, the detail page behind a
   * row. The mock dataset covers all of them (see mock-data.ts).
   *
   * Gated on NODE_ENV so it can never reach a merchant: an empty settlement list
   * in production is a real answer, and filling it with invented settlements
   * would be worse than showing nothing. It waits for `isPending` to clear, so a
   * slow response shows a skeleton rather than flashing sample data first.
   */
  const rows = useMemo(() => {
    if (apiRows.length > 0 || isPending) return apiRows;
    return SHOW_MOCK_SETTLEMENTS ? mockSettlementRowsFor(isMca) : apiRows;
  }, [apiRows, isPending, isMca]);

  // The old settlement tables only supported a date filter server-side; text
  // search over the visible UTR / settlement date stays client-side.
  const filteredSettlementRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (row) => (row.utrNumber ?? "").toLowerCase().includes(q) || row.id.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const isError = isMca ? ffmsQuery.isError : paQuery.isError;
  const refetch = isMca ? ffmsQuery.refetch : paQuery.refetch;

  // Schedule from the live calendar, amount still from mock-data (no summary
  // endpoint exists — see BACKEND GAP below).
  /** Row-scoped report download, shared by both views: the endpoint is keyed by
   *  the settlement date, and by the row's own merchant when the summary names
   *  one (a UCIC-scoped list can span merchants). */
  const downloadRowReport = (row: SettlementRow) =>
    setDownloadTarget({ date: row.id, merchantId: row.merchantId ?? scopeId });

  const upcoming = calendar.upcomingSchedule;
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
              {formatDayMonth(upcoming.settlementDate)}.
            </p>
          </div>
        )}

        <PageHeader
          title="Settlement Reports"
          subtitle="Daily settlement activity and bank transfers"
          actions={
            <>
              {/* MOCK (hidden for now — no settlement-summary endpoint for the
                  cycle / bank account). Re-enable by un-commenting this and its
                  import. */}
              {/* <SettlementDetailsDialog
                cycleValue={summary.cycle.value}
                cycleFrequency={summary.cycle.frequency}
                bankAccount={summary.bankAccount}
                bankAccountStatus={summary.bankAccountStatus}
              /> */}
              <span data-guide="mca-settlement-calendar" className="inline-flex">
                <SettlementCalendarButton
                  rows={rows}
                  todayKey={calendar.today}
                  nextSettlementDate={calendar.nextSettlement.date}
                  nextSettlementReason={calendar.nextSettlement.reason}
                  nextSettlementSkippedDays={calendar.nextSettlement.skippedDays}
                  hasUpcomingHoliday={calendar.hasUpcomingHoliday}
                />
              </span>
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
            <div data-guide="mca-settlement-analytics">
              <SettlementStatCards
                totalSettledLabel={totalSettledLabel}
                totalSettledTrendPct={totalSettledTrendPct}
                totalSettledComparisonLabel={overview?.comparisonLabel}
                totalSettledTimeframe={settlementTimeframe}
                onTotalSettledTimeframeChange={setSettlementTimeframe}
                totalSettledChartData={totalSettledChartData}
                previousSettledLabel={previousSettledLabel}
                previousSettledDateLabel={previousSettledDateLabel}
                previousSettledTransactionCount={previousSettledTransactionCount}
                onShowPreviousSettledInfo={() => setShowCycleInfo(true)}
                // BACKEND GAP: the "previous settled" summary card is mock data
                // (no summary endpoint), so there is no real settlement date to
                // download here. Row-level downloads in the table below are wired.
                onDownloadPreviousSettled={() => {}}
                // MOCK — hidden for now (no endpoint): the previous-settlement time,
                // UTR and gross/tax/fee breakup. Re-enable by un-commenting these
                // and the matching blocks in SettlementStatCards.
                // previousSettledTimeLabel={summary.previousSettled.timeLabel}
                // previousSettledUtrNumber={summary.previousSettled.utrNumber}
                // previousSettledGrossLabel={formatCurrency(summary.previousSettled.grossAmount, "INR")}
                // previousSettledTaxLabel={formatCurrency(summary.previousSettled.tax, "INR")}
                // previousSettledFeeLabel={formatCurrency(summary.previousSettled.fee, "INR")}
                upcomingSettlementLabel={upcomingSettlementLabel}
                upcomingSettlementTimeLabel={upcomingSettlementTimeLabel(
                  calendar.upcomingSchedule
                )}
                pendingInvoiceCount={upcomingPendingInvoiceCount}
                onUploadInvoice={() => router.push("/mca-transactions")}
              />
            </div>

            {/* The comparison toggle, in its own row between the summary
                cards/chart above and whichever table it selects below. It
                labels the table, so it sits with it rather than up in the
                page header's action row; kept right-aligned (where it used to
                be, and clear of the search input directly beneath it) so it
                doesn't read as a second heading for the section. Switching it
                swaps ONLY the table below: the banner, the header actions and
                the summary above are the page, not the enhanced view, and
                stay put in both — otherwise flipping to classic reads as the
                page emptying out rather than as a table comparison. */}
            <div className="flex justify-end">
              <SegmentedTabs
                options={SETTLEMENT_VIEWS}
                value={view}
                onChange={(next) => setView(next as SettlementView)}
              />
            </div>

            {isClassic ? (
              <ClassicSettlementTable
                rows={filteredSettlementRows}
                isLoading={isPending}
                isError={isError}
                onRefresh={() => void refetch()}
                dateFilter={dateFilter}
                onDateFilterChange={(next) => {
                  onDateFilter(next);
                  // A narrower range can leave the current page past the end.
                  setClassicPage(1);
                }}
                onDownload={downloadRowReport}
                page={classicPage}
                onPageChange={setClassicPage}
              />
            ) : (
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
                      <SettlementDateFilter value={dateFilter} onChange={onDateFilter} />
                    </div>

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
                  <PlaceholderState
                    variant="error"
                    title="Couldn't load settlements"
                    description="Something went wrong while fetching data."
                    className="border-t border-border py-14"
                    action={
                      <Button variant="outline" size="sm" onClick={() => void refetch()}>
                        Retry
                      </Button>
                    }
                  />
                ) : !isPending && filteredSettlementRows.length === 0 ? (
                  <PlaceholderState
                    variant="no-settlements"
                    title="No settlements yet"
                    description="Settlement reports will appear here once transactions are processed."
                    className="border-t border-border py-14"
                  />
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
                          onClick={() => downloadRowReport(row)}
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
            )}
          </div>

          {showCycleInfo && (
            <aside className="w-[320px] shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
              <SettlementCycleInfoPanel
                onClose={() => setShowCycleInfo(false)}
                previousSettledDateLabel={summary.previousSettled.dateLabel}
                previousSettledTimeLabel={summary.previousSettled.timeLabel}
                previousSettledTransactionCount={summary.previousSettled.transactionCount}
                upcomingSchedule={{
                  affectedByNonWorkingDay: upcoming.affectedByNonWorkingDay,
                  paymentReceivedDate: calendar.today,
                  nonWorkingDayDate: upcoming.nonWorkingDayDate ?? undefined,
                  nonWorkingDayReason: upcoming.nonWorkingDayReason ?? undefined,
                  nonWorkingDayName: upcoming.nonWorkingDayName ?? undefined,
                  settlementDate: upcoming.settlementDate,
                }}
              />
            </aside>
          )}
        </div>

        {/* Guide launcher — MCA settlement view only. */}
        {isMca && (
          <GuideLauncher steps={MCA_SETTLEMENT_GUIDE_STEPS} storageKey={MCA_SETTLEMENT_GUIDE_KEY} />
        )}
      </div>
    </MidGuard>
  );
}
