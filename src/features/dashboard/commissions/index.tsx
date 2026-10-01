"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  ColumnManager,
  DataCardList,
  DataTableCard,
  PageHeader,
  type MonthRange,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  AmountFilterChip,
  FilterChipGroup,
  MonthRangeFilterChip,
  type AmountRangeValue,
} from "@/components/common/filters/FilterChips";
import { reorderColumns } from "@/lib/utils/columns";
import { buildCommissionColumns, formatPeriod } from "@/features/dashboard/commissions/columns";
import { CommissionCard } from "@/features/dashboard/commissions/components/CommissionCard";
import {
  CommissionHowItWorks,
  HOW_IT_WORKS_ID,
} from "@/features/dashboard/commissions/components/CommissionHowItWorks";
import { COMMISSION_CYCLES } from "@/features/dashboard/commissions/mock-data";
import type { CommissionCycle } from "@/features/dashboard/commissions/types";

/**
 * DESIGN MOCK: the partner Commissions page (Header's Partners tab), at
 * /commission, the same path pg-dashboard serves it on. Laid out exactly as
 * the Multi-Currency Accounts transactions table: tab bar (All / Processing /
 * Released), then search, the filter chips (Transaction period, Commission
 * amount), and Refresh, Columns and Download all on the right, over one
 * DataTableCard, with the card list below lg.
 *
 * Runs on fictional cycles (mock-data.ts), filtered client-side. Refresh,
 * the per-row Statement and Download all are UI only.
 * TODO(integration): swap in the partner commission and statement endpoints
 * once confirmed against pg-dashboard.
 */

const EMPTY_COPY = {
  title: "Your commissions will appear here",
  description:
    "Each month's commission cycle lands here with what your merchants processed, what you earned, and when it was paid out.",
};

const NO_MATCH_COPY = {
  title: "No commission cycles match",
  description: "Try a different tab, period or amount, or clear the search.",
};

const VIEW_TABS = [
  { value: "all", label: "All" },
  { value: "processing", label: "Processing" },
  { value: "released", label: "Released" },
] as const;
type ViewTab = (typeof VIEW_TABS)[number]["value"];

const SEARCH_WORDS = ["Transaction period", "Commission amount", "Transaction amount"];

/** Always shown: a cycle row means nothing without what it earned and where
 *  its payout stands. */
const FIXED_COLUMN_KEYS = ["commissionEarned", "status"];

const EMPTY_AMOUNT: AmountRangeValue = { min: "", max: "" };

const monthOf = (row: CommissionCycle) => row.periodStart.slice(0, 7);

/** The months the data spans, as the Transaction period chip's bounds and its
 *  default (everything). Rows are newest first. */
function dataMonthSpan(rows: CommissionCycle[]): MonthRange {
  const months = rows.map(monthOf).sort();
  return { start: months[0] ?? "", end: months[months.length - 1] ?? "" };
}

