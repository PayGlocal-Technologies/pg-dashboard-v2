"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Button, ColumnManager, DataTableCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { FilterChipGroup } from "@/components/common/filters/FilterChips";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import {
  DrawerExpandMorph,
  drawerRect,
  elementRect,
  type DrawerMorph,
} from "@/components/common/DrawerExpandMorph";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import {
  DisputeDetailView,
  DisputeFlowDialogs,
  useDisputeDetailModel,
} from "@/features/dashboard/pa-transactions/components/DisputeDetailFeature";
import { PA_DRAWER_WIDTH_PX } from "@/features/dashboard/pa-transactions/components/TransactionDetailsDrawer";
import {
  DisputeDetailsDrawer,
  DisputeDrawerBody,
} from "@/features/dashboard/dispute-management/components/DisputeDetailsDrawer";
import { useDisputeResolutions } from "@/stores/useDisputeResolutions";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";
import {
  TransactionAmountFilter,
  type AmountRangeValue,
} from "@/features/dashboard/pa-transactions/components/TransactionAmountFilter";
import {
  TransactionDateTimeFilter,
  type TransactionDateTimeValue,
} from "@/features/dashboard/pa-transactions/components/TransactionDateTimeFilter";
import {
  buildDisputeColumns,
  DISPUTE_COLUMN_DEFS,
  DISPUTE_COLUMN_ORDER,
} from "@/features/dashboard/dispute-management/columns";
import { DisputeReasonFilter } from "@/features/dashboard/dispute-management/components/DisputeReasonFilter";
import { DisputeStatCards } from "@/features/dashboard/dispute-management/components/DisputeStatCards";
import { MOCK_DISPUTE_ROWS } from "@/features/dashboard/dispute-management/mockRows";
import {
  DISPUTE_SEGMENT_RAW_STATUSES,
  DISPUTE_STATUS_FILTERS,
  DISPUTE_STATUS_SEGMENTS,
  DISPUTE_TIMEFRAMES,
  RESPOND_BY_SEGMENTS,
  type DisputeStatusSegment,
  type DisputeTimeframe,
} from "@/features/dashboard/dispute-management/constants";
import type { DisputeRow } from "@/features/dashboard/dispute-management/types";
import { getDisputeReasonMeta } from "@/features/dashboard/pa-transactions/disputeReasonMeta";

/** Chip options for the table's own multi-select "Status" filter, distinct
 * from the single-select SegmentedTabs above it: this lets a merchant view,
 * say, Won and Lost together. Reuses DISPUTE_STATUS_SEGMENTS/
 * DISPUTE_SEGMENT_RAW_STATUSES as the one source of truth for the label <->
 * raw-status mapping (e.g. "Action required" covers both DISPUTED and
 * NEEDS_ACTION) instead of a second copy of that vocabulary, "All disputes"
 * excluded since it isn't a real status to filter by. */
const STATUS_FILTER_OPTIONS = DISPUTE_STATUS_FILTERS.map(({ value, label }) => ({ value, label }));

/** "08/08/2026, 10:22:15" -> epoch ms, same shape as PaTransaction's
 * formattedCreationDateTime, this feature's mock rows generate it the
 * same way (see PaTransactionTable's own copy of this helper). */
function parseFormattedDate(value?: string): number | undefined {
  if (!value) return undefined;
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  if (!datePart) return undefined;
  const [day, month, year] = datePart.split("/").map(Number);
  if (!day || !month || !year) return undefined;
  const [hours, minutes, seconds] = (timePart ?? "00:00:00").split(":").map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0).getTime();
}

/** Hands a dispute row off to the transaction detail store/page (see
 * useTransactionDetail's TODO(integration)), reusing the full dispute
 * workflow already built for disputed PA transactions instead of building a
 * second detail view just for this table. Populates `disputes[]` with this
 * row's OWN reason/amount/dates rather than leaving it for
 * deriveTransactionDetail's generic status-keyed fallback to guess, that
 * fallback exists for real API data with no structured dispute of its own,
 * not for dispute-management rows, which already have one. */
const PAGE_SIZE = 8;

