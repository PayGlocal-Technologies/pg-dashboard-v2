"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useScopeId } from "@/lib/hooks/useScopeId";
import type { ProductType } from "@/lib/hooks/useResolvedMids";
import { mcaSettlementDetailPath } from "@/features/dashboard/mca-settlement-report/routes";
import { SettlementDetailsDrawer } from "@/features/dashboard/mca-settlement-report/components/SettlementDetailsDrawer";
import { useApp } from "@/stores/useApp";
import { useGet, usePostQuery } from "@/lib/api/hooks";
import { MidGuard } from "@/components/common/MidGuard";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { Button, Card, DataTable, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ReorderColumnsPopover } from "@/components/common/ReorderColumnsPopover";
import type { TableReqBody } from "@/types/transactions";
import { cn } from "@/lib/utils";
import { formatDayMonth, formatWeekdayDate, formatWeekdayName } from "@/lib/utils/format";
import {
  computeSettlementSchedule,
  previousCaptureDay,
  type SettlementSchedule,
} from "@/features/dashboard/mca-settlement-report/calendarUtils";
import { SettlementCalendarButton } from "@/features/dashboard/mca-settlement-report/components/SettlementCalendarButton";
import { SettlementCycleInfoPanel } from "@/features/dashboard/mca-settlement-report/components/SettlementCycleInfoPanel";
// MOCK (hidden): SettlementDetailsDialog shows the mock cycle/bank account —
// re-enable with its usage in the header actions below.
// import { SettlementDetailsDialog } from "@/features/dashboard/mca-settlement-report/components/SettlementDetailsDialog";
import { SettlementStatCards } from "@/features/dashboard/mca-settlement-report/components/SettlementStatCards";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import {
  MCA_SETTLEMENT_GUIDE_KEY,
  MCA_SETTLEMENT_GUIDE_STEPS,
} from "@/features/dashboard/mca-settlement-report/guide";
import {
  SettlementDateFilter,
  type SettlementDateValue,
} from "@/features/dashboard/mca-settlement-report/components/SettlementDateFilter";
import {
  SETTLEMENT_LOCKED_COLUMN,
  settlementColumnDefs,
  settlementColumnOrder,
  buildSettlementColumns,
} from "@/features/dashboard/mca-settlement-report/columns";
import type { TotalSettledTimeframe } from "@/features/dashboard/mca-settlement-report/constants";
import {
  useSettlementCalendar,
  useSettlementList,
  useSettlementOverview,
  useSettlementReportDownload,
  useSettlementUpcoming,
} from "@/features/dashboard/mca-settlement-report/hooks";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import type { SettlementRow } from "@/features/dashboard/mca-settlement-report/types";

const SETTLEMENT_PAGE_LIMIT = 50;

/** Rows per page in the enhanced table. Sent to the endpoint as `limit`, so
 *  this is the server's page size, not a client-side slice. */
const SETTLEMENT_TABLE_PAGE_SIZE = 10;

/** "Tonight" only holds when today's payments are still on track for a plain
 * T+1 cutoff, once a weekend/holiday pushes the date out, name the actual day
 * instead so the merchant isn't left assuming it's still settling tonight. */
function upcomingSettlementTimeLabel(schedule: SettlementSchedule): string {
  if (!schedule.affectedByNonWorkingDay) return "Tonight · 12:00 AM IST";
  const { settlementDate } = schedule;
  return `${formatWeekdayName(settlementDate)} · ${formatDayMonth(settlementDate)}`;
}

/**
 * Client-side text search over the settlement date and merchant id. There is no
 * settlement id to search for — the date is the key, so `row.id` matched here
 * IS the date.
 *
 * BACKEND GAP: the list endpoint pages server-side (`page`/`limit`) but has no
 * `q`, so this only reaches the page in hand. It needs a server-side search
 * parameter, or the search has to give way to the date filter.
 */
