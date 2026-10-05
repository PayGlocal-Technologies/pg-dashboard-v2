"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button, ColumnManager, DataCardList, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import {
  DateFilterChip,
  EMPTY_RELATIVE_RANGE,
  FilterChipGroup,
  StatusFilterChip,
  hasRelativeRange,
  relativeRangeToEpochMs,
  toEndOfDayMs,
  toStartOfDayMs,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import { cn } from "@/lib/utils";
import { usePost } from "@/lib/api/hooks";
import { reorderColumns } from "@/lib/utils/columns";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import useNewPermissions from "@/hooks/useNewPermissions";
import { useApp } from "@/stores/useApp";
import { paTxnSearchApi } from "@/features/dashboard/pa-transactions/services";
import { TransactionDetailsDrawer } from "@/features/dashboard/pa-transactions/components/TransactionDetailsDrawer";
import type {
  PaTransaction,
  PaTransactionsResponse,
} from "@/features/dashboard/pa-transactions/types";
import type { TableReqBody } from "@/types/transactions";
import { buildMandateColumns } from "@/features/dashboard/manage-mandates/columns";
import {
  MANDATES_PAGE_LIMIT,
  MANDATE_FIXED_COLUMNS,
  MANDATE_PERMISSIONS,
  MANDATE_SEARCH_HINTS,
  MANDATE_STATUS_FILTERS,
} from "@/features/dashboard/manage-mandates/constants";
import {
  buildMandateListBody,
  buildMandateReportBody,
  getMandateActions,
} from "@/features/dashboard/manage-mandates/helpers";
import {
  useMandateListMids,
  useMandateReport,
  useMandateScopeMid,
  useMandates,
  useSchedulerEnabled,
} from "@/features/dashboard/manage-mandates/hooks";
import { MandateRowActions } from "@/features/dashboard/manage-mandates/components/MandateRowActions";
import {
  MandateCard,
  MandateCardSkeleton,
} from "@/features/dashboard/manage-mandates/components/MandateCard";
import { PauseMandateDialog } from "@/features/dashboard/manage-mandates/components/PauseMandateDialog";
import { ActivateMandateDialog } from "@/features/dashboard/manage-mandates/components/ActivateMandateDialog";
import { DisableMandateDialog } from "@/features/dashboard/manage-mandates/components/DisableMandateDialog";
import { MandateHistoryDrawer } from "@/features/dashboard/manage-mandates/components/MandateHistoryDrawer";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

/**
 * The mandates table, pg-dashboard's ManageMandatesTable on this app's table
 * layout (as PA and MCA Transactions): search with Date and Status chips, then
 * Refresh, Columns and Report on the right, the grid from `lg` and cards below.
 *
 * Every filter is server-side (`/search/mandate`, see buildMandateListBody),
 * across the MIDs useMandateListMids resolves. Row actions follow
 * pg-dashboard's rules (getMandateActions); Pause and Activate verify with a
 * one-time code first.
 */
