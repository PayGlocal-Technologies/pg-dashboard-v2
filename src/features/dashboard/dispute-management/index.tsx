"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Button,
  Callout,
  CalloutIcon,
  CalloutText,
  CalloutTitle,
  ColumnManager,
  DataTableCard,
  Field,
  FieldLabel,
  IconButton,
  Label,
  PageHeader,
  RadioGroup,
  RadioGroupItem,
  type DataTableSortState,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { FilterChipGroup } from "@/components/common/filters/FilterChips";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { NoFeatureView } from "@/components/common/NoFeatureView";
import { useFeatureApplicable } from "@/lib/hooks/useFeatureApplicable";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { ReportDownloadDrawer, type ReportWindow } from "@/components/common/ReportDownloadDrawer";
import { toYmd } from "@/components/common/reportWindow";
import { rowActionColumn } from "@/components/common/rowActionColumn";
import {
  DrawerExpandMorph,
  drawerRect,
  elementRect,
  type DrawerMorph,
} from "@/components/common/DrawerExpandMorph";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import { useApp } from "@/stores/useApp";
import {
  PA_DRAWER_WIDTH_PX,
  TransactionDetailsDrawer,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailsDrawer";
import { useTransactionLookup } from "@/features/dashboard/pa-transactions/useTransactionLookup";
import {
  TransactionDateTimeFilter,
  type TransactionDateTimeValue,
} from "@/features/dashboard/pa-transactions/components/TransactionDateTimeFilter";
import {
  DisputeDetailPlaceholder,
  DisputeDetailView,
  DisputeFlowDialogs,
  useDisputeDetailModel,
} from "@/features/dashboard/dispute-management/components/detail/DisputeDetailView";
import {
  DisputeDetailsDrawer,
  DisputeDrawerBody,
} from "@/features/dashboard/dispute-management/components/detail/DisputeDetailsDrawer";
import { HowItWorksDialog } from "@/features/dashboard/dispute-management/components/HowItWorksDialog";
import {
  buildDisputeColumns,
  disputeColumnDefs,
} from "@/features/dashboard/dispute-management/columns";
import { DisputeStatCards } from "@/features/dashboard/dispute-management/components/DisputeStatCards";
import { MOCK_DISPUTE_ROWS } from "@/features/dashboard/dispute-management/mockRows";
import {
  ALL_DISPUTES_TAB,
  CB_LEVEL_META,
  CB_SORT_KEY,
  DEFAULT_DISPUTE_TAB,
  DISPUTE_FEATURE,
  DEFAULT_SORT,
  DISPLAY_STATUS_META,
  DISPUTE_STATUS_SEGMENTS,
  DISPUTE_TIMEFRAMES,
  EMPTY_TAB_COPY,
  FIRST_TIME_STORAGE_KEY,
  FIXED_COLUMN_KEYS,
  PAGE_LIMIT,
  PAGE_SIZE_OPTIONS,
  SEARCH_WORDS,
  STATUS_FILTER_BY_TAB,
  type DisputeTimeframe,
} from "@/features/dashboard/dispute-management/constants";
import {
  buildDisputeReportBody,
  buildDisputeSearchBody,
  dismissFirstTime,
  readFirstTime,
  sortReasonCodes,
  type DisputeSort,
} from "@/features/dashboard/dispute-management/helpers";
import {
  useCbStaticData,
  useDisputeEnabled,
  useDisputeMidScope,
  useDisputeReport,
  useDisputeSearch,
  useNow,
  type ReportSource,
} from "@/features/dashboard/dispute-management/hooks";
import type { DisputeBucket, DisputeRecord } from "@/features/dashboard/dispute-management/types";

// ── Metrics (mock) ────────────────────────────────────────────────────────────
//
// MOCK: the Metrics section has no backend yet (see types.ts). Everything in
// this block reads MOCK_DISPUTE_ROWS; the rest of the page is live.

/** "08/08/2026, 10:22:15" -> epoch ms, the mock rows' date shape. */
function parseMockDate(value?: string): number | undefined {
  if (!value) return undefined;
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  if (!datePart) return undefined;
  const [day, month, year] = datePart.split("/").map(Number);
  if (!day || !month || !year) return undefined;
  const [hours, minutes, seconds] = (timePart ?? "00:00:00").split(":").map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0).getTime();
}

