"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ColumnManager, DataTableCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { FilterChipGroup } from "@/components/common/filters/FilterChips";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
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
import { MOCK_DISPUTE_ROWS } from "@/features/dashboard/dispute-management/mockRows";
import {
  DISPUTE_SEGMENT_RAW_STATUSES,
  DISPUTE_STATUS_SEGMENTS,
  RESPOND_BY_SEGMENTS,
  type DisputeStatusSegment,
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
const STATUS_FILTER_OPTIONS = DISPUTE_STATUS_SEGMENTS.filter(
  (segment) => segment.value !== "all"
).map((segment) => ({ value: segment.value, label: segment.label }));

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
      },
    ],
  };
}

export function DisputeManagementFeature() {
  const router = useRouter();
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
  const [statusSegment, setStatusSegment] = useState<DisputeStatusSegment>("all");
  const [statusFilter, setStatusFilter] = useState<string[] | undefined>(undefined);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [amountRange, setAmountRange] = useState<AmountRangeValue | undefined>(undefined);
  const [disputedDate, setDisputedDate] = useState<TransactionDateTimeValue | undefined>(undefined);
  const [columnOrder, setColumnOrder] = useState<string[]>(DISPUTE_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Captured once on mount (see CLAUDE.md's no-Date.now()-during-render
  // rule), the fixed "now" every date comparison below is made against.
  const [nowMs] = useState(() => Date.now());

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
        !statusFilter.some((segmentValue) =>
          DISPUTE_SEGMENT_RAW_STATUSES[
            segmentValue as Exclude<DisputeStatusSegment, "all">
          ].includes(row.status)
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

  const onViewDetails = (row: DisputeRow) => {
    setStoredTransaction(toPaTransaction(row));
    // Stays under /dispute-management (not /transactions), see
    // DisputeDetailFeature's `origin` prop for the back-link text. Opens the
    // dispute's own detail view directly, not the parent transaction, the
    // merchant explicitly selected this dispute.
    router.push(
      `/dispute-management/${encodeURIComponent(row.txnGid)}/${encodeURIComponent(row.disputeId)}`
    );
  };

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

  return (
    // Full-bleed background matching the cards below, rather than the app
    // shell's default grey (see (dashboard)/layout.tsx), same treatment as
    // the Transactions page.
    <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
      <div className="page-enter mx-auto max-w-[1400px] space-y-4">
        <PageHeader
          title="Dispute Management"
          subtitle="Track, respond to and resolve payment disputes"
        />

        {/* No metrics section: disputes are mock rows today, and the cards
            that were here added hard-coded figures (amount recovered, its
            trend) on top. They come back with a real disputes endpoint. */}

        <DataTableCard<DisputeRow>
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
          data={sortedRows}
          // Reuses `hasActive` — the same boolean the Clear button above is
          // gated on — so a filtered-to-nothing result says so instead of
          // claiming the merchant has never had a dispute. No CTA either
          // way: disputes are raised by customers, not created here.
          emptyTitle={
            hasActive ? "No disputes match these filters" : "Keep track of disputes and chargebacks"
          }
          emptyDescription={
            hasActive
              ? "Try a wider date range, or clear a filter to see more."
              : "If a customer disputes a payment, it appears here with the evidence to submit and the date it's due by."
          }
          rowKey={(row) => row.disputeId}
          pagination={{
            mode: "client",
            pageSize: 8,
          }}
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
    </div>
  );
}