export function toPaTransaction(row: DisputeRow): PaTransaction {
  const reasonMeta = getDisputeReasonMeta(row.reason);
  return {
    gid: row.txnGid,
    externalStatus: row.status,
    maskedCardNumber: row.maskedCardNumber,
    txnCurrency: row.currency,
    totalAmount: String(row.amount),
    cardBrand: row.cardBrand,
    paymentInstrument: row.paymentInstrument,
    encEmailId: row.email,
    formattedCreationDateTime: row.disputedOn,
    firstName: row.customerName.split(" ")[0],
    lastName: row.customerName.split(" ").slice(1).join(" "),
    disputes: [
      {
        id: row.disputeId,
        transactionId: row.txnGid,
        amount: row.amount,
        currency: row.currency,
        reason: row.reason,
        reasonCode: reasonMeta.reasonCode,
        description: reasonMeta.description,
        status: row.status,
        raisedOn: row.disputedOn,
        respondBy: row.respondBy,
        documents: row.documents,
        // The list's escalation round, so the detail page offers that
        // stage's own choices (see status/disputeStages.ts).
        disputePhase: row.disputePhase === "DISPUTE" ? "CHARGEBACK" : row.disputePhase,
        reviewPhase: row.reviewPhase,
        withdrawalFeeApplies: row.withdrawalFeeApplies,
        withdrawn: row.resolution === "WITHDRAWN",
        appliedFee: row.appliedFee,
        resolvedOn:
          row.status === "CLEARED" ||
          row.status === "CHARGED_BACK" ||
          row.status === "ACCEPTED" ||
          row.status === "EXPIRED"
            ? row.disputedOn
            : undefined,
      },
    ],
  };
}

const RECOVERED_TREND = [
  { x: "Jan", y: 1200 },
  { x: "Feb", y: 1450 },
  { x: "Mar", y: 1800 },
  { x: "Apr", y: 2100 },
];

// Sets scrollTop via a standalone function since the element comes from
// useContentAreaElement, and React Compiler's lint forbids mutating a
// hook-returned value directly (as on PA Transactions).
function setScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}

