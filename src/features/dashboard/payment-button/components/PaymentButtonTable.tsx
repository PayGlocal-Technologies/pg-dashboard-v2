"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, DataCardList, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  AmountFilterChip,
  DateFilterChip,
  EMPTY_RELATIVE_RANGE,
  FilterChipGroup,
  StatusFilterChip,
  TextFilterChip,
  hasRelativeRange,
  relativeRangeToEpochMs,
  toEndOfDayMs,
  toStartOfDayMs,
  type AmountRangeValue,
  type DateRangeValue,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import { buildPaymentButtonColumns } from "@/features/dashboard/payment-button/columns";
import {
  PaymentButtonCard,
  PaymentButtonCardSkeleton,
} from "@/features/dashboard/payment-button/components/PaymentButtonCardList";
import { PaymentButtonRowActions } from "@/features/dashboard/payment-button/components/PaymentButtonRowActions";
import { DisablePaymentButtonDialog } from "@/features/dashboard/payment-button/components/DisablePaymentButtonDialog";
import { PaymentButtonCodeDialog } from "@/features/dashboard/payment-button/components/PaymentButtonCodeDialog";
import {
  useCopyPaymentButtonCode,
  usePreviewPaymentButtonCode,
  useDisablePaymentButton,
  usePaymentButtonListMids,
  usePaymentButtons,
} from "@/features/dashboard/payment-button/hooks";
import {
  buildPaymentButtonListBody,
  paymentButtonDetailsPath,
} from "@/features/dashboard/payment-button/helpers";
import {
  PAYMENT_BUTTON_PAGE_LIMIT,
  PAYMENT_BUTTON_SEARCH_ARIA_LABEL,
  PAYMENT_BUTTON_SEARCH_HINTS,
  PAYMENT_BUTTON_STATUS_FILTERS,
  PAYMENT_BUTTON_VIEW_TABS,
  DESIGN_ONLY_FIELDS_ENABLED,
  type PaymentButtonViewTab,
} from "@/features/dashboard/payment-button/constants";
import type { PaymentButton } from "@/features/dashboard/payment-button/types";

const EMPTY_AMOUNT_RANGE: AmountRangeValue = { min: "", max: "" };

/** The tab a status selection corresponds to: a single status is its own tab,
 *  anything else (none, or several picked in the chip) reads as All. */
function tabForStatuses(statuses: string[]): PaymentButtonViewTab {
  if (statuses.length !== 1) return "all";
  const match = PAYMENT_BUTTON_VIEW_TABS.find((tab) => tab.value === statuses[0]);
  return match?.value ?? "all";
}

interface PaymentButtonTableProps {
  onEdit: (row: PaymentButton) => void;
}

/**
 * The Payment Button table: status tabs, search + Amount/Status chips, and the
 * rows, all inside one DataTableCard — the SkuTable arrangement, with the
 * desktop grid from `lg` up and a card list below it.
 *
 * The tabs are a shortcut onto the same status filter the Status chip drives
 * (as on MCA Links), so the two can never disagree.
 *
 * Rows come from pg-dashboard's list endpoint (`POST /v1/search/wqr`), paged
 * and filtered server-side: tabs and the Status chip send
 * `merchantProductDataStatus`, the search box `queryString`, across the MIDs
 * usePaymentButtonListMids resolves. The endpoint returns id, status and dates
 * only, so Amount, Successful payments and Revenue render "—", and the Amount
 * chip is kept for the design but filters nothing (no amount to filter by).
 * The Draft tab has no API status and always comes back empty.
 *
 * A row opens the button's details page. Copy code and Disable are
 * pg-dashboard's download / deactivate calls, addressed by the row's MID.
 */