export function ManageMandatesTable() {
  const access = useNewPermissions();
  const isGuestUser = useApp((s) => s.isGuestUser);
  const mids = useMandateListMids();
  const scopeMid = useMandateScopeMid();
  const schedulerEnabled = useSchedulerEnabled(scopeMid, mids.length > 0);

  // Seeded from ?q= so the header's global search can hand an id straight to
  // this table. Read once on mount.
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  // Mutually exclusive with dateRange, as on the Transactions tables; resolved
  // to epoch ms when picked, never during render.
  const [relativeRange, setRelativeRange] = useState<RelativeRangeValue>(EMPTY_RELATIVE_RANGE);
  const [relativeWindow, setRelativeWindow] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  // Every pg-dashboard column shows by default; the Columns picker is the
  // merchant's own way to narrow the grid.
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const [pauseRow, setPauseRow] = useState<Mandate | null>(null);
  const [activateRow, setActivateRow] = useState<Mandate | null>(null);
  const [disableRow, setDisableRow] = useState<Mandate | null>(null);
  const [historyRow, setHistoryRow] = useState<Mandate | null>(null);
  const [initiateTxn, setInitiateTxn] = useState<PaTransaction | null>(null);
  const [initiateTxnOpen, setInitiateTxnOpen] = useState(false);

  const startTime =
    relativeWindow?.startTime ?? (dateRange.from ? toStartOfDayMs(dateRange.from) : undefined);
  const endTime =
    relativeWindow?.endTime ?? (dateRange.to ? toEndOfDayMs(dateRange.to) : undefined);

  const body = buildMandateListBody({
    mids,
    statuses,
    search,
    startTime,
    endTime,
    pageLimit: MANDATES_PAGE_LIMIT,
    from: (page - 1) * MANDATES_PAGE_LIMIT,
  });
  const { rows, totalCount, isLoading, isFetching, isError, refetch } = useMandates(body);
  const { download, isDownloading } = useMandateReport(scopeMid);

  // The initiating payment: looked up by its GID with the PA search, under the
  // mandate's MID, then shown in the PA details drawer (pg-dashboard's
  // PaTransactionDetails by mid + gid).
  const { urlMid } = useResolvedMids("PA");
  const { mutate: lookupTransaction } = usePost<PaTransactionsResponse, TableReqBody>(
    paTxnSearchApi(urlMid),
    { invalidateQueries: false }
  );
  const openInitiateTransaction = (row: Mandate) =>
    lookupTransaction(
      buildTxnRequestBody(
        {},
        {
          searchQuery: row.initiateGid,
          selectedMid: { key: "merchantId", value: [row.mid] },
          pageLimit: 9,
          from: 0,
        }
      ),
      {
        onSuccess: (res) => {
          const match = res?.data?.data?.find((txn) => txn.gid === row.initiateGid);
          if (!match) {
            toast.error("Couldn't find this transaction");
            return;
          }
          setInitiateTxn(match);
          setInitiateTxnOpen(true);
        },
        onError: (error) => toast.error(error.message || "Couldn't load this transaction"),
      }
    );

  // An SI's payments: pg-dashboard's PA transactions table searched by the SI
  // ID. Here that is the Transactions page itself, which takes its search from
  // ?q= (the hand-off global search uses), across the merchant's PA MIDs.
  const openSiTransactions = (row: Mandate) =>
    router.push(`/pa-transactions?q=${encodeURIComponent(row.siId)}`);

  const hasNarrowingFilters =
    !!search.trim() ||
    statuses.length > 0 ||
    !!dateRange.from ||
    !!dateRange.to ||
    relativeWindow !== null;

  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No matching mandates",
        description: "Try a different search, or clear a filter to widen the results.",
      }
    : {
        title: "No mandates yet",
        description:
          "When a customer sets up a recurring payment, its mandate appears here with its schedule and status.",
      };

  const handleRefresh = async () => {
    const { isError: failed } = await refetch();
    if (failed) toast.error("Couldn't refresh mandates. Please try again.");
    else toast.success("Mandates updated");
  };

  const canDownload = !isGuestUser && !!scopeMid && access(MANDATE_PERMISSIONS.report);

  const renderActions = (row: Mandate) => (
    <MandateRowActions
      row={row}
      available={getMandateActions(row, access, schedulerEnabled)}
      onPause={setPauseRow}
      onActivate={setActivateRow}
      onDisable={setDisableRow}
      onViewHistory={setHistoryRow}
    />
  );

  const baseColumns = buildMandateColumns({
    onOpenSiTransactions: openSiTransactions,
    onOpenInitiateTransaction: openInitiateTransaction,
    renderActions,
  });
  const columns = reorderColumns(baseColumns, columnOrder).filter(
    (col) => !hiddenColumns.includes(col.key)
  );
  // Actions holds the row's controls, not data: never offered to reorder or hide.
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));

  // Written as a function so each surface mounts its own chip group: both are
  // in the DOM at once (CSS picks one), and a shared group would open the
  // hidden twin's popover too (see McaTransactionTable).
  const renderChips = (className: string) => (
    <FilterChipGroup className={className}>
      <DateFilterChip
        value={dateRange}
        onChange={(next) => {
          setDateRange(next);
          setRelativeRange(EMPTY_RELATIVE_RANGE);
          setRelativeWindow(null);
          setPage(1);
        }}
        relativeValue={relativeRange}
        onRelativeChange={(next) => {
          setRelativeRange(next);
          setRelativeWindow(hasRelativeRange(next) ? relativeRangeToEpochMs(next) : null);
          setPage(1);
        }}
      />
      <StatusFilterChip
        options={MANDATE_STATUS_FILTERS}
        selected={statuses}
        onChange={(next) => {
          setStatuses(next);
          setPage(1);
        }}
      />
    </FilterChipGroup>
  );

  const searchInput = (className: string) => (
    <RotatingSearchInput
      value={search}
      onSearch={(value) => {
        setSearch(value);
        setPage(1);
      }}
      words={MANDATE_SEARCH_HINTS}
      className={className}
    />
  );

  const reportButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
      onClick={() => download(buildMandateReportBody(startTime, endTime))}
      isLoading={isDownloading}
      disabled={!canDownload}
      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
    >
      Report
    </Button>
  );

  const desktopControls = (
    <div className="flex flex-wrap items-center gap-2">
      {searchInput("w-40 sm:w-56")}
      {renderChips("flex flex-wrap items-center gap-1.5")}
      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={
            <Icon name="refresh" className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          }
          onClick={() => void handleRefresh()}
          disabled={isFetching || !body}
          className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
        >
          Refresh
        </Button>
        <ColumnManager
          columns={reorderableColumns}
          order={columnOrder ?? reorderableColumns.map((c) => c.key)}
          onOrderChange={setColumnOrder}
          onReset={() => {
            setColumnOrder(null);
            setHiddenColumns([]);
          }}
          hiddenKeys={hiddenColumns}
          onHiddenKeysChange={setHiddenColumns}
          fixedKeys={MANDATE_FIXED_COLUMNS}
          fixedReason="Always shown. A mandate row is unreadable without these columns."
        />
        {reportButton}
      </div>
    </div>
  );

  const errorState = isError ? (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
        <Icon name="alert-circle" size={22} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load mandates</h3>
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
    mode: "page",
    page,
    pageSize: MANDATES_PAGE_LIMIT,
    total: totalCount,
    onPageChange: setPage,
  } as const;

  return (
    <>
      {/* Desktop (lg+). The Actions column is sticky (see buildMandateColumns),
          so its cells need opaque fills or the grid would show through as it
          scrolls under them. Each is the colour the row already has there,
          made solid: the header band (muted/35 over the card), a row, and a
          hovered row (muted/40). */}
      <DataTableCard<Mandate>
        // Written out in full: Tailwind only generates classes it can read
        // literally, so the cell marker can't be interpolated here.
        className={cn(
          "hidden lg:block",
          "[&_th.mandate-actions]:bg-[color-mix(in_srgb,var(--muted)_35%,var(--card))]",
          "[&_td.mandate-actions]:bg-card",
          "[&_tr:hover_td.mandate-actions]:bg-[color-mix(in_srgb,var(--muted)_40%,var(--card))]"
        )}
        toolbar={desktopControls}
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
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
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          <div className="flex flex-nowrap items-center gap-2">
            {searchInput("min-w-0 flex-1")}
            {reportButton}
          </div>
          {renderChips("scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto")}
        </div>
        <DataCardList<Mandate>
          bordered={false}
          rows={rows}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          renderCard={(row) => (
            <MandateCard
              row={row}
              actions={renderActions(row)}
              onOpenSiTransactions={openSiTransactions}
              onOpenInitiateTransaction={openInitiateTransaction}
            />
          )}
          renderSkeleton={() => <MandateCardSkeleton />}
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

      <PauseMandateDialog row={pauseRow} onOpenChange={(open) => !open && setPauseRow(null)} />
      <ActivateMandateDialog
        row={activateRow}
        onOpenChange={(open) => !open && setActivateRow(null)}
      />
      <DisableMandateDialog
        row={disableRow}
        onOpenChange={(open) => !open && setDisableRow(null)}
      />
      <MandateHistoryDrawer
        row={historyRow}
        onOpenChange={(open) => !open && setHistoryRow(null)}
      />
      <TransactionDetailsDrawer
        transaction={initiateTxn}
        open={initiateTxnOpen}
        onOpenChange={setInitiateTxnOpen}
      />
    </>
  );
}
