"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { toProductType, type NavContext } from "@/stores/useProductContext";
import { settlementDetailPath } from "@/features/dashboard/settlement-reports/routes";
import { useApp } from "@/stores/useApp";
import { useGet, usePostQuery } from "@/lib/api/hooks";
import { MidGuard } from "@/components/common/MidGuard";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { Button, Card, DataTable, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
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
  settlementColumnDefs,
  settlementColumnOrder,
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
  useSettlementReportDownload,
  useSettlementUpcoming,
} from "@/features/dashboard/settlement-reports/hooks";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import {
  ffmsSettlementSummaryApi,
  paSettlementReportsApi,
} from "@/features/dashboard/settlement-reports/services";
import { mapFfmsRowToRow, mapPaViewToRow } from "@/features/dashboard/settlement-reports/helper";
import type {
  FfmsSettlementResponse,
  PaSettlementResponse,
  SettlementRow,
} from "@/features/dashboard/settlement-reports/types";

const SETTLEMENT_PAGE_LIMIT = 50;

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
 * Whether the ENHANCED view runs on the mock dataset.
 *
 * Not a fallback any more. The enhanced table and the per-settlement detail
 * page behind it are v2's own design, and the endpoints they need — the
 * date-keyed settlement-list and settlement-detail pair — are agreed but not
 * deployed. The live summary still in place returns four thin fields and
 * nothing at all behind a row, so a real row drills into a "Settlement not
 * found" page. That is unreviewable, which is the whole reason this exists.
 *
 * The mock is shaped like those two responses exactly (Section A of
 * mock-data.ts) and goes through the same mappers the live path will, so
 * wiring them up is a matter of swapping the source, not rewriting the screen.
 * Section B of that file is the list of fields NEITHER response carries and
 * that the page still renders — those remain open with the backend.
 *
 * So outside production the enhanced view renders the mock dataset outright,
 * whether or not the endpoint returned rows. The CLASSIC view is untouched and
 * always renders live API rows, so real settlements are always one toggle away.
 *
 * NOTE ON THE GATE: `npm run uat` is `next dev`, so NODE_ENV is "development"
 * there too and this is on in UAT as well as locally. That is deliberate —
 * UAT is where this gets reviewed. Only a real `next build` deployment turns it
 * off, at which point the enhanced view falls back to live API rows. An empty
 * settlement list in production is a real answer and must render as one.
 */
const SHOW_MOCK_SETTLEMENTS = process.env.NODE_ENV !== "production";

/**
 * Client-side text search over the settlement date / merchant id, plus the UTRs
 * the CLASSIC view still gets from the old summary endpoints. There is no
 * settlement id to search for any more — the date is the key, so `row.id`
 * matched here IS the date.
 *
 * BACKEND GAP: the new list endpoint pages server-side (`page`/`limit`) but has
 * no `q`, so once it is wired this searches only the page in hand. It needs a
 * server-side search parameter, or the search has to move onto the date filter.
 */