export function PaymentButtonTable({ onEdit }: PaymentButtonTableProps) {
  const router = useRouter();
  const { copyCode, copyingId } = useCopyPaymentButtonCode();
  const codePreview = usePreviewPaymentButtonCode();
  const [pendingDisable, setPendingDisable] = useState<PaymentButton | null>(null);
  const { disable, isDisabling } = useDisablePaymentButton();

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [amountRange, setAmountRange] = useState<AmountRangeValue>(EMPTY_AMOUNT_RANGE);
  // Date and Time, pg-dashboard's `date` filter: an absolute range, or "Last N
  // days" resolved to epoch millis once, when applied (resolving it per render
  // would change the query key every render). Applying one clears the other.
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [relativeRange, setRelativeRange] = useState<RelativeRangeValue>(EMPTY_RELATIVE_RANGE);
  const [relativeWindow, setRelativeWindow] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [page, setPage] = useState(1);

  const mids = usePaymentButtonListMids();
  const body = buildPaymentButtonListBody({
    mids,
    statuses,
    search,
    startTime:
      relativeWindow?.startTime ?? (dateRange.from ? toStartOfDayMs(dateRange.from) : undefined),
    endTime: relativeWindow?.endTime ?? (dateRange.to ? toEndOfDayMs(dateRange.to) : undefined),
    pageLimit: PAYMENT_BUTTON_PAGE_LIMIT,
    from: (page - 1) * PAYMENT_BUTTON_PAGE_LIMIT,
  });
  const {
    rows: pageRows,
    totalCount,
    isLoading,
    isFetching,
    isError,
    refetch,
    refresh,
  } = usePaymentButtons(body);

  // A refetch can finish faster than the spinner is noticeable, so the
  // outcome is confirmed explicitly, as on the Transactions tables.
  const handleRefresh = async () => {
    const { failed } = await refresh();
    if (failed) toast.error("Couldn't refresh payment buttons. Please try again.");
    else toast.success("Payment buttons updated");
  };

  // Every control that changes what matches also returns to page 1.
  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const onStatusesChange = (next: string[]) => {
    setStatuses(next);
    setPage(1);
  };
  const onTabChange = (value: string) => onStatusesChange(value === "all" ? [] : [value]);

  // Search and the Amount chip are the merchant's own narrowing; the tab (and
  // its twin, the Status chip) is a view, and an empty view reads as "none yet"
  // in the design rather than as a failed search.
  const hasNarrowingFilters =
    !!search.trim() ||
    !!amountRange.min ||
    !!amountRange.max ||
    !!dateRange.from ||
    !!dateRange.to ||
    relativeWindow !== null;

  const emptyTitle = hasNarrowingFilters ? "No matching payment buttons" : "No payment buttons yet";
  const emptyDescription = hasNarrowingFilters
    ? "Try a different search, or clear a filter to widen the results."
    : "Create a payment button to start collecting payments from your website.";

  const openDetails = (row: PaymentButton) =>
    router.push(paymentButtonDetailsPath(row.buttonId, row.mid));

  const columns = useMemo(
    () => buildPaymentButtonColumns({ onCopyCode: copyCode, copyingId }),
    [copyCode, copyingId]
  );

  // The table shows Copy code in its own column; a card has no columns, so it
  // carries Copy code beside the menu instead. Same component either way.
  const renderRowActions = (row: PaymentButton, showCopyCode = false) => (
    <PaymentButtonRowActions
      row={row}
      isCopying={copyingId === row.buttonId}
      showCopyCode={showCopyCode}
      onCopyCode={copyCode}
      onEdit={onEdit}
      onDisable={setPendingDisable}
      onPreviewCode={codePreview.preview}
    />
  );

  // Tabs and toolbar are written once and mounted on both surfaces; CSS shows
  // one at a time. The chip group holds its own open state, so the hidden copy
  // never opens alongside the visible one (see ReceiptFilterChips).
  const tabBar = (
    <UnderlineTabs
      tabs={PAYMENT_BUTTON_VIEW_TABS}
      value={tabForStatuses(statuses)}
      onValueChange={onTabChange}
    />
  );

  const renderControls = (chipRowClassName: string) => (
    <div className="flex flex-wrap items-center gap-2">
      <RotatingSearchInput
        value={search}
        onSearch={onSearch}
        words={PAYMENT_BUTTON_SEARCH_HINTS}
        ariaLabel={PAYMENT_BUTTON_SEARCH_ARIA_LABEL}
        className="w-full sm:w-56"
      />
      <FilterChipGroup className={chipRowClassName}>
        {/* No amount on a list row to filter by (see DESIGN_ONLY_FIELDS_ENABLED). */}
        {DESIGN_ONLY_FIELDS_ENABLED && (
          <AmountFilterChip
            value={amountRange}
            onChange={(next) => {
              setAmountRange(next);
              setPage(1);
            }}
          />
        )}
        <StatusFilterChip
          options={PAYMENT_BUTTON_STATUS_FILTERS}
          selected={statuses}
          onChange={onStatusesChange}
        />
        <DateFilterChip
          label="Date and Time"
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
            // Date.now() belongs here, in the handler, not in render.
            setRelativeWindow(hasRelativeRange(next) ? relativeRangeToEpochMs(next) : null);
            setPage(1);
          }}
        />
        {/* pg-dashboard sends its Button ID filter as the search query, the
            same field the search box drives, so the two share one value. */}
        <TextFilterChip
          chipKey="buttonId"
          label="Button ID"
          fieldLabel="Button ID"
          placeholder="Enter Button ID"
          value={search}
          onChange={onSearch}
          align="end"
        />
      </FilterChipGroup>
      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={
          <Icon name="refresh" className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        }
        onClick={() => void handleRefresh()}
        disabled={isFetching}
        className="ml-auto h-auto min-h-0 shrink-0 py-1 text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.12)]!"
      >
        Refresh
      </Button>
    </div>
  );

  // Same failure panel the Transactions tables show: headers would imply the
  // request succeeded and found nothing.
  const errorState = isError ? (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
        <Icon name="alert-circle" size={22} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Couldn&apos;t load payment buttons
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Something went wrong while fetching data.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={refetch}>
        Retry
      </Button>
    </div>
  ) : undefined;

  const pagination = {
    mode: "page",
    page,
    pageSize: PAYMENT_BUTTON_PAGE_LIMIT,
    total: totalCount,
    onPageChange: setPage,
  } as const;

  return (
    <>
      {/* Desktop (lg+). The overflow menu rides `rowAction`, pinned to the
          right edge. DataTable reveals that slot on row hover only; the
          overrides keep it always visible (opacity-100 on the span it hides)
          and lift it above the row's cells, as on SkuTable. */}
      <DataTableCard<PaymentButton>
        className="hidden lg:block [&_td.sticky]:z-[2] [&_td.sticky>span]:opacity-100"
        tabs={tabBar}
        toolbar={renderControls("flex flex-wrap items-center gap-1.5")}
        columns={columns}
        data={pageRows}
        rowKey={(row) => row.gid}
        isLoading={isLoading}
        // No `emptyState`: the table's own empty row (inbox tile, title, line)
        // is what the design draws, and it keeps the column headers.
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        errorState={errorState}
        rowAction={(row) => renderRowActions(row)}
        onRowClick={openDetails}
        pagination={pagination}
        tableLayout="content"
        maxBodyHeight="none"
      />

      {/* Tablet + mobile (below lg): the same page's rows as cards. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <div className="border-b border-border px-4 pt-3">{tabBar}</div>
        <div className="border-b border-border px-4 py-3">
          {renderControls("scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto")}
        </div>
        <DataCardList<PaymentButton>
          bordered={false}
          rows={pageRows}
          rowKey={(row) => row.gid}
          isLoading={isLoading}
          renderCard={(row) => (
            <PaymentButtonCard
              row={row}
              actions={renderRowActions(row, true)}
              onOpen={openDetails}
            />
          )}
          renderSkeleton={() => <PaymentButtonCardSkeleton />}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          errorState={errorState}
          pagination={pagination}
        />
      </div>

      <PaymentButtonCodeDialog
        script={codePreview.script}
        onOpenChange={(open) => !open && codePreview.close()}
      />

      <DisablePaymentButtonDialog
        row={pendingDisable}
        isDisabling={isDisabling}
        onOpenChange={(open) => !open && setPendingDisable(null)}
        onConfirm={disable}
      />
    </>
  );
}
