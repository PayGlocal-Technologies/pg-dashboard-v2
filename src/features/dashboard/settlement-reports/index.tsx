"use client";

import { useMemo, useState } from "react";
import { useDrawerExpand } from "@/components/common/useDrawerExpand";
import {
  SettlementDetailsDrawer,
  SettlementDrawerBody,
  SETTLEMENT_DRAWER_WIDTH_PX,
} from "@/features/dashboard/settlement-reports/components/SettlementDetailsDrawer";
import { SettlementDetailsPage } from "@/features/dashboard/settlement-reports/components/SettlementDetailsPage";
import { useRouter, useSearchParams } from "next/navigation";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { toProductType, type NavContext } from "@/stores/useProductContext";
import { settlementDetailPath } from "@/features/dashboard/settlement-reports/routes";
import { useApp } from "@/stores/useApp";
import { useGet, usePostQuery } from "@/lib/api/hooks";
import { MidGuard } from "@/components/common/MidGuard";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { Button, ColumnManager, DataTableCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { TableReqBody } from "@/types/transactions";
import {
  formatCurrency,
  formatDayMonth,
  formatWeekdayDate,
  formatWeekdayName,
} from "@/lib/utils/format";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import type { SettlementSchedule } from "@/features/dashboard/settlement-reports/calendarUtils";
import { SettlementHolidayBanner } from "@/features/dashboard/mca-settlement-report/components/SettlementHolidayBanner";
import { SettlementCalendarButton } from "@/features/dashboard/settlement-reports/components/SettlementCalendarButton";
import { SettlementCycleInfoPanel } from "@/features/dashboard/settlement-reports/components/SettlementCycleInfoPanel";
// MOCK: shows the mock cycle/bank account, so it renders only outside
// production (SHOW_MOCK_SETTLEMENTS), on the Payments page.
import { SettlementDetailsDialog } from "@/features/dashboard/settlement-reports/components/SettlementDetailsDialog";
import { SettlementStatCards } from "@/features/dashboard/settlement-reports/components/SettlementStatCards";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import {
  MCA_SETTLEMENT_GUIDE_KEY,
  MCA_SETTLEMENT_GUIDE_STEPS,
} from "@/features/dashboard/settlement-reports/guide";
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
  mockPreviousSettlement,
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
import {
  ffmsSettlementSummaryApi,
  paSettlementReportsApi,
} from "@/features/dashboard/settlement-reports/services";
import { mapFfmsRowToRow, mapPaViewToRow } from "@/features/dashboard/settlement-reports/helper";
import type {
  FfmsSettlementResponse,
  PaSettlementResponse,
  SettlementRow,
  SettlementStatus,
} from "@/features/dashboard/settlement-reports/types";

const SETTLEMENT_PAGE_LIMIT = 50;

/** The compact outline style of the Transactions table's toolbar actions. */
const TOOLBAR_BUTTON_CLASS =
  "h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground";

/** The Payments table's two views: payouts still on their way, and paid. */
const SETTLEMENT_STATUS_TABS = [
  { value: "SETTLED", label: "Settled" },
  { value: "PROCESSING", label: "Processing" },
] as const satisfies readonly { value: SettlementStatus; label: string }[];

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
      (row.settlementId ?? "").toLowerCase().includes(q) ||
      (row.merchantId ?? "").toLowerCase().includes(q) ||
      (row.utrNumbers ?? []).some((utr) => utr.toLowerCase().includes(q))
  );
}

