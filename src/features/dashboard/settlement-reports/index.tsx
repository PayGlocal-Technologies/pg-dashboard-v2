"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useProductContext } from "@/stores/useProductContext";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { TRANSACTIONS_PAGE_LIMIT } from "@/features/dashboard/pa-transactions/constants";
import { usePostQuery } from "@/lib/api/hooks";
import { Button, Card, DataTable, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { TransactionColumnsMenu } from "@/features/dashboard/pa-transactions/components/TransactionColumnsMenu";
import { formatDayMonth, formatWeekdayDate, formatWeekdayName } from "@/features/dashboard/settlement-reports/calendarUtils";
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
import type { McaTransaction, McaTransactionsResponse } from "@/features/dashboard/mca-transactions/types";
import type { TableReqBody } from "@/types/transactions";
import { mcaTxnSearchApi } from "@/features/dashboard/mca-transactions/services";

// TODO(integration): this screen is mock data only (see mock-data.ts). Wire it
// up to the real settlement endpoints per the CLAUDE.md migration checklist
// before shipping, endpoint URL, request payload and response statuses must
// all be copied from pg-dashboard's settlement-report feature, not guessed.
// Loading/empty/error UI should come from the real query hook's isPending /
// isError / data at that point (see PaTransactionTable for the pattern).

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

const SETTLEMENT_STATUS_SEGMENTS = [
  { value: "All", label: "All" },
  { value: "settled", label: "Settled" },
  { value: "processing", label: "Processing" },
] as const;

// MCA settlements move through an extra forex-conversion step Payments
// doesn't have, see the SettlementStatus doc comment in types.ts.
const MCA_SETTLEMENT_STATUS_SEGMENTS = [
  { value: "All", label: "All" },
  { value: "sent_for_settlement", label: "Sent for Settlement" },
  { value: "mca_settled", label: "Settled" },
  { value: "firc", label: "FIRC" },
] as const;

export function SettlementReportsFeature() {
  const router = useRouter();

  // Which product (Payments / Multi-Currency Accounts) this shared screen is
  // currently scoped to, set by the Header's top-level tabs, see
  // useProductContext.ts. Everything below picks its dataset off this.
  const activeProduct = useProductContext((s) => s.activeProduct);
  const isMca = activeProduct === "PACB";
  const productSettlementRows = isMca ? mcaSettlementRows : settlementRows;
  const summary = isMca ? mcaSettlementSummary : settlementSummary;
  const chartsByTimeframe = isMca ? mcaTotalSettledChartsByTimeframe : totalSettledChartsByTimeframe;

  const { urlMid, midFilter, isReady } = useResolvedMids(activeProduct);

    const [search, setSearch]     = useState("");
    const [page, setPage]         = useState(1);
    const [statusSegment, setStatusSegment] = useState("All");
    const [duration, setDuration] = useState<SettlementDurationValue | undefined>(undefined);
    const [showCycleInfo, setShowCycleInfo] = useState(false);
    const [columnOrder, setColumnOrder] = useState<string[]>(SETTLEMENT_COLUMN_ORDER);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const startTime = duration ? new Date(`${duration.from}T00:00:00`).getTime() : undefined;
    const endTime = duration
      ? new Date(`${duration.mode === "range" ? (duration.to ?? duration.from) : duration.from}T23:59:59.999`).getTime()
      : undefined;
    const body = buildTxnRequestBody(
      { startTime, endTime },
      {
        searchQuery: search || undefined,
        selectedMid: midFilter,
        pageLimit: TRANSACTIONS_PAGE_LIMIT,
        from: (page - 1) * TRANSACTIONS_PAGE_LIMIT,
      }
    );

    const { data, isPending, isError, refetch } = usePostQuery<McaTransactionsResponse, TableReqBody>(
      ["mca-transactions", urlMid, ...(midFilter?.value ?? [])],
      mcaTxnSearchApi(urlMid),
      body,
      { staleTime: 0 },
      isReady
    );

    const rows       = data?.data?.data ?? [];
    const totalCount = data?.data?.totalCount ?? 0;

    const activeStatusSegments = isMca ? MCA_SETTLEMENT_STATUS_SEGMENTS : SETTLEMENT_STATUS_SEGMENTS;
    // Falls back to "All" rather than an effect resetting statusSegment on
    // product-context changes (see CLAUDE.md's no-setState-in-effect rule),
    // guards against a stale PA segment (e.g. "processing") surviving a
    // switch to MCA, whose segments use different status values.
    const validStatusSegment = activeStatusSegments.some((s) => s.value === statusSegment) ? statusSegment : "All";

    const onSearch   = (v: string) => { setSearch(v);   setPage(1); };
    const onDuration = (v: SettlementDurationValue | undefined) => { setDuration(v); setPage(1); };
    const onStatusSegment = (v: string) => { setStatusSegment(v); setPage(1); };
    const onClear    = () => { setSearch(""); setDuration(undefined); setStatusSegment("All"); setPage(1); };
    const hasActive  = search !== "" || !!duration || validStatusSegment !== "All";

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

    const filteredSettlementRows = useMemo(() => {
      return productSettlementRows.filter((row) => {
        if (validStatusSegment !== "All" && row.status !== validStatusSegment) return false;
        return true;
      });
    }, [productSettlementRows, validStatusSegment]);

    function handleDownloadPreviousSettled() {
      toast.success("Settlement report download started");
    }

    function handleUploadInvoice() {
      toast.success("Opening pending invoices");
    }

  const upcoming = summary.upcomingSettlement;
  const showHolidayBanner = upcoming.affectedByNonWorkingDay && upcoming.nonWorkingDayReason === "holiday";

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden overflow-y-visible">
      {/* Thin single-strip banner, same treatment as the detail page's
       * non-working-day callout, only surfaced here when an actual bank
       * holiday (not just an ordinary weekend) is pushing settlements out. */}
      {showHolidayBanner && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <Icon name="alert-triangle" size={13} className="shrink-0" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Upcoming bank holiday.</span> Banks are closed on{" "}
            {formatWeekdayDate(upcoming.nonWorkingDayDate!)} for {upcoming.nonWorkingDayName}. Settlements due around
            this date are scheduled for the next working day, {formatDayMonth(upcoming.expectedDate)}.
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
            <SettlementCalendarButton rows={productSettlementRows} />
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
            onDownloadPreviousSettled={handleDownloadPreviousSettled}
            upcomingSettlementLabel={formatCurrency(summary.upcomingSettlement.amount, "INR")}
            upcomingSettlementTimeLabel={upcomingSettlementTimeLabel(summary)}
            pendingInvoiceCount={isMca ? mcaSettlementSummary.pendingInvoiceCount : undefined}
            onUploadInvoice={handleUploadInvoice}
          />

          <Card className="gap-0 overflow-hidden p-0">
            <div className="pl-5 pr-3 pb-3 pt-5">
              <div className="space-y-3">
                <SegmentedTabs
                  options={activeStatusSegments}
                  value={validStatusSegment}
                  onChange={onStatusSegment}
                />

                {/* Filter bar, a thin top divider separates it from the tabs
                 * above instead of its own bordered/boxed container. */}
                <div className="border-t border-border pt-3 flex items-center gap-2.5 flex-wrap">
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
            </div>
            <DataTable
              columns={buildSettlementColumns({ columnOrder, hiddenColumns })}
              data={filteredSettlementRows}
              emptyTitle="No settlements yet"
              emptyDescription="Settlement reports will appear here once transactions are processed"
              rowKey={(row) => row.id}
              pageSize={5}
              density="compact"
              tableLayout="content"
              className="rounded-none border-0 border-t border-border"
              rowAction={(row) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/reports/settlement-report/${row.id}`)}
                  rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
                  className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
                >
                  View details
                </Button>
              )}
            />
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
  );
}