const RECOVERED_TREND = [
  { x: "Jan", y: 1200 },
  { x: "Feb", y: 1450 },
  { x: "Mar", y: 1800 },
  { x: "Apr", y: 2100 },
];

function useMockMetrics(timeframe: DisputeTimeframe, nowMs: number) {
  return useMemo(() => {
    const start = new Date(nowMs);
    if (timeframe === "today") start.setHours(0, 0, 0, 0);
    else if (timeframe === "1w") start.setDate(start.getDate() - 7);
    else if (timeframe === "1m") start.setMonth(start.getMonth() - 1);
    else if (timeframe === "3m") start.setMonth(start.getMonth() - 3);
    else {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    const startMs = start.getTime();
    const rows = MOCK_DISPUTE_ROWS.filter((row) => {
      const ts = parseMockDate(row.disputedOn);
      return ts != null && ts >= startMs && ts <= nowMs;
    });
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
    const reasonBreakdown =
      rows.length === 0
        ? []
        : Array.from(counts.entries())
            .map(([reason, count]) => ({
              reason,
              count,
              pct: Math.round((count / rows.length) * 100),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    return { rows, reasonBreakdown };
  }, [timeframe, nowMs]);
}

// ── Page ──────────────────────────────────────────────────────────────────────

// Sets scrollTop via a standalone function since the element comes from
// useContentAreaElement, and React Compiler's lint forbids mutating a
// hook-returned value directly (as on PA Transactions).
function setScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}

/**
 * Dispute Management, at /dispute-management: pg-dashboard (uat)
 * `features/chargebacks` for a merchant (`midType !== "GLOCAL"`).
 *
 * Gated as pg-dashboard gates it, in two steps: the merchant must hold the
 * DISPUTE product (or a role that bypasses it), else the page explains the
 * product (EmptyEnableProduct, with its Contact us); a selected MID must
 * carry DISPUTE in any of its feature lists, else the standard "not
 * available for this MID" view (ChargebacksTable.tsx:472-481). There is no
 * PA-only check: pg-dashboard asks useFeatureApplicable alone. The sidebar
 * entry carries the `cbSearchResults` permission, as in pg-dashboard.
 */
export function DisputeManagementFeature() {
  const isEnabled = useDisputeEnabled();
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const hasFeature = useFeatureApplicable(selectedMid, DISPUTE_FEATURE);

  if (!isEnabled) {
    return (
      <div className="page-enter mx-auto max-w-[1400px] space-y-4">
        <PageHeader title="Dispute Management" />
        <div className="flex flex-col items-center rounded-xl border border-border bg-card pb-16">
          <PlaceholderState
            variant="empty-table"
            title="Stay protected against Disputes"
            description="PayGlocal gives you end-to-end visibility and support for handling disputed transactions."
            className="pt-16 pb-4"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(SUPPORT_EMAIL)
                .then(() => toast.success("Support email copied to clipboard"));
            }}
          >
            Contact us
          </Button>
        </div>
      </div>
    );
  }

  if (selectedMid && !hasFeature) return <NoFeatureView />;

  return <DisputeManagementPage />;
}

/** EmptyEnableProduct's Contact us: copies this address. */
const SUPPORT_EMAIL = "merchant.support@payglocal.in";

function DisputeManagementPage() {
  const now = useNow();
  const staticData = useCbStaticData();
  const isGuestUser = useApp((s) => s.isGuestUser);
  const username = useApp((s) => s.profile?.username);
  const { merchantMids, showMerchantId, isReady } = useDisputeMidScope();

  // A `?tab=` link (Home's Open disputes card sends ACTION_REQUIRED) opens on
  // that tab; one this tab set does not have falls back to the landing tab.
  const tabParam = useSearchParams().get("tab");
  const [tab, setTab] = useState<DisputeBucket>(
    () => DISPUTE_STATUS_SEGMENTS.find((t) => t.value === tabParam)?.value ?? DEFAULT_DISPUTE_TAB
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[] | undefined>(undefined);
  const [stageFilter, setStageFilter] = useState<string[] | undefined>(undefined);
  const [reason, setReason] = useState<string[] | undefined>(undefined);
  const [disputedDate, setDisputedDate] = useState<TransactionDateTimeValue | undefined>(undefined);
  const [sort, setSort] = useState<DisputeSort>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_LIMIT);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  // computeIsFirstTime, read every render (the profile may arrive after the
  // page); dismissing writes it back.
  const [firstTimeDismissed, setFirstTimeDismissed] = useState(false);
  const firstTime = !firstTimeDismissed && readFirstTime(FIRST_TIME_STORAGE_KEY, username);

  // The Metrics section's own period control (mock, see above).
  const [metricsTimeframe, setMetricsTimeframe] = useState<DisputeTimeframe>("ytd");
  const [metricsNow] = useState(() => Date.now());
  const metrics = useMockMetrics(metricsTimeframe, metricsNow);

  // The Status filter only offers this tab's statuses; anything picked on
  // another tab that this one lacks is dropped.
  const statusOptions = STATUS_FILTER_BY_TAB[tab].map((value) => ({
    value,
    label: DISPLAY_STATUS_META[value].label,
  }));
  const activeStatus = statusFilter?.filter((v) => statusOptions.some((o) => o.value === v));
  // The Stage filter, on every tab: both compliance levels by their filter labels.
  const stageOptions = (Object.keys(CB_LEVEL_META) as (keyof typeof CB_LEVEL_META)[]).map(
    (level) => ({
      value: level,
      label: CB_LEVEL_META[level].filterLabel ?? CB_LEVEL_META[level].label,
    })
  );
  const reasonOptions = sortReasonCodes(Object.keys(staticData?.cbReasonMap ?? {})).map(
    (code) => ({
      value: code,
      label: staticData?.cbReasonMap[code] ? `${code} - ${staticData.cbReasonMap[code]}` : code,
    })
  );

  const body = useMemo(
    () =>
      buildDisputeSearchBody({
        filters: {
          cbLevel: stageFilter,
          displayStatus: activeStatus,
          cbReasonCode: reason,
          startTime: disputedDate?.startTime,
          endTime: disputedDate?.endTime,
        },
        query: search,
        tab,
        sort,
        from: (page - 1) * pageSize,
        pageLimit: pageSize,
        merchantMids,
      }),
    [stageFilter, activeStatus, reason, disputedDate, search, tab, sort, page, pageSize, merchantMids]
  );
  const list = useDisputeSearch(body, isReady && !isGuestUser);

  const hasFilters =
    !!stageFilter?.length || !!activeStatus?.length || !!reason?.length || !!disputedDate;
  const hasActive = hasFilters || search.trim() !== "";
  // pg-dashboard's first-dispute popover: a merchant's very first dispute,
  // alone on Action required with no filter applied (search is not a filter there).
  const showFirstDispute =
    firstTime && tab === "ACTION_REQUIRED" && !hasFilters && list.rows.length === 1;

  // Every list interaction goes back to page 1, as pg-dashboard does.
  const resetPage =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };
  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    // A search runs across every bucket, cleared or not, as pg-dashboard's handleSearch.
    setTab(ALL_DISPUTES_TAB);
  };
  const onClear = () => {
    setStageFilter(undefined);
    setStatusFilter(undefined);
    setReason(undefined);
    setDisputedDate(undefined);
    setSearch("");
    setPage(1);
  };
  const onSortChange = (next: DataTableSortState) => {
    setSort(
      next
        ? { key: CB_SORT_KEY[next.columnKey] ?? null, isAscOrder: next.order === "ascend" }
        : { key: null, isAscOrder: undefined }
    );
    setPage(1);
  };
  const sortValue: DataTableSortState = (() => {
    if (!sort.key || sort.isAscOrder === undefined) return null;
    const columnKey = Object.keys(CB_SORT_KEY).find((k) => CB_SORT_KEY[k] === sort.key);
    return columnKey ? { columnKey, order: sort.isAscOrder ? "ascend" : "descend" } : null;
  })();

  // Report: the shared drawer, then the chosen source (V2, the async job, by
  // default; or V1, a direct CSV), with the list's current filters, search,
  // tab and sort riding along. The drawer is remounted on every open so it
  // re-seeds from the Disputed date chip; the source choice lives here, so it
  // survives closing and reopening, as in pg-dashboard.
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKey, setReportKey] = useState(0);
  const [reportSource, setReportSource] = useState<ReportSource>("v2");
  const report = useDisputeReport(() => setReportOpen(false));
  const openReport = () => {
    setReportKey((k) => k + 1);
    setReportOpen(true);
  };
  const generateReport = (window: ReportWindow) =>
    report.start(reportSource, buildDisputeReportBody(body, window));

  const handleRefresh = async () => {
    const { isError } = await list.refetch();
    if (isError) toast.error("Couldn't refresh disputes. Please try again.");
    else toast.success("Disputes updated");
  };

  // Details: a row opens the drawer (collapsed view); Expand hands the same
  // dispute to a full page in place of the list; Collapse and Back return.
  const contentEl = useContentAreaElement();
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<{ mid: string; cbId: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);
  const [morph, setMorph] = useState<DrawerMorph | null>(null);
  const [instantDrawer, setInstantDrawer] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const { dispute, isLoading: isCaseLoading, flow } = useDisputeDetailModel({
    mid: selected?.mid ?? "",
    cbId: selected?.cbId ?? "",
    // The evidence form needs the page's room: opening it from the drawer expands first.
    onOpenForm: () => {
      if (!pageOpen) expandToPage();
    },
  });

  function dismissFirstDispute() {
    dismissFirstTime(FIRST_TIME_STORAGE_KEY, username);
    setFirstTimeDismissed(true);
  }

  // The Order ID / Transaction ID link: the PA transaction's own drawer, over
  // the dispute (pg-dashboard opens PaTransactionDetails from the Order ID).
  const txnLookup = useTransactionLookup();

  function onViewDetails(row: DisputeRecord) {
    // handleFirstTime: only does anything while the notice is showing.
    if (showFirstDispute) dismissFirstDispute();
    setSelected({ mid: row.merchantId, cbId: row.cbId });
    setInstantDrawer(false);
    setDrawerOpen(true);
  }

  function onDrawerOpenChange(open: boolean) {
    if (!open) setInstantDrawer(false);
    setDrawerOpen(open);
  }

  function showPage() {
    setPageOpen(true);
    if (contentEl) setScrollTop(contentEl, 0);
  }

  function expandToPage() {
    if (contentEl) setScrollPosition(contentEl.scrollTop);
    if (reduceMotion) {
      setDrawerOpen(false);
      showPage();
      return;
    }
    const slot = elementRect(slotRef.current);
    setInstantDrawer(true);
    setMorph({
      kind: "expand",
      from: drawerRect(PA_DRAWER_WIDTH_PX),
      to: elementRect(contentEl),
      page: {
        top: slot.top + (contentEl ? contentEl.scrollTop : window.scrollY),
        left: slot.left,
        width: slot.width,
      },
    });
    setDrawerOpen(false);
  }

  function collapseToDrawer() {
    if (reduceMotion) {
      setPageOpen(false);
      setDrawerOpen(true);
      return;
    }
    const slot = elementRect(slotRef.current);
    setInstantDrawer(true);
    setMorph({
      kind: "collapse",
      from: elementRect(contentEl),
      to: drawerRect(PA_DRAWER_WIDTH_PX),
      page: { top: slot.top, left: slot.left, width: slot.width },
    });
  }

  function backToList() {
    setPageOpen(false);
    setSelected(null);
    flow.backToDetail();
  }

  // Puts the list back where it was once it has re-rendered in the page's place.
  useEffect(() => {
    if (!pageOpen && contentEl) setScrollTop(contentEl, scrollPosition);
  }, [pageOpen, contentEl, scrollPosition]);

  const columnDefs = disputeColumnDefs({ tab, showMerchantId });
  const tableColumns = [
    ...buildDisputeColumns({ tab, showMerchantId, now, columnOrder, hiddenColumns }),
    // "Take action" when the merchant's own bucket is ACTION_REQUIRED, else
    // "View details" (pg-dashboard uat 5f3a0b793, columns.tsx: each side
    // reads its own bucket).
    rowActionColumn<DisputeRecord>((row) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetails(row)}
        rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
        className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
      >
        {row.merchantBucket === "ACTION_REQUIRED" ? "Take action" : "View details"}
      </Button>
    )),
  ];


  const emptyCopy = hasActive
    ? {
        title: "No disputes match these filters",
        description: "Try a wider date range, or clear a filter to see more.",
      }
    : EMPTY_TAB_COPY[tab];

  return (
    // Full-bleed background matching the cards below, as the Transactions page.
    <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
      {/* One stable slot the list and the expanded page take turns in. */}
      <div ref={slotRef} className="mx-auto max-w-[1400px]">
        {pageOpen && selected ? (
          <div className="[&_.shadow-sm]:shadow-none">
            {dispute ? (
              <DisputeDetailView
                dispute={dispute}
                flow={flow}
                layout="page"
                backLabel="Back to Dispute Management"
                onBack={backToList}
                onCollapse={collapseToDrawer}
                onOpenTransaction={txnLookup.openTransaction}
              />
            ) : (
              <DisputeDetailPlaceholder isLoading={isCaseLoading} layout="page" />
            )}
          </div>
        ) : (
          <div className="page-enter space-y-4">
            <PageHeader
              title="Dispute Management"
              subtitle="Track, respond to and resolve payment disputes"
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="help-circle" className="h-3.5 w-3.5" />}
                  onClick={() => setHowItWorksOpen(true)}
                >
                  How it works
                </Button>
              }
            />

            {/* MOCK: see the Metrics block above. */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Metrics</h2>
                <SegmentedTabs
                  options={DISPUTE_TIMEFRAMES}
                  value={metricsTimeframe}
                  onChange={(v) => setMetricsTimeframe(v as DisputeTimeframe)}
                />
              </div>
              <DisputeStatCards
                disputes={metrics.rows}
                recoveredLabel="₹2.1K"
                recoveredTrendPct={19}
                recoveredTrend={RECOVERED_TREND}
                reasonBreakdown={metrics.reasonBreakdown}
              />
            </div>

            {showFirstDispute && (
              <Callout variant="info">
                <CalloutIcon variant="info" />
                <div className="min-w-0 flex-1">
                  <CalloutTitle>New dispute raised</CalloutTitle>
                  <CalloutText>Review the dispute details and the response deadline.</CalloutText>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => list.rows[0] && onViewDetails(list.rows[0])}
                    className="mt-1 h-auto w-fit p-0 text-sm font-medium"
                  >
                    Review dispute
                  </Button>
                </div>
                <IconButton
                  aria-label="Dismiss"
                  variant="ghost"
                  size="sm"
                  onClick={dismissFirstDispute}
                >
                  <Icon name="x" className="h-4 w-4" />
                </IconButton>
              </Callout>
            )}

            <DataTableCard<DisputeRecord>
              // Flat table: no lift on the card itself or on the controls inside it.
              className="shadow-none [&_.shadow-sm]:shadow-none"
              tabs={
                <SegmentedTabs
                  options={DISPUTE_STATUS_SEGMENTS}
                  value={tab}
                  onChange={(v) => {
                    setTab(v as DisputeBucket);
                    setPage(1);
                  }}
                />
              }
              toolbar={
                <div className="flex flex-wrap items-center gap-2.5">
                  <RotatingSearchInput
                    value={search}
                    onSearch={onSearch}
                    words={SEARCH_WORDS}
                    className="min-w-40 max-w-xs flex-1"
                  />

                  <div className="hidden sm:block h-4 w-px bg-border" />

                  {/* One group for the row, so moving from one open chip to the
                  next closes the first and leaves the second open. */}
                  <FilterChipGroup className="flex items-center gap-2 flex-wrap">
                    <MultiSelectChipFilter
                      value={stageFilter}
                      options={stageOptions}
                      onChange={resetPage(setStageFilter)}
                      placeholder="Stage"
                    />
                    {statusOptions.length > 1 && (
                      <MultiSelectChipFilter
                        value={activeStatus}
                        options={statusOptions}
                        onChange={resetPage(setStatusFilter)}
                        placeholder="Status"
                      />
                    )}
                    <MultiSelectChipFilter
                      value={reason}
                      options={reasonOptions}
                      onChange={resetPage(setReason)}
                      placeholder="Reason"
                    />
                    <TransactionDateTimeFilter
                      value={disputedDate}
                      onChange={resetPage(setDisputedDate)}
                      triggerLabel="Disputed Date"
                    />
                  </FilterChipGroup>

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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={
                        <Icon
                          name="refresh"
                          className={cn("h-3.5 w-3.5", list.isFetching && "animate-spin")}
                        />
                      }
                      onClick={() => void handleRefresh()}
                      disabled={!isReady || list.isFetching}
                      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground shadow-none hover:text-foreground"
                    >
                      Refresh
                    </Button>
                    <ColumnManager
                      columns={columnDefs}
                      order={columnOrder ?? columnDefs.map((c) => c.key)}
                      onOrderChange={setColumnOrder}
                      hiddenKeys={hiddenColumns}
                      onHiddenKeysChange={setHiddenColumns}
                      onReset={() => {
                        setColumnOrder(null);
                        setHiddenColumns([]);
                      }}
                      fixedKeys={FIXED_COLUMN_KEYS}
                      fixedReason="Always shown. A dispute is unreadable without its ID, amount and status."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
                      onClick={openReport}
                      disabled={isGuestUser}
                      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground shadow-none hover:text-foreground"
                    >
                      Report
                    </Button>
                  </div>
                </div>
              }
              columns={tableColumns}
              data={list.rows}
              isLoading={isReady && !isGuestUser && list.isPending}
              skeletonRows={pageSize}
              rowKey={(row) => row.cbId}
              emptyState={
                list.isError ? (
                  <PlaceholderState
                    variant="error"
                    title="Couldn't load disputes"
                    description="Something went wrong fetching this list. Try again in a moment."
                    className="py-16"
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <PlaceholderState
                      variant="empty-table"
                      title={emptyCopy.title}
                      description={emptyCopy.description}
                      className="pt-16 pb-3"
                    />
                    {!hasActive && (
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setHowItWorksOpen(true)}
                        className="mb-16 h-auto p-0 text-sm font-medium"
                      >
                        Learn how dispute management works
                      </Button>
                    )}
                  </div>
                )
              }
              emptyTitle={emptyCopy.title}
              emptyDescription={emptyCopy.description}
              sorting={{ value: sortValue, onChange: onSortChange }}
              pagination={{
                mode: "page",
                page,
                pageSize,
                total: list.total,
                onPageChange: setPage,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(1);
                },
              }}
              // The whole row opens the dispute; clicks on the row's own
              // buttons are skipped by DataTable.
              onRowClick={onViewDetails}
              maxBodyHeight="none"
            />
          </div>
        )}
      </div>

      <DisputeDetailsDrawer
        cbId={selected?.cbId ?? ""}
        dispute={dispute}
        isLoading={isCaseLoading}
        flow={flow}
        open={drawerOpen}
        onOpenChange={onDrawerOpenChange}
        onExpand={expandToPage}
        instant={instantDrawer}
        onOpenTransaction={txnLookup.openTransaction}
      />
      {dispute && <DisputeFlowDialogs dispute={dispute} flow={flow} />}
      <TransactionDetailsDrawer
        transaction={txnLookup.transaction}
        open={txnLookup.open}
        onOpenChange={txnLookup.setOpen}
      />
      {morph && selected && dispute && (
        <DrawerExpandMorph
          key={morph.kind}
          morph={morph}
          drawerWidthPx={PA_DRAWER_WIDTH_PX}
          // The drawer's and the page's real insides; the layer is inert.
          drawerContent={<DisputeDrawerBody cbId={selected.cbId} dispute={dispute} flow={flow} />}
          pageContent={
            <div className="[&_.shadow-sm]:shadow-none">
              <DisputeDetailView
                dispute={dispute}
                flow={flow}
                layout="page"
                backLabel="Back to Dispute Management"
                onBack={() => {}}
                onCollapse={() => {}}
                decorative
              />
            </div>
          }
          onCovered={() => setPageOpen(false)}
          onArrive={morph.kind === "expand" ? showPage : () => setDrawerOpen(true)}
          onDone={() => setMorph(null)}
        />
      )}

      <ReportDownloadDrawer
        key={reportKey}
        open={reportOpen}
        onOpenChange={setReportOpen}
        initialDateRange={
          disputedDate
            ? {
                from: toYmd(new Date(disputedDate.startTime)),
                to: toYmd(new Date(disputedDate.endTime)),
              }
            : undefined
        }
        isGenerating={report.isBusy}
        onGenerate={generateReport}
      >
        <Field>
          <FieldLabel>Report Source</FieldLabel>
          <RadioGroup
            value={reportSource}
            onValueChange={(v) => setReportSource(v as ReportSource)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="v2" id="dispute-report-v2" disabled={report.isBusy} />
              <Label htmlFor="dispute-report-v2">V2</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="v1" id="dispute-report-v1" disabled={report.isBusy} />
              <Label htmlFor="dispute-report-v1">V1</Label>
            </div>
          </RadioGroup>
        </Field>
      </ReportDownloadDrawer>
      <HowItWorksDialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen} />
    </div>
  );
}