export function SettlementReportsFeature({ product }: SettlementReportsFeatureProps) {
  const router = useRouter();

  const activeContext = product;
  const activeProduct = toProductType(activeContext);
  const isMca = activeProduct === "PACB";
  // The Payments "Settlements" design: Settlement ID, Status and UTR columns,
  // the Processing/Settled tabs, and the previous payout's UTR and breakup.
  // All mock-backed for now (see SettlementRow.settlementId), so only outside
  // production. MCA keeps its own layout.
  const showPayoutDetails = !isMca && SHOW_MOCK_SETTLEMENTS;

  // Real bank-holiday calendar (/gcc/v1/calendar). Everything date-shaped on
  // this page now derives from it: today, the next settlement, the T+1 pushout
  // behind the banner, and the calendar popover's holiday markers. Only the
  // settlement *money* below is still mock.
  const calendar = useSettlementCalendar();
  const [calendarOpen, setCalendarOpen] = useState(false);
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
  const [statusTab, setStatusTab] = useState<SettlementStatus>("SETTLED");
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
  //
  // MOCK (Payments, outside production): the whole card comes from the latest
  // Settled row instead, so its UTR and breakup can show and always agree with
  // the table. See mockPreviousSettlement.
  const mockPrev = showPayoutDetails ? mockPreviousSettlement() : null;
  const prevSettlement = mockPrev ?? overview?.previousSettlement;
  const previousSettledAmount = prevSettlement?.amount ?? 0;
  const previousSettledDateLabel = prevSettlement
    ? formatDayMonth(prevSettlement.settlementDate)
    : "—";
  const previousSettledTransactionCount = prevSettlement?.transactionCount ?? 0;

  // Upcoming settlement — live, current-state (no date range). No mock fallback:
  // we don't show a placeholder amount while it loads.
  const { upcoming: upcomingSettlementData } = useSettlementUpcoming(scopeId);
  //
  // MOCK (Payments, outside production): the card shows the Processing row,
  // so it matches the table (amount and its weekday + date), the same as the
  // previous-settled card above.
  const mockUpcoming = showPayoutDetails
    ? (mockSettlementRowsFor(isMca).find((row) => row.status === "PROCESSING") ?? null)
    : null;
  const upcomingSettlementAmount = mockUpcoming
    ? mockUpcoming.amount
    : (upcomingSettlementData?.amount ?? null);
  const upcomingSettlementLabel = mockUpcoming
    ? `${formatWeekdayName(mockUpcoming.id)} · ${formatDayMonth(mockUpcoming.id)}`
    : upcomingSettlementTimeLabel(calendar.upcomingSchedule);
  // Invoices are an MCA step; a Payments settlement never waits on one.
  const upcomingPendingInvoiceCount = isMca
    ? upcomingSettlementData?.pendingInvoiceCount
    : undefined;

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
  const columnDefs = useMemo(
    () => settlementColumnDefs(showMerchantId, showPayoutDetails),
    [showMerchantId, showPayoutDetails]
  );
  const effectiveColumnOrder = useMemo(
    () => columnOrder ?? settlementColumnOrder(showMerchantId, showPayoutDetails),
    [columnOrder, showMerchantId, showPayoutDetails]
  );

  const filteredEnhancedRows = useMemo(() => {
    const searched = filterSettlementRows(enhancedRows, search);
    return showPayoutDetails ? searched.filter((row) => row.status === statusTab) : searched;
  }, [enhancedRows, search, showPayoutDetails, statusTab]);

  const isError = isMca ? ffmsQuery.isError : paQuery.isError;
  const refetch = isMca ? ffmsQuery.refetch : paQuery.refetch;
  const isFetching = isMca ? ffmsQuery.isFetching : paQuery.isFetching;

  /**
   * Which empty state applies. The old copy said "No settlements yet"
   * regardless, which told a merchant who had just searched or picked a date
   * that they had none at all. Settlements aren't merchant-created, so neither
   * branch carries a CTA.
   */
  const hasNarrowingFilters = !!search.trim() || !!dateFilter;
  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No settlements in this range",
        description: "Try a wider date range, or clear the search.",
      }
    : {
        title: "Track your settlements in one place",
        description:
          "Each payout appears here with the transactions it covers and when the funds reached your account.",
      };

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

  // ── Settlement details (Payments): drawer, then the full page in place ──
  // The same flow as a transaction's details: a row opens the drawer, Expand
  // opens it out into a page that replaces everything below the nav, and
  // Collapse / Back return. The settlement is held as the row itself.
  const {
    record: detailRow,
    pageOpen,
    drawerOpen,
    instantDrawer,
    slotRef,
    open: openDetails,
    onDrawerOpenChange,
    expand: expandToPage,
    collapse: collapseToDrawer,
    back: backToList,
    morphLayer,
  } = useDrawerExpand<SettlementRow>({ drawerWidthPx: SETTLEMENT_DRAWER_WIDTH_PX });

  const upcoming = calendar.upcomingSchedule;

  return (
    <MidGuard productType={activeProduct}>
      <div
        ref={slotRef}
        className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden overflow-y-visible"
      >
        {pageOpen && detailRow ? (
          <SettlementDetailsPage
            settlement={detailRow}
            onBack={backToList}
            onCollapse={collapseToDrawer}
            onDownload={() => downloadRowReport(detailRow)}
          />
        ) : (
          <>
            {/* BACKEND GAP, narrowed: the table, the per-date report downloads, the
             * holiday calendar behind this banner, and the three summary cards
             * (total settled + trend + sparkline, previous settled, upcoming
             * settlement) are all live now. What is still mock-backed is the
             * per-settlement detail page below, the settlement-cycle dialog's
             * cycle/bank-account block, the held-funds card, and the previous
             * settlement's UTR and gross/tax/fee breakup — those last are passed
             * nowhere rather than rendered from mock-data.ts, so nothing invented
             * reaches the screen. They stay flagged until a contract exists. */}
            {/* Same banner as the MCA screens; View calendar opens the
                calendar in this page's header rather than navigating. */}
            <SettlementHolidayBanner onViewCalendar={() => setCalendarOpen(true)} />

            <PageHeader
              title="Settlements"
              subtitle="Daily settlement activity and bank transfers"
              actions={
                <>
                  {/* MOCK: no settlement-summary endpoint for the cycle / bank
                  account yet, so this shows outside production only. */}
                  {showPayoutDetails && (
                    <SettlementDetailsDialog
                      cycleValue={summary.cycle.value}
                      cycleFrequency={summary.cycle.frequency}
                      bankAccount={summary.bankAccount}
                      bankAccountStatus={summary.bankAccountStatus}
                    />
                  )}
                  <span data-guide="mca-settlement-calendar" className="inline-flex">
                    <SettlementCalendarButton
                      rows={enhancedRows}
                      todayKey={calendar.today}
                      nextSettlementDate={calendar.nextSettlement.date}
                      nextSettlementReason={calendar.nextSettlement.reason}
                      nextSettlementSkippedDays={calendar.nextSettlement.skippedDays}
                      hasUpcomingHoliday={calendar.hasUpcomingHoliday}
                      open={calendarOpen}
                      onOpenChange={setCalendarOpen}
                    />
                  </span>
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
                    // MOCK (Payments, outside production only): the previous
                    // payout's time, UTR and gross/tax/fee breakup have no endpoint.
                    previousSettledTimeLabel={
                      mockPrev ? summary.previousSettled.timeLabel : undefined
                    }
                    previousSettledUtrNumber={mockPrev?.utrNumber}
                    previousSettledGrossLabel={
                      mockPrev?.grossAmount != null
                        ? formatCurrency(mockPrev.grossAmount, "INR")
                        : undefined
                    }
                    previousSettledTaxLabel={
                      mockPrev?.tax != null ? formatCurrency(mockPrev.tax, "INR") : undefined
                    }
                    previousSettledFeeLabel={
                      mockPrev?.fee != null ? formatCurrency(mockPrev.fee, "INR") : undefined
                    }
                    upcomingSettlementAmount={upcomingSettlementAmount}
                    upcomingSettlementTimeLabel={upcomingSettlementLabel}
                    fullAmounts={!isMca}
                    combinedLayout={!isMca}
                    previousSettledCurrencySplit={mockPrev?.currencySplit}
                    pendingInvoiceCount={upcomingPendingInvoiceCount}
                    onUploadInvoice={() => router.push("/mca-transactions")}
                  />
                </div>

                <DataTableCard<SettlementRow>
                  tabs={
                    showPayoutDetails ? (
                      <UnderlineTabs
                        tabs={SETTLEMENT_STATUS_TABS}
                        value={statusTab}
                        onValueChange={(v) => setStatusTab(v as SettlementStatus)}
                      />
                    ) : undefined
                  }
                  toolbar={
                    <div className="flex flex-wrap items-center gap-2">
                      <RotatingSearchInput
                        value={search}
                        onSearch={onSearch}
                        words={
                          showPayoutDetails
                            ? ["Settlement ID", "UTR number", "Settlement date"]
                            : ["Settlement date", "Merchant ID"]
                        }
                        className="w-40 sm:w-56"
                      />

                      <div className="flex flex-wrap items-center gap-1.5">
                        <SettlementDateFilter value={dateFilter} onChange={onDateFilter} />
                      </div>

                      {/* Refresh / Columns, the Transactions table's action row.
                      No Report: settlement reports only download per date
                      (the row's Download), there is no whole-list endpoint. */}
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={
                            <Icon
                              name="refresh"
                              className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
                            />
                          }
                          onClick={() => void refetch()}
                          disabled={isFetching}
                          className={TOOLBAR_BUTTON_CLASS}
                        >
                          Refresh
                        </Button>
                        <ColumnManager
                          columns={columnDefs}
                          order={effectiveColumnOrder}
                          onOrderChange={setColumnOrder}
                          hiddenKeys={[...hiddenColumns]}
                          onHiddenKeysChange={(next) => setHiddenColumns(new Set(next))}
                          onReset={onResetColumns}
                        />
                      </div>
                    </div>
                  }
                  errorState={
                    isError && !enhancedIsMock ? (
                      <PlaceholderState
                        variant="error"
                        title="Couldn't load settlements"
                        description="Something went wrong while fetching data."
                        className="py-14"
                        action={
                          <Button variant="outline" size="sm" onClick={() => void refetch()}>
                            Retry
                          </Button>
                        }
                      />
                    ) : undefined
                  }
                  emptyState={
                    <PlaceholderState
                      variant="empty-table"
                      title={emptyCopy.title}
                      description={emptyCopy.description}
                      className="py-14"
                    />
                  }
                  columns={buildSettlementColumns({
                    columnOrder: effectiveColumnOrder,
                    hiddenColumns,
                    showMerchantId,
                    withPayoutDetails: showPayoutDetails,
                  })}
                  data={filteredEnhancedRows}
                  isLoading={!enhancedIsMock && isPending}
                  emptyTitle={emptyCopy.title}
                  emptyDescription={emptyCopy.description}
                  rowKey={(row) => `${row.merchantId ?? ""}:${row.id}`}
                  pagination={{ mode: "client", pageSize: 10 }}
                  maxBodyHeight="none"
                  // Payments: the whole row opens the details drawer; clicks on the
                  // row's own buttons are skipped by DataTable.
                  onRowClick={showPayoutDetails ? openDetails : undefined}
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
                          showPayoutDetails
                            ? openDetails(row)
                            : router.push(
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
              <GuideLauncher
                steps={MCA_SETTLEMENT_GUIDE_STEPS}
                storageKey={MCA_SETTLEMENT_GUIDE_KEY}
              />
            )}
          </>
        )}
      </div>

      {showPayoutDetails && (
        <SettlementDetailsDrawer
          settlement={detailRow}
          open={drawerOpen}
          onOpenChange={onDrawerOpenChange}
          onExpand={expandToPage}
          onDownload={() => detailRow && downloadRowReport(detailRow)}
          instant={instantDrawer}
        />
      )}
      {/* One stable slot for the hand-off layer, so swapping list and page
          under it never remounts it. */}
      {morphLayer((settlement) => ({
        drawer: (
          <SettlementDrawerBody
            settlement={settlement}
            onClose={() => {}}
            onExpand={() => {}}
            onDownload={() => {}}
          />
        ),
        page: (
          <SettlementDetailsPage
            settlement={settlement}
            onBack={() => {}}
            onCollapse={() => {}}
            onDownload={() => {}}
          />
        ),
      }))}
    </MidGuard>
  );
}