function filterSettlementRows(rows: SettlementRow[], search: string): SettlementRow[] {
  if (!search) return rows;
  const q = search.toLowerCase();
  return rows.filter(
    (row) =>
      row.id.toLowerCase().includes(q) ||
      (row.merchantId ?? "").toLowerCase().includes(q) ||
      (row.utrNumbers ?? []).some((utr) => utr.toLowerCase().includes(q))
  );
}

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

  // Real bank-holiday calendar (/gcc/v1/calendar). Everything date-shaped on
  // this page now derives from it: today, the next settlement, the T+1 pushout
  // behind the banner, and the calendar popover's holiday markers. Only the
  // settlement *money* below is still mock.
  const calendar = useSettlementCalendar();
  // The one download path every surface on this screen goes through: both
  // tables' rows, the Previous settled card, and the detail page behind a row
  // (which calls the same hook itself). See useSettlementReportDownload.
  const { download: downloadSettlementReport } = useSettlementReportDownload(activeProduct);

  const { urlMid, midFilter } = useResolvedMids(activeProduct);
  const isGuestUser = useApp((s) => s.isGuestUser);
  /**
   * The Merchant ID column exists only for an account whose settlements can
   * actually come from more than one MID. Settlements are keyed by date, and a
   * UCIC-scoped list spans MIDs, so on a multi-MID account the date no longer
   * identifies a row on its own and the merchant has to be visible — and has to
   * travel with every drill-down and download. On a single-MID account it would
   * be one value repeated down the page, so the column is not rendered at all.
   */
  const paCbMids = useApp((s) => s.paCbMids);
  const showMerchantId = isMca && paCbMids.length > 1;
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
   * the bank-holiday banner, search, column controls and the per-settlement
   * detail page behind each row.
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
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
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
  const totalSettled = overview?.totalSettled ?? 0;
  const totalSettledTrendPct = overview?.totalSettledTrendPct ?? 0;
  const totalSettledChartData = overview
    ? overview.series.map((point) => ({ x: point.label, y: point.value }))
    : [];

  // Previous settled: amount / date / count from the overview, else zeros. The
  // UTR and gross/tax/fee breakup have no endpoint and stay hidden (see below).
  const prevSettlement = overview?.previousSettlement;
  const previousSettledAmount = prevSettlement?.amount ?? 0;
  const previousSettledDateLabel = prevSettlement
    ? formatDayMonth(prevSettlement.settlementDate)
    : "—";
  const previousSettledTransactionCount = prevSettlement?.transactionCount ?? 0;

  // Upcoming settlement — live, current-state (no date range). No mock fallback:
  // we don't show a placeholder amount while it loads.
  const { upcoming: upcomingSettlementData } = useSettlementUpcoming(scopeId);
  const upcomingSettlementAmount = upcomingSettlementData?.amount ?? null;
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
    setColumnOrder(null);
    setHiddenColumns(new Set());
  };

  // Real settlement rows from the API, mapped onto SettlementRow.
  const apiRows: SettlementRow[] = useMemo(() => {
    if (isMca) return (ffmsQuery.data?.data?.summary ?? []).map(mapFfmsRowToRow);
    return (paQuery.data?.data?.views ?? []).map(mapPaViewToRow);
  }, [isMca, paQuery.data, ffmsQuery.data]);

  const isPending = isMca ? ffmsQuery.isPending : paQuery.isPending;

  /**
   * Rows the ENHANCED view (and the settlement calendar) renders: the mock
   * dataset outside production, live API rows inside it. Unconditional, not a
   * fallback — see SHOW_MOCK_SETTLEMENTS above for why the enhanced design
   * cannot be reviewed against the live contract.
   *
   * The mock arrays are module constants, so this hands back the same reference
   * every render and nothing downstream re-renders on its account.
   */
  const enhancedRows = useMemo(
    () => (SHOW_MOCK_SETTLEMENTS ? mockSettlementRowsFor(isMca) : apiRows),
    [isMca, apiRows]
  );

  /** Whether the enhanced view is showing invented settlements right now. Drives
   *  the loading/error suppression below: a mock-driven table must not sit on a
   *  skeleton waiting for, or report the failure of, a request it never reads. */
  const enhancedIsMock = SHOW_MOCK_SETTLEMENTS;

  /** Column order falls back to the default for the current column set, so
   *  toggling the Merchant ID column on cannot leave a stale order behind. */
  const columnDefs = useMemo(() => settlementColumnDefs(showMerchantId), [showMerchantId]);
  const effectiveColumnOrder = useMemo(
    () => columnOrder ?? settlementColumnOrder(showMerchantId),
    [columnOrder, showMerchantId]
  );

  const filteredApiRows = useMemo(() => filterSettlementRows(apiRows, search), [apiRows, search]);
  const filteredEnhancedRows = useMemo(
    () => filterSettlementRows(enhancedRows, search),
    [enhancedRows, search]
  );

  const isError = isMca ? ffmsQuery.isError : paQuery.isError;
  const refetch = isMca ? ffmsQuery.refetch : paQuery.refetch;

  /** Row-scoped report download, shared by both views.
   *
   *  Keyed off `row.date`, the settlement date, which is also the row's id now
   *  that settlements have no id of their own. The row's own merchant is passed
   *  when the summary names one, since a UCIC-scoped list can span merchants and
   *  each row's report has to be asked for against its own account. */
  const downloadRowReport = (row: SettlementRow) =>
    downloadSettlementReport(row.date, row.merchantId);

  /** The "Previous settled" card's own download, through the same endpoint.
   *  The date comes from the overview's `previousSettlement.settlementDate`,
   *  passed verbatim exactly as pg-dashboard passes a row's own
   *  `settlementDate` into the path (reports/columns.tsx). No merchant of its
   *  own — the overview is a roll-up at the page's scope, which the hook
   *  defaults to. */
  const downloadPreviousSettledReport = () =>
    downloadSettlementReport(prevSettlement?.settlementDate ?? "");

  const upcoming = calendar.upcomingSchedule;
  const showHolidayBanner =
    upcoming.affectedByNonWorkingDay && upcoming.nonWorkingDayReason === "holiday";

  return (
    <MidGuard productType={activeProduct}>
      <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden overflow-y-visible">
        {/* BACKEND GAP, narrowed: the table, the per-date report downloads, the
         * holiday calendar behind this banner, and the three summary cards
         * (total settled + trend + sparkline, previous settled, upcoming
         * settlement) are all live now. What is still mock-backed is the
         * per-settlement detail page below, the settlement-cycle dialog's
         * cycle/bank-account block, the held-funds card, and the previous
         * settlement's UTR and gross/tax/fee breakup — those last are passed
         * nowhere rather than rendered from mock-data.ts, so nothing invented
         * reaches the screen. They stay flagged until a contract exists. */}
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
                  rows={enhancedRows}
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
            {/* Live: overview (total settled, trend, sparkline, previous
                settlement) and upcoming settlement. The previous settlement's
                UTR and gross/tax/fee breakup have no endpoint and stay hidden —
                see the commented props below and the note above. */}
            <div data-guide="mca-settlement-analytics">
              <SettlementStatCards
                totalSettled={totalSettled}
                totalSettledTrendPct={totalSettledTrendPct}
                totalSettledComparisonLabel={overview?.comparisonLabel}
                totalSettledTimeframe={settlementTimeframe}
                onTotalSettledTimeframeChange={setSettlementTimeframe}
                totalSettledChartData={totalSettledChartData}
                previousSettledAmount={previousSettledAmount}
                previousSettledDateLabel={previousSettledDateLabel}
                previousSettledTransactionCount={previousSettledTransactionCount}
                onShowPreviousSettledInfo={() => setShowCycleInfo(true)}
                onDownloadPreviousSettled={downloadPreviousSettledReport}
                canDownloadPreviousSettled={!!prevSettlement?.settlementDate}
                // MOCK — hidden for now (no endpoint): the previous-settlement time,
                // UTR and gross/tax/fee breakup. Re-enable by un-commenting these
                // and the matching blocks in SettlementStatCards.
                // previousSettledTimeLabel={summary.previousSettled.timeLabel}
                // previousSettledUtrNumber={summary.previousSettled.utrNumber}
                // previousSettledGrossLabel={formatCurrency(summary.previousSettled.grossAmount, "INR")}
                // previousSettledTaxLabel={formatCurrency(summary.previousSettled.tax, "INR")}
                // previousSettledFeeLabel={formatCurrency(summary.previousSettled.fee, "INR")}
                upcomingSettlementAmount={upcomingSettlementAmount}
                upcomingSettlementTimeLabel={upcomingSettlementTimeLabel(calendar.upcomingSchedule)}
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
                rows={filteredApiRows}
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
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <RotatingSearchInput
                      value={search}
                      onSearch={onSearch}
                      words={["Settlement date", "Merchant ID"]}
                      className="min-w-40 max-w-xs flex-1"
                    />

                    <div className="hidden sm:block h-4 w-px bg-border" />

                    <div className="flex items-center gap-2 flex-wrap">
                      <SettlementDateFilter value={dateFilter} onChange={onDateFilter} />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <TransactionColumnsMenu
                        items={columnDefs}
                        order={effectiveColumnOrder}
                        hidden={hiddenColumns}
                        onOrderChange={setColumnOrder}
                        onToggle={onToggleColumn}
                        onReset={onResetColumns}
                      />
                    </div>
                  </div>
                </div>

                {isError && !enhancedIsMock ? (
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
                ) : (enhancedIsMock || !isPending) && filteredEnhancedRows.length === 0 ? (
                  <PlaceholderState
                    variant="no-settlements"
                    title="No settlements yet"
                    description="Settlement reports will appear here once transactions are processed."
                    className="border-t border-border py-14"
                  />
                ) : (
                  <DataTable
                    columns={buildSettlementColumns({
                      columnOrder: effectiveColumnOrder,
                      hiddenColumns,
                      showMerchantId,
                    })}
                    data={filteredEnhancedRows}
                    isLoading={!enhancedIsMock && isPending}
                    skeletonRows={8}
                    emptyTitle="No settlements yet"
                    emptyDescription="Settlement reports will appear here once transactions are processed"
                    rowKey={(row) => `${row.merchantId ?? ""}:${row.id}`}
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
                          onClick={() =>
                            router.push(
                              settlementDetailPath(
                                activeContext,
                                // A live summary row does not name its merchant
                                // yet, so the page's own scope stands in — see
                                // downloadRowReport, which has the same fallback.
                                row.merchantId || scopeId,
                                row.id
                              )
                            )
                          }
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
                // Same two live values the "Previous settled" card this panel
                // explains is showing, so the two can no longer disagree. The
                // time of day has no source (the overview returns a date, not a
                // timestamp) and is deliberately not passed — see the prop's
                // doc comment.
                previousSettledDateLabel={previousSettledDateLabel}
                previousSettledTransactionCount={previousSettledTransactionCount}
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
