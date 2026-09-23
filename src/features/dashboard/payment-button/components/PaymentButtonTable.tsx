"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataCardList, DataTableCard } from "@/components/ui";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  AmountFilterChip,
  FilterChipGroup,
  StatusFilterChip,
  type AmountRangeValue,
} from "@/components/common/filters/FilterChips";
import { buildPaymentButtonColumns } from "@/features/dashboard/payment-button/columns";
import {
  PaymentButtonCard,
  PaymentButtonCardSkeleton,
} from "@/features/dashboard/payment-button/components/PaymentButtonCardList";
import { PaymentButtonRowActions } from "@/features/dashboard/payment-button/components/PaymentButtonRowActions";
import { DisablePaymentButtonDialog } from "@/features/dashboard/payment-button/components/DisablePaymentButtonDialog";
import {
  useCopyPaymentButtonCode,
  useDisablePaymentButton,
} from "@/features/dashboard/payment-button/hooks";
import {
  filterPaymentButtons,
  paymentButtonDetailsPath,
} from "@/features/dashboard/payment-button/helpers";
import { MOCK_PAYMENT_BUTTONS } from "@/features/dashboard/payment-button/mock-data";
import {
  PAYMENT_BUTTON_PAGE_LIMIT,
  PAYMENT_BUTTON_SEARCH_ARIA_LABEL,
  PAYMENT_BUTTON_SEARCH_HINTS,
  PAYMENT_BUTTON_STATUS_FILTERS,
  PAYMENT_BUTTON_VIEW_TABS,
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
 * Rows come from MOCK_PAYMENT_BUTTONS: the list endpoint exists
 * (paymentButtonSearchApi) but does not return amount, payment count or
 * revenue, which this design is built around. Every filter and the paging are
 * therefore client-side for now; swapping `allRows` / `isLoading` for the
 * query's result is the only change the tabs, chips and columns need.
 *
 * A row opens the button's details page. Copy code and Disable are real calls
 * (download / deactivate, as pg-dashboard makes them), addressed by the row's
 * MID, so against the mock rows' placeholder MID they fail with a toast.
 */
export function PaymentButtonTable({ onEdit }: PaymentButtonTableProps) {
  const router = useRouter();
  const { copyCode, copyingId } = useCopyPaymentButtonCode();
  const [pendingDisable, setPendingDisable] = useState<PaymentButton | null>(null);
  const { disable, isDisabling } = useDisablePaymentButton();

  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table. Read once on mount.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [amountRange, setAmountRange] = useState<AmountRangeValue>(EMPTY_AMOUNT_RANGE);
  const [page, setPage] = useState(1);

  const allRows = MOCK_PAYMENT_BUTTONS;
  const isLoading = false;

  const filtered = useMemo(
    () => filterPaymentButtons(allRows, { search, statuses, amountRange }),
    [allRows, search, statuses, amountRange]
  );
  const totalCount = filtered.length;
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAYMENT_BUTTON_PAGE_LIMIT, page * PAYMENT_BUTTON_PAGE_LIMIT),
    [filtered, page]
  );

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
  const hasNarrowingFilters = !!search.trim() || !!amountRange.min || !!amountRange.max;

  const emptyTitle = hasNarrowingFilters ? "No matching payment buttons" : "No payment buttons yet";
  const emptyDescription = hasNarrowingFilters
    ? "Try a different search, or clear a filter to widen the results."
    : "Create a payment button to start collecting payments from your website.";

  const openDetails = (row: PaymentButton) => router.push(paymentButtonDetailsPath(row.buttonId));

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
        <AmountFilterChip
          value={amountRange}
          onChange={(next) => {
            setAmountRange(next);
            setPage(1);
          }}
        />
        <StatusFilterChip
          options={PAYMENT_BUTTON_STATUS_FILTERS}
          selected={statuses}
          onChange={onStatusesChange}
        />
      </FilterChipGroup>
    </div>
  );

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
          pagination={pagination}
        />
      </div>

      <DisablePaymentButtonDialog
        row={pendingDisable}
        isDisabling={isDisabling}
        onOpenChange={(open) => !open && setPendingDisable(null)}
        onConfirm={disable}
      />
    </>
  );
}