export function CommissionsFeature() {
  const rows = COMMISSION_CYCLES;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [tab, setTab] = useState<ViewTab>("all");
  const [search, setSearch] = useState("");
  const span = useMemo(() => dataMonthSpan(rows), [rows]);
  const monthsWithData = useMemo(() => new Set(rows.map(monthOf)), [rows]);
  const [period, setPeriod] = useState<MonthRange>(span);
  const [amount, setAmount] = useState<AmountRangeValue>(EMPTY_AMOUNT);

  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = amount.min.trim() ? Number(amount.min) : null;
    const max = amount.max.trim() ? Number(amount.max) : null;
    return rows.filter((row) => {
      if (tab === "processing" && row.status !== "PROCESSING") return false;
      if (tab === "released" && row.status !== "RELEASED") return false;
      const month = monthOf(row);
      if (month < period.start || month > period.end) return false;
      if (min !== null && row.commissionEarned < min) return false;
      if (max !== null && row.commissionEarned > max) return false;
      if (query) {
        const haystack = [
          formatPeriod(row),
          String(row.commissionEarned),
          String(row.transactionAmount),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [rows, tab, search, period, amount]);

  const isFiltered =
    tab !== "all" ||
    !!search.trim() ||
    period.start !== span.start ||
    period.end !== span.end ||
    !!amount.min ||
    !!amount.max;
  const emptyCopy = isFiltered ? NO_MATCH_COPY : EMPTY_COPY;

  function handleRefresh() {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Commissions updated");
    }, 600);
  }

  function handleDownloadStatement(row: CommissionCycle) {
    toast.message("Statement download isn't connected yet", {
      description: `Design preview: no statement was generated for ${row.periodStart.slice(0, 7)}.`,
    });
  }

  /** Every statement the current view has (a statement exists once a cycle's
   *  payout has been released), in one go. */
  function handleDownloadAll() {
    const count = filteredRows.filter((row) => row.status === "RELEASED").length;
    if (count === 0) {
      toast.message("No statements to download", {
        description: "Statements are ready once a cycle's payout is released.",
      });
      return;
    }
    toast.message("Bulk download isn't connected yet", {
      description: `Design preview: ${count} commission ${count === 1 ? "statement" : "statements"} would download.`,
    });
  }

  const baseColumns = buildCommissionColumns({ onDownloadStatement: handleDownloadStatement });
  const columns = reorderColumns(baseColumns, columnOrder).filter(
    (col) => !hiddenColumns.includes(col.key)
  );
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  const tabBar = (
    <UnderlineTabs tabs={VIEW_TABS} value={tab} onValueChange={(v) => setTab(v as ViewTab)} />
  );

  // A function, not a stored element: the desktop and narrow control rows are
  // both mounted (CSS picks one), and each needs its own FilterChipGroup so a
  // chip's popover never opens on its hidden twin.
  const renderFilterChips = () => (
    <FilterChipGroup className="flex flex-wrap items-center gap-1.5">
      <MonthRangeFilterChip
        chipKey="transaction-period"
        label="Transaction period"
        bounds={span}
        value={period}
        defaultRange={span}
        monthsWithData={monthsWithData}
        onChange={setPeriod}
      />
      <AmountFilterChip label="Commission amount" value={amount} onChange={setAmount} />
    </FilterChipGroup>
  );

  const refreshButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={
        <Icon name="refresh" className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
      }
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
    >
      Refresh
    </Button>
  );

  const downloadAllButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
      onClick={handleDownloadAll}
      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
    >
      Download all
    </Button>
  );

  const renderSearch = (className: string) => (
    <RotatingSearchInput
      value={search}
      onSearch={setSearch}
      words={SEARCH_WORDS}
      className={className}
    />
  );

  // Desktop (lg+): search, chips, then the actions pushed right.
  const desktopControls = (
    <div className="flex flex-wrap items-center gap-2">
      {renderSearch("w-40 sm:w-56")}
      {renderFilterChips()}
      <div className="ml-auto flex items-center gap-2">
        {refreshButton}
        <ColumnManager
          columns={reorderableColumns}
          order={currentColumnOrder}
          onOrderChange={setColumnOrder}
          onReset={() => {
            setColumnOrder(null);
            setHiddenColumns([]);
          }}
          hiddenKeys={hiddenColumns}
          onHiddenKeysChange={setHiddenColumns}
          fixedKeys={FIXED_COLUMN_KEYS}
          fixedReason="Always shown. A commission row is unreadable without these columns."
        />
        {downloadAllButton}
      </div>
    </div>
  );

  const emptyPanel = (
    <PlaceholderState
      variant="no-transactions"
      title={emptyCopy.title}
      description={emptyCopy.description}
      className="py-16"
    />
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <div>
        <PageHeader
          title="Commissions"
          subtitle="View commissions earned from eligible transactions, track their processing status, and download statements for released payouts."
          actions={
            // Help, so an outline button like the other header actions on the
            // app (Settlement calendar, Check transaction status), not a
            // primary CTA. Toggles the panel below.
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={showHowItWorks}
              aria-controls={HOW_IT_WORKS_ID}
              onClick={() => setShowHowItWorks((open) => !open)}
              leftIcon={<Icon name="info" className="h-3.5 w-3.5" aria-hidden />}
              className={cn(showHowItWorks && "bg-muted")}
            >
              How commissions work
            </Button>
          }
        />
      </div>

      {/* The table, with "How commissions work" as a vertical column on
          its right from xl (sticky, so it stays beside the rows as they
          scroll), or above it on narrower screens. Closed, the table has the
          full width, exactly as before. */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <DataTableCard<CommissionCycle>
            className="hidden lg:block"
            tabs={tabBar}
            toolbar={desktopControls}
            columns={columns}
            data={filteredRows}
            isLoading={false}
            rowKey={(row) => row.id}
            emptyTitle={emptyCopy.title}
            emptyDescription={emptyCopy.description}
            emptyState={emptyPanel}
            maxBodyHeight="none"
          />

          {/* Below lg: the same tabs and controls over the card list. No Columns:
              there are no columns to arrange. */}
          <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
            <div className="border-b border-border px-4 pt-2">{tabBar}</div>
            <div className="space-y-2 border-b border-border px-4 py-3">
              {/* Search on its own full-width row: squeezed beside the two
                  buttons, its rotating placeholder ran under Refresh. */}
              {renderSearch("w-full")}
              <div className="flex flex-wrap items-center gap-2">
                {renderFilterChips()}
                <div className="ml-auto flex items-center gap-2">
                  {refreshButton}
                  {downloadAllButton}
                </div>
              </div>
            </div>
            <DataCardList<CommissionCycle>
              bordered={false}
              rows={filteredRows}
              rowKey={(row) => row.id}
              isLoading={false}
              renderCard={(row) => (
                <CommissionCard row={row} onDownloadStatement={handleDownloadStatement} />
              )}
              emptyState={
                <PlaceholderState
                  variant="no-transactions"
                  size="sm"
                  title={emptyCopy.title}
                  description={emptyCopy.description}
                />
              }
            />
          </div>
        </div>
        <CommissionHowItWorks
          open={showHowItWorks}
          onClose={() => setShowHowItWorks(false)}
          className="order-first xl:sticky xl:top-4 xl:order-none xl:w-[22rem] xl:shrink-0"
        />
      </div>
    </div>
  );
}