export function DisputeManagementFeature() {
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  const resolutionByGid = useDisputeResolutions((s) => s.resolutionByGid);

  // Reflects any in-session "accept in full" resolutions (see
  // useDisputeResolutions/TransactionDetailFeature) so a dispute shows as
  // Lost here too after being resolved from its detail page.
  const rows = useMemo(() => {
    return MOCK_DISPUTE_ROWS.map((row) => {
      const override = resolutionByGid[row.txnGid];
      return override ? { ...row, status: override } : row;
    });
  }, [resolutionByGid]);

  const [search, setSearch] = useState("");
  const [statusSegment, setStatusSegment] = useState<DisputeStatusSegment>("action-required");
  const [statusFilter, setStatusFilter] = useState<string[] | undefined>(undefined);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [amountRange, setAmountRange] = useState<AmountRangeValue | undefined>(undefined);
  const [disputedDate, setDisputedDate] = useState<TransactionDateTimeValue | undefined>(undefined);
  const [columnOrder, setColumnOrder] = useState<string[]>(DISPUTE_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  // The table's page, tied to the filters it was chosen under: any change to
  // the tab, search or a filter goes back to page 1 (derived, not reset in an
  // effect), so a later page can't be left showing an empty list.
  const filterKey = JSON.stringify([
    statusSegment,
    search,
    statusFilter,
    reason,
    amountRange,
    disputedDate,
  ]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });

  // Drives only the metrics cards below, the table keeps its own separate
  // "Disputed Date" filter chip, same split as the Transactions page's
  // timeframe tabs (stat cards) vs. its table's date filter.
  const [metricsTimeframe, setMetricsTimeframe] = useState<DisputeTimeframe>("ytd");
  // Captured once on mount (see CLAUDE.md's no-Date.now()-during-render
  // rule), every timeframe boundary below is derived from this fixed point,
  // not a fresh "now" on every render.
  const [nowMs] = useState(() => Date.now());

  const metricsStartMs = useMemo(() => {
    const start = new Date(nowMs);
    if (metricsTimeframe === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (metricsTimeframe === "1w") {
      start.setDate(start.getDate() - 7);
    } else if (metricsTimeframe === "1m") {
      start.setMonth(start.getMonth() - 1);
    } else if (metricsTimeframe === "3m") {
      start.setMonth(start.getMonth() - 3);
    } else {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    return start.getTime();
  }, [nowMs, metricsTimeframe]);

  const metricsRows = useMemo(() => {
    return rows.filter((row) => {
      const ts = parseFormattedDate(row.disputedOn);
      return ts != null && ts >= metricsStartMs && ts <= nowMs;
    });
  }, [rows, metricsStartMs, nowMs]);

  const reasonBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of metricsRows) {
      counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
    }
    const total = metricsRows.length;
    if (total === 0) return [];
    return Array.from(counts.entries())
      .map(([reasonLabel, count]) => ({
        reason: reasonLabel,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [metricsRows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (
        statusSegment !== "all" &&
        !DISPUTE_SEGMENT_RAW_STATUSES[statusSegment].includes(row.status)
      ) {
        return false;
      }
      if (
        statusFilter &&
        statusFilter.length > 0 &&
        !statusFilter.some((value) =>
          DISPUTE_STATUS_FILTERS.find((f) => f.value === value)?.raw.includes(row.status)
        )
      ) {
        return false;
      }
      if (reason && row.reason !== reason) return false;
      if (amountRange) {
        if (amountRange.min != null && row.amount < amountRange.min) return false;
        if (amountRange.max != null && row.amount > amountRange.max) return false;
      }
      if (disputedDate) {
        const ts = parseFormattedDate(row.disputedOn);
        if (ts == null) return false;
        if (disputedDate.startTime != null && ts < disputedDate.startTime) return false;
        if (disputedDate.endTime != null && ts > disputedDate.endTime) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const matches =
          row.customerName.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.disputeId.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [rows, statusSegment, statusFilter, reason, amountRange, disputedDate, search]);

  const hasActive =
    !!statusFilter?.length || !!reason || !!amountRange || !!disputedDate || search !== "";

  const onClear = () => {
    setStatusFilter(undefined);
    setReason(undefined);
    setAmountRange(undefined);
    setDisputedDate(undefined);
    setSearch("");
  };

  const onToggleColumn = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const onResetColumns = () => {
    setColumnOrder(DISPUTE_COLUMN_ORDER);
    setHiddenColumns(new Set());
  };

  // Details, the Transactions flow: a row opens the drawer (collapsed view);
  // Expand hands the same dispute to a full page in place of the list
  // (expanded view); Collapse and Back return. The row's transaction goes to
  // the transaction store first, which the detail model reads (and the
  // dispute flow writes its updates to).
  const contentEl = useContentAreaElement();
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<{ txnGid: string; disputeId: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);
  // The drawer <-> page hand-off in flight, if any (see DrawerExpandMorph).
  const [morph, setMorph] = useState<DrawerMorph | null>(null);
  // The drawer skips its own slide while the hand-off covers it.
  const [instantDrawer, setInstantDrawer] = useState(false);
  // The slot the list and the page take turns in: where the page lays out.
  const slotRef = useRef<HTMLDivElement>(null);
  // Where the list was scrolled when it left the screen, for Back/Collapse.
  const [scrollPosition, setScrollPosition] = useState(0);

  const { transaction, dispute, flow } = useDisputeDetailModel({
    transactionId: selected?.txnGid ?? "",
    disputeId: selected?.disputeId ?? "",
    // The evidence form needs the page's room: opening it from the drawer
    // (Contest, or Accept partially) expands first.
    onOpenForm: () => {
      if (!pageOpen) expandToPage();
    },
  });

  function onViewDetails(row: DisputeRow) {
    setStoredTransaction(toPaTransaction(row));
    setSelected({ txnGid: row.txnGid, disputeId: row.disputeId });
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

  // Expand: the drawer opens out into the page, revealing it in place; the
  // real page swaps in under the moving layer as it lands.
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
      // Where the page lays out once scrolled to the top.
      page: {
        top: slot.top + (contentEl ? contentEl.scrollTop : window.scrollY),
        left: slot.left,
        width: slot.width,
      },
    });
    setDrawerOpen(false);
  }

  // Collapse: the reverse, closing down into the drawer as it reopens.
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
  }

  // Puts the list back where it was once it has re-rendered in the page's
  // place: an effect, so it runs after the rows are back in the DOM.
  useEffect(() => {
    if (!pageOpen && contentEl) setScrollTop(contentEl, scrollPosition);
  }, [pageOpen, contentEl, scrollPosition]);

  const showRespondBy = RESPOND_BY_SEGMENTS.includes(statusSegment);
  const columns = buildDisputeColumns({ columnOrder, hiddenColumns, showRespondBy, nowMs });

  // Soonest deadline first whenever "Respond by" is showing (status-
  // vocabulary spec §27's "sorted ascending by default"), a row with no
  // deadline sorts after every row that has one rather than to the top.
  const sortedRows = useMemo(() => {
    if (!showRespondBy) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aTs = parseFormattedDate(a.respondBy) ?? Number.POSITIVE_INFINITY;
      const bTs = parseFormattedDate(b.respondBy) ?? Number.POSITIVE_INFINITY;
      return aTs - bTs;
    });
  }, [filteredRows, showRespondBy]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const page = Math.min(pageState.key === filterKey ? pageState.page : 1, pageCount);
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    // Full-bleed background matching the cards below, rather than the app
    // shell's default grey (see (dashboard)/layout.tsx), same treatment as
    // the Transactions page.
    <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
      {/* One stable slot the list and the expanded page take turns in, so
          swapping them under the hand-off layer never remounts it. */}
      <div ref={slotRef} className="mx-auto max-w-[1400px]">
        {pageOpen && transaction && dispute ? (
          <div className="[&_.shadow-sm]:shadow-none">
            <DisputeDetailView
              transaction={transaction}
              dispute={dispute}
              flow={flow}
              layout="page"
              backLabel="Back to Dispute Management"
              onBack={backToList}
              onCollapse={collapseToDrawer}
            />
          </div>
        ) : (
          <div className="page-enter space-y-4">
            <PageHeader
              title="Dispute Management"
              subtitle="Track, respond to and resolve payment disputes"
            />

            {/* Same "section title + period control" header, then the card grid
             * beneath it, as the Transactions page's own Metrics section. */}
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
                disputes={metricsRows}
                recoveredLabel="₹2.1K"
                recoveredTrendPct={19}
                recoveredTrend={RECOVERED_TREND}
                reasonBreakdown={reasonBreakdown}
              />
            </div>

            <DataTableCard<DisputeRow>
              // Flat table: no lift on the card itself or on the buttons and chips
              // inside it. The metrics cards above keep flux's default shadow.
              className="shadow-none [&_.shadow-sm]:shadow-none"
              tabs={
                <SegmentedTabs
                  options={DISPUTE_STATUS_SEGMENTS}
                  value={statusSegment}
                  onChange={(v) => setStatusSegment(v as DisputeStatusSegment)}
                />
              }
              toolbar={
                <div className="flex flex-wrap items-center gap-2.5">
                  <RotatingSearchInput
                    value={search}
                    onSearch={setSearch}
                    words={["customer name, email or dispute ID"]}
                    className="min-w-40 max-w-xs flex-1"
                  />

                  <div className="hidden sm:block h-4 w-px bg-border" />

                  {/* One group for the row, so clicking from one open chip to the
                  next closes the first and leaves the second open. Without it
                  each chip holds its own state and the outgoing one's focus
                  restore dismisses the incoming one. */}
                  <FilterChipGroup className="flex items-center gap-2 flex-wrap">
                    <MultiSelectChipFilter
                      value={statusFilter}
                      options={STATUS_FILTER_OPTIONS}
                      onChange={setStatusFilter}
                      placeholder="Status"
                    />
                    <DisputeReasonFilter value={reason} onChange={setReason} />
                    <TransactionAmountFilter value={amountRange} onChange={setAmountRange} />
                    <TransactionDateTimeFilter
                      value={disputedDate}
                      onChange={setDisputedDate}
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
                    <ColumnManager
                      columns={DISPUTE_COLUMN_DEFS}
                      order={columnOrder}
                      onOrderChange={setColumnOrder}
                      hiddenKeys={[...hiddenColumns]}
                      onHiddenKeysChange={(next) => setHiddenColumns(new Set(next))}
                      onReset={onResetColumns}
                    />
                  </div>
                </div>
              }
              columns={columns}
              data={pageRows}
              // A search or filter that matches nothing says so, rather than
              // claiming the merchant has never had a dispute.
              emptyTitle={hasActive ? "No disputes match these filters" : "No disputes yet"}
              emptyDescription={
                hasActive
                  ? "Try a wider date range, or clear a filter to see more."
                  : "Disputed payments will appear here as they come in."
              }
              rowKey={(row) => row.disputeId}
              pagination={{
                mode: "page",
                page,
                pageSize: PAGE_SIZE,
                total: sortedRows.length,
                onPageChange: (next) => setPageState({ key: filterKey, page: next }),
              }}
              // The whole row opens the dispute; clicks on the row's own
              // buttons are skipped by DataTable, so View details does only its
              // own job.
              onRowClick={onViewDetails}
              rowAction={(row) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(row)}
                  rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
                  className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
                >
                  View details
                </Button>
              )}
              maxBodyHeight="none"
            />
          </div>
        )}
      </div>

      <DisputeDetailsDrawer
        transaction={transaction}
        dispute={dispute}
        flow={flow}
        open={drawerOpen}
        onOpenChange={onDrawerOpenChange}
        onExpand={expandToPage}
        instant={instantDrawer}
      />
      {transaction && dispute && (
        <DisputeFlowDialogs dispute={dispute} transaction={transaction} flow={flow} />
      )}
      {morph && transaction && dispute && (
        <DrawerExpandMorph
          key={morph.kind}
          morph={morph}
          drawerWidthPx={PA_DRAWER_WIDTH_PX}
          // The drawer's and the page's real insides; the layer is inert,
          // so their handlers never fire.
          drawerContent={
            <DisputeDrawerBody transaction={transaction} dispute={dispute} flow={flow} />
          }
          pageContent={
            <div className="[&_.shadow-sm]:shadow-none">
              <DisputeDetailView
                transaction={transaction}
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
    </div>
  );
}
