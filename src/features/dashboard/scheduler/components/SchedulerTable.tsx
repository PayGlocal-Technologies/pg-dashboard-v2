"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, DataCardList, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import {
  DateRangeFilterChip,
  EMPTY_RELATIVE_RANGE,
  FilterChipGroup,
  SingleSelectFilterChip,
  hasRelativeRange,
  relativeRangeToEpochMs,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import { cn } from "@/lib/utils";
import useNewPermissions from "@/hooks/useNewPermissions";
import {
  PA_DRAWER_WIDTH_PX,
  TransactionDetailsDrawer,
  TransactionDrawerBody,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailsDrawer";
import { TransactionDetailsPage } from "@/features/dashboard/pa-transactions/components/TransactionDetailsPage";
import { useDrawerExpand } from "@/components/common/useDrawerExpand";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";
import { useTransactionLookup } from "@/features/dashboard/pa-transactions/useTransactionLookup";
import {
  buildExecutedColumns,
  buildProjectedColumns,
} from "@/features/dashboard/scheduler/columns";
import {
  SCHEDULER_PAGE_LIMIT,
  SCHEDULER_REPORT_PERMISSION,
  SCHEDULER_STATUS_OPTIONS,
  SCHEDULER_VIEW_TABS,
} from "@/features/dashboard/scheduler/constants";
import {
  buildSchedulerListBody,
  buildSchedulerReportBody,
  defaultSchedulerRange,
  toIsoDate,
} from "@/features/dashboard/scheduler/helpers";
import {
  useSchedulerList,
  useSchedulerMid,
  useSchedulerReport,
  useSchedulerRetry,
} from "@/features/dashboard/scheduler/hooks";
import {
  SchedulerCard,
  SchedulerCardSkeleton,
} from "@/features/dashboard/scheduler/components/SchedulerCard";
import type { SchedulerTxn, SchedulerView } from "@/features/dashboard/scheduler/types";

/**
 * The scheduler's debits, pg-dashboard's SchedulerTable on this app's table
 * layout: Executed / Projected as tabs on the card, Date and Status chips with
 * Refresh and Report on Executed, and cursor paging (the API pages by key, so
 * there is no total). Switching view starts the window and filters over, as
 * pg-dashboard does.
 */
export function SchedulerTable() {
  const router = useRouter();
  const access = useNewPermissions();
  const mid = useSchedulerMid();

  const [view, setView] = useState<SchedulerView>("executed");
  // The chip's two exclusive modes, each in its own state: a picked range, and
  // "Last N …" plus the dates it resolved to when applied. flux applies one by
  // setting it and clearing the other (onChange, then onRelativeChange, or the
  // reverse), so neither handler may touch the other's state, or the clear
  // that follows an apply would wipe what was just picked.
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [relativeRange, setRelativeRange] = useState<RelativeRangeValue>(EMPTY_RELATIVE_RANGE);
  const [relativeDates, setRelativeDates] = useState<{ from: string; to: string } | null>(null);
  // The API needs a window on every request: with neither mode set it gets
  // pg-dashboard's default, yesterday through today (read from the clock once,
  // in an initializer). pg-dashboard pinned that default on as an unremovable
  // filter; here the chip can be cleared, and cleared means "the default".
  const [defaultRange] = useState(defaultSchedulerRange);
  const activeRange = relativeDates ?? dateRange ?? defaultRange;
  const [today] = useState(() => toIsoDate(new Date()));
  const [status, setStatus] = useState("");
  // Cursor paging: cursors[n] is the key that starts page n + 1.
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<(object | null)[]>([null]);

  const resetPaging = () => {
    setPage(1);
    setCursors([null]);
  };

  const body = buildSchedulerListBody({
    from: activeRange.from,
    to: activeRange.to,
    status,
    pageLimit: SCHEDULER_PAGE_LIMIT,
    exclusiveStartKey: cursors[page - 1] ?? null,
  });
  const { rows, nextKey, isLoading, isFetching, isError, refetch } = useSchedulerList(
    mid,
    view,
    body
  );
  const { retry, retryingIds } = useSchedulerRetry(mid, () => void refetch());
  const { download, isDownloading } = useSchedulerReport(mid);
  // A payment's details: the drawer, which Expand widens into the full page
  // in place of the table (see useDrawerExpand).
  const {
    record: detailsRecord,
    pageOpen,
    drawerOpen,
    instantDrawer,
    slotRef,
    open: openDetails,
    onDrawerOpenChange,
    expand,
    collapse,
    back,
    morphLayer,
  } = useDrawerExpand<PaTransaction>({ drawerWidthPx: PA_DRAWER_WIDTH_PX });
  const lookup = useTransactionLookup(openDetails);

  // An SI's payments: the Transactions page searched by the SI ID (it takes
  // its search from ?q=), as Manage Mandates does.
  const openSiTransactions = (row: SchedulerTxn) =>
    router.push(`/pa-transactions?q=${encodeURIComponent(row.siId)}`);
  const openTransaction = (gid: string, row: SchedulerTxn) =>
    lookup.openTransaction(gid, row.merchantId || mid);

  const changeView = (next: string) => {
    setView(next as SchedulerView);
    setDateRange(null);
    setRelativeRange(EMPTY_RELATIVE_RANGE);
    setRelativeDates(null);
    setStatus("");
    resetPaging();
  };

  const handleRefresh = async () => {
    const { isError: failed } = await refetch();
    if (failed) toast.error("Couldn't refresh scheduler transactions. Please try again.");
    else toast.success("Scheduler transactions updated");
  };

  const isExecuted = view === "executed";
  const canDownload = isExecuted && !!mid && access(SCHEDULER_REPORT_PERMISSION);

  const columns = isExecuted
    ? buildExecutedColumns({
        onOpenSiTransactions: openSiTransactions,
        onOpenTransaction: openTransaction,
        onRetry: retry,
        retryingIds,
      })
    : buildProjectedColumns({ onOpenSiTransactions: openSiTransactions });

  const emptyCopy = isExecuted
    ? {
        title: "No scheduled debits ran in this window",
        description: "Try a wider date range, or clear the status filter.",
      }
    : {
        title: "Nothing scheduled in this window",
        description: "Upcoming Standing Instruction debits appear here with their amount and date.",
      };

  // A function so each surface mounts its own chip group: both are in the DOM
  // at once (CSS picks one), and a shared group would open the hidden twin's
  // popover too (see McaTransactionTable).
  const renderChips = (className: string) =>
    isExecuted ? (
      <FilterChipGroup className={className}>
        <DateRangeFilterChip
          chipKey="date"
          label="Date"
          value={dateRange ?? { from: "", to: "" }}
          max={today}
          onChange={(next) => {
            setDateRange(next.from && next.to ? next : null);
            resetPaging();
          }}
          relativeValue={relativeRange}
          onRelativeChange={(next) => {
            setRelativeRange(next);
            // "Last N …" resolved now (a handler, not render), as whole days:
            // the API takes dates, not times.
            const range = hasRelativeRange(next) ? relativeRangeToEpochMs(next) : null;
            setRelativeDates(
              range
                ? {
                    from: toIsoDate(new Date(range.startTime)),
                    to: toIsoDate(new Date(range.endTime)),
                  }
                : null
            );
            resetPaging();
          }}
          align="start"
        />
        <SingleSelectFilterChip
          chipKey="status"
          label="Status"
          options={SCHEDULER_STATUS_OPTIONS}
          value={status}
          onChange={(next) => {
            setStatus(next);
            resetPaging();
          }}
          showValueInLabel
        />
      </FilterChipGroup>
    ) : null;

  const refreshButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={<Icon name="refresh" className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />}
      onClick={() => void handleRefresh()}
      disabled={isFetching || !mid}
      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
    >
      Refresh
    </Button>
  );

  // Projected has no filters, so its one control rides the tab row rather
  // than sitting alone on a toolbar row beneath it.
  const tabBar = (
    <UnderlineTabs
      tabs={SCHEDULER_VIEW_TABS}
      value={view}
      onValueChange={changeView}
      actions={isExecuted ? undefined : refreshButton}
    />
  );

  const reportButton = isExecuted ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
      onClick={() =>
        download(
          buildSchedulerReportBody({
            from: activeRange.from,
            to: activeRange.to,
            status,
            pageLimit: SCHEDULER_PAGE_LIMIT,
          })
        )
      }
      isLoading={isDownloading}
      disabled={!canDownload}
      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
    >
      Report
    </Button>
  ) : null;

  const errorState = isError ? (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
        <Icon name="alert-circle" size={22} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Couldn&apos;t load scheduler transactions
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Something went wrong while fetching data.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void refetch()}>
        Retry
      </Button>
    </div>
  ) : undefined;

  const pagination = {
    mode: "cursor",
    page,
    pageSize: SCHEDULER_PAGE_LIMIT,
    hasNext: !!nextKey,
    onNext: () => {
      setCursors((keys) => [...keys.slice(0, page), nextKey]);
      setPage((p) => p + 1);
    },
    onPrev: () => setPage((p) => Math.max(1, p - 1)),
  } as const;

  const rowKey = (row: SchedulerTxn) => `${row.schedulerId}-${row.siId}-${row.scheduledTime}`;

  return (
    <>
      {/* One slot for the table and the expanded page to take turns in, so
          the hand-off lands the page exactly here. */}
      <div ref={slotRef}>
        {pageOpen && detailsRecord ? (
          <TransactionDetailsPage
            transaction={detailsRecord}
            onBack={back}
            onCollapse={collapse}
            backLabel="Back to Scheduler"
          />
        ) : (
          <>
            {/* Desktop (lg+). The Actions column is sticky, so its cells need opaque
          fills or the grid would show through as it scrolls under them: the
          header band (muted/35 over the card), a row, and a hovered row
          (muted/40). Written out in full, Tailwind reads classes literally. */}
            <DataTableCard<SchedulerTxn>
              className={cn(
                "hidden lg:block",
                "[&_th.scheduler-actions]:bg-[color-mix(in_srgb,var(--muted)_35%,var(--card))]",
                "[&_td.scheduler-actions]:bg-card",
                "[&_tr:hover_td.scheduler-actions]:bg-[color-mix(in_srgb,var(--muted)_40%,var(--card))]"
              )}
              tabs={tabBar}
              toolbar={
                isExecuted ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {renderChips("flex flex-wrap items-center gap-1.5")}
                    <div className="ml-auto flex items-center gap-2">
                      {refreshButton}
                      {reportButton}
                    </div>
                  </div>
                ) : undefined
              }
              columns={columns}
              data={rows}
              rowKey={rowKey}
              isLoading={isLoading}
              emptyTitle={emptyCopy.title}
              emptyDescription={emptyCopy.description}
              emptyState={
                <PlaceholderState
                  variant="empty-table"
                  title={emptyCopy.title}
                  description={emptyCopy.description}
                  className="py-16"
                />
              }
              errorState={errorState}
              pagination={pagination}
              tableLayout="content"
              maxBodyHeight="none"
            />

            {/* Tablet + mobile (below lg): the same page's rows as cards. */}
            <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
              <div className="border-b border-border px-4 pt-3">{tabBar}</div>
              {isExecuted && (
                <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {refreshButton}
                    {reportButton}
                  </div>
                  {renderChips(
                    "scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto"
                  )}
                </div>
              )}
              <DataCardList<SchedulerTxn>
                bordered={false}
                rows={rows}
                rowKey={rowKey}
                isLoading={isLoading}
                renderCard={(row) => (
                  <SchedulerCard
                    row={row}
                    view={view}
                    isRetrying={retryingIds.includes(row.schedulerId)}
                    onRetry={retry}
                    onOpenSiTransactions={openSiTransactions}
                    onOpenTransaction={openTransaction}
                  />
                )}
                renderSkeleton={() => <SchedulerCardSkeleton />}
                emptyState={
                  <PlaceholderState
                    variant="empty-table"
                    size="sm"
                    title={emptyCopy.title}
                    description={emptyCopy.description}
                  />
                }
                errorState={errorState}
                pagination={pagination}
              />
            </div>
          </>
        )}
      </div>

      <TransactionDetailsDrawer
        transaction={detailsRecord}
        open={drawerOpen}
        onOpenChange={onDrawerOpenChange}
        onExpand={expand}
        instant={instantDrawer}
      />
      {/* The drawer's and the page's real insides for the hand-off (inert,
          so the handlers never fire). */}
      {morphLayer((transaction) => ({
        drawer: (
          <TransactionDrawerBody transaction={transaction} onClose={() => {}} onExpand={() => {}} />
        ),
        page: (
          <TransactionDetailsPage
            transaction={transaction}
            onBack={() => {}}
            onCollapse={() => {}}
            backLabel="Back to Scheduler"
            decorative
          />
        ),
      }))}
    </>
  );
}