function filterSettlementRows(rows: SettlementRow[], search: string): SettlementRow[] {
  if (!search) return rows;
  const q = search.toLowerCase();
  return rows.filter(
    (row) => row.id.toLowerCase().includes(q) || (row.merchantId ?? "").toLowerCase().includes(q)
  );
}

/** This screen is PACB only. The Payments settlement report is a separate
 *  feature on its own route, so nothing here branches on product. */
const PRODUCT: ProductType = "PACB";

export function McaSettlementReportFeature() {
  const router = useRouter();

  // Real bank-holiday calendar (/gcc/v1/calendar). Everything date-shaped on
  // this page derives from it: today, the next settlement, the T+1 pushout
  // behind the banner, and the calendar popover's holiday markers.
  const calendar = useSettlementCalendar();
  // The one download path every surface on this screen goes through: the
  // table's rows, the Previous settled card, and the detail page behind a row
  // (which calls the same hook itself). See useSettlementReportDownload.
  const { download: downloadSettlementReport } = useSettlementReportDownload();

  /**
   * The Merchant ID column exists only for an account whose settlements can
   * actually come from more than one MID. Settlements are keyed by date, and a
   * UCIC-scoped list spans MIDs, so on a multi-MID account the date no longer
   * identifies a row on its own and the merchant has to be visible — and has to
   * travel with every drill-down and download. On a single-MID account it would
   * be one value repeated down the page, so the column is not rendered at all.
   */
  const paCbMids = useApp((s) => s.paCbMids);
  const showMerchantId = paCbMids.length > 1;
  // The one id every path-scoped endpoint on this page takes: the product MID
  // for a single-MID account, the selected MID, or the UCIC id for a multi-MID
  // account with nothing selected. The settlement endpoints accept the UCIC id
  // in that slot, so the table and the cards share this scope and always report
  // over the same set of accounts.
  const { scopeId } = useScopeId(PRODUCT);

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount; the URL is not kept in sync as
  // the merchant edits filters afterwards.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [dateFilter, setDateFilter] = useState<SettlementDateValue | undefined>(undefined);
  const [showCycleInfo, setShowCycleInfo] = useState(false);
  /**
   * "View details" opens the drawer, not the page — the same flow as the MCA
   * transactions table. The table stays mounted underneath, so filters, paging
   * and scroll are untouched while the drawer is open and after it closes.
   * Expand then hands the same settlement off to the full page.
   *
   * The row itself is held rather than a key, because the drawer needs both
   * halves of the settlement's identity (merchant and date) and a row already
   * carries them.
   */
  const [detailsRow, setDetailsRow] = useState<SettlementRow | null>(null);
  /**
   * Seeded from ?settlement=&mid=, which is how Collapse on the detail page
   * hands a settlement back to the drawer. Read once on mount, like ?q= above:
   * the URL is not kept in sync afterwards, so closing the drawer does not
   * need to rewrite it.
   */
  const [drawerOpen, setDrawerOpen] = useState(() => !!searchParams.get("settlement"));
  const collapsedSettlementDate = searchParams.get("settlement");
  const collapsedMerchantId = searchParams.get("mid");
  /** The table's page, sent to the endpoint as `page`. Reset whenever the date
   *  filter narrows the set, or the current page can sit past the end of it. */
  const [page, setPage] = useState(1);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const dateFilterEnd = dateFilter
    ? dateFilter.mode === "range"
      ? (dateFilter.to ?? dateFilter.from)
      : dateFilter.from
    : undefined;
  // Total settled card: the selected timeframe drives the overview fetch, so
  // total / trend / chart all move together.
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
  const onDateFilter = (v: SettlementDateValue | undefined) => {
    setDateFilter(v);
    setPage(1);
  };

  const onResetColumns = () => {
    setColumnOrder(null);
    setHiddenColumns([]);
  };

  /**
   * Rows the ENHANCED view renders: the live settlement list, paged
   * SERVER-side. `totalCount` is the filtered count across all pages, so the
   * pager is driven by it rather than by the length of the page in hand.
   */
  const {
    rows: listRows,
    totalCount: listTotalCount,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useSettlementList(scopeId, {
    startDate: dateFilter?.from,
    endDate: dateFilterEnd ?? dateFilter?.from,
    page,
    limit: SETTLEMENT_TABLE_PAGE_SIZE,
  });

  /**
   * The non-working-day metadata, layered on here rather than in the mapper.
   * No endpoint returns it and none is asked to: it falls out of walking the
   * T+1 rules back from the settlement date against the LIVE holiday calendar,
   * which only this component has. It drives the "moved by a bank holiday"
   * note on the detail page and the calendar popover's markers.
   */
  const enhancedRows = useMemo(
    () =>
      listRows.map((row) => {
        const captureDate = previousCaptureDay(row.id, calendar.holidays);
        const schedule = computeSettlementSchedule(captureDate, calendar.holidays);
        return {
          ...row,
          paymentReceivedAt: `${captureDate}T00:00:00+05:30`,
          affectedByNonWorkingDay: schedule.affectedByNonWorkingDay,
          nonWorkingDayReason: schedule.nonWorkingDayReason ?? undefined,
          nonWorkingDayDate: schedule.nonWorkingDayDate ?? undefined,
          nonWorkingDayName: schedule.nonWorkingDayName ?? undefined,
        };
      }),
    [listRows, calendar.holidays]
  );

  /** Column order falls back to the default for the current column set, so
   *  toggling the Merchant ID column on cannot leave a stale order behind. */
  const columnDefs = useMemo(() => settlementColumnDefs(showMerchantId), [showMerchantId]);
  const effectiveColumnOrder = useMemo(
    () => columnOrder ?? settlementColumnOrder(showMerchantId),
    [columnOrder, showMerchantId]
  );

  /**
   * Search still filters client-side, so it only reaches the page in hand. The
   * list endpoint has no `q` parameter — flagged with the backend. Until it
   * does, the date filter is the one that narrows the whole set.
   */
  const filteredEnhancedRows = useMemo(
    () => filterSettlementRows(enhancedRows, search),
    [enhancedRows, search]
  );

  /** Row-scoped report download, shared by both views.
   *
   *  Keyed off `row.date`, the settlement date, which is also the row's id now
   *  that settlements have no id of their own. The row's own merchant is passed
   *  when the summary names one, since a UCIC-scoped list can span merchants and
   *  each row's report has to be asked for against its own account. */
  /**
   * The settlement the drawer is showing. Normally the clicked row, but on a
   * Collapse the row has not been clicked — it comes from the URL, and the
   * list may not even have fetched it (a merchant can land on a date outside
   * the current page). A minimal stand-in row carries the only two fields the
   * drawer needs, since it fetches the detail itself from that pair.
   */
  const drawerRow: SettlementRow | null =
    detailsRow ??
    (collapsedSettlementDate
      ? {
          id: collapsedSettlementDate,
          merchantId: collapsedMerchantId ?? undefined,
          amount: 0,
          currency: "INR",
          transactionCount: 0,
          date: `${collapsedSettlementDate}T00:00:00+05:30`,
          paymentReceivedAt: `${collapsedSettlementDate}T00:00:00+05:30`,
          affectedByNonWorkingDay: false,
        }
      : null);

  const openDetailsDrawer = (row: SettlementRow) => {
    setDetailsRow(row);
    setDrawerOpen(true);
  };

  /** Expand: same settlement, full page. Closes the drawer first so it is not
   *  left mounted behind the navigation. */
  const expandDetailsToPage = (row: SettlementRow) => {
    setDrawerOpen(false);
    router.push(mcaSettlementDetailPath(row.merchantId || scopeId, row.id));
  };

  const downloadRowReport = (row: SettlementRow) =>
    // `row.id`, not `row.date`: the endpoint takes the bare YYYY-MM-DD in its
    // path, and `row.date` is the display timestamp. See the hook's doc.
    downloadSettlementReport(row.id, row.merchantId);

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
    <MidGuard productType={PRODUCT}>
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

            <Card className="gap-0 overflow-hidden p-0">
              {/* Same toolbar as the MCA transactions table: one flex row
                  divided off by a bottom border, search left, filters beside
                  it, actions pushed right, and every action on the same
                  compact h-auto/py-1 height. */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <RotatingSearchInput
                  value={search}
                  onSearch={onSearch}
                  words={["Settlement date", "Merchant ID"]}
                  className="w-40 sm:w-56"
                />

                <div className="flex flex-wrap items-center gap-1.5">
                  <SettlementDateFilter value={dateFilter} onChange={onDateFilter} />
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={
                      <Icon
                        name="refresh"
                        className={cn("h-3.5 w-3.5", isListLoading && "animate-spin")}
                      />
                    }
                    onClick={refetchList}
                    disabled={isListLoading}
                    className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
                  >
                    Refresh
                  </Button>
                  <ReorderColumnsPopover
                    columns={columnDefs}
                    order={effectiveColumnOrder}
                    onOrderChange={setColumnOrder}
                    onReset={onResetColumns}
                    hiddenKeys={hiddenColumns}
                    onHiddenKeysChange={setHiddenColumns}
                    fixedKeys={[SETTLEMENT_LOCKED_COLUMN]}
                    fixedReason="Always shown. A settlement row is unreadable without its date."
                  />
                </div>
              </div>

              {isListError ? (
                <PlaceholderState
                  variant="error"
                  title="Couldn't load settlements"
                  description="Something went wrong while fetching data."
                  className="py-14"
                  action={
                    <Button variant="outline" size="sm" onClick={refetchList}>
                      Retry
                    </Button>
                  }
                />
              ) : !isListLoading && filteredEnhancedRows.length === 0 ? (
                <PlaceholderState
                  variant="no-settlements"
                  title="No settlements yet"
                  description="Settlement reports will appear here once transactions are processed."
                  className="py-14"
                />
              ) : (
                <DataTable
                  columns={buildSettlementColumns({
                    columnOrder: effectiveColumnOrder,
                    hiddenColumns,
                    showMerchantId,
                  })}
                  // The whole row opens the drawer, via DataTable's own
                  // row-level handler rather than a wrapper inside every cell.
                  // Clicks on the row's buttons (Download, View details, the
                  // Merchant ID copy control) are skipped by it, so each of
                  // those still does only its own job.
                  onRowClick={openDetailsDrawer}
                  data={filteredEnhancedRows}
                  isLoading={isListLoading}
                  skeletonRows={8}
                  emptyTitle="No settlements yet"
                  emptyDescription="Settlement reports will appear here once transactions are processed"
                  rowKey={(row) => `${row.merchantId ?? ""}:${row.id}`}
                  // Server-side: the endpoint pages, so the table is told the
                  // filtered total rather than counting the page in hand.
                  pageSize={SETTLEMENT_TABLE_PAGE_SIZE}
                  page={page}
                  onPageChange={setPage}
                  totalRows={listTotalCount}
                  density="compact"
                  tableLayout="content"
                  className="rounded-none border-0"
                  // Two hover-revealed row actions, as on the old settlement
                  // table: Download, and "View details" — the explicit entry
                  // point into the drawer, kept alongside the row click itself
                  // so details are reachable either way. Neither needs to stop
                  // propagation: onRowClick already ignores clicks that land
                  // inside a button.
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailsDrawer(row)}
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
        <GuideLauncher steps={MCA_SETTLEMENT_GUIDE_STEPS} storageKey={MCA_SETTLEMENT_GUIDE_KEY} />

        {/* Kept mounted alongside the table rather than inside it: the table is
            what stays on screen behind the drawer, and re-rendering it on every
            open would drop its scroll position. */}
        <SettlementDetailsDrawer
          row={drawerRow}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onExpand={expandDetailsToPage}
          fallbackMerchantId={scopeId}
        />
      </div>
    </MidGuard>
  );
}
