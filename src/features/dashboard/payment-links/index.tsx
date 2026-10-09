"use client";

import { useMemo, useState } from "react";
import { Button, DataTableCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { FilterChipGroup } from "@/components/common/filters/FilterChips";
import { formatCurrency } from "@/lib/utils";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { paymentLinkColumns } from "@/features/dashboard/payment-links/columns";
import { PaymentLinkDetailsModal } from "@/features/dashboard/payment-links/components/PaymentLinkDetailsModal";
import { CreatePaymentLinkModal } from "@/features/dashboard/payment-links/components/CreatePaymentLinkModal";
import {
  PaymentLinksDateFilter,
  type PaymentLinksDateValue,
} from "@/features/dashboard/payment-links/components/PaymentLinksDateFilter";
import {
  PAYMENT_LINKS_PAGE_LIMIT,
  PAYMENT_LINK_DEFAULT_STATUS,
  PAYMENT_LINK_STATUS_FILTERS,
} from "@/features/dashboard/payment-links/constants";
import { paymentLinkRows as initialPaymentLinkRows } from "@/features/dashboard/payment-links/mock-data";
import type { PaymentLinkRow } from "@/features/dashboard/payment-links/types";
import { rowActionColumn } from "@/components/common/rowActionColumn";

// TODO(integration): this screen is mock data only (see mock-data.ts). Wire it
// up to the real payment links endpoints per the CLAUDE.md migration
// checklist before shipping, endpoint URL, request payload and response
// statuses must all be copied from pg-dashboard, not guessed.

export function PaymentLinksFeature() {
  // Held in state (not the plain mock-data export) so a newly created link
  // actually shows up in the table and filters, see CreatePaymentLinkModal.
  const [rows, setRows] = useState<PaymentLinkRow[]>(initialPaymentLinkRows);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(PAYMENT_LINK_DEFAULT_STATUS);
  const [dateFilter, setDateFilter] = useState<PaymentLinksDateValue | undefined>(undefined);
  const [currency, setCurrency] = useState<string[] | undefined>(undefined);

  const onSearch = (v: string) => setSearch(v);
  const onStatus = (v: string) => setStatus(v);

  const currencyOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.currency))).map((c) => ({ value: c, label: c })),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (status !== "All" && row.status !== status) return false;
      if (currency && !currency.includes(row.currency)) return false;
      if (dateFilter) {
        const dateKey = row.createdAt.slice(0, 10);
        if (dateKey < dateFilter.from || dateKey > dateFilter.to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          row.customerName.toLowerCase().includes(q) ||
          row.customerDetails.toLowerCase().includes(q) ||
          row.paymentFor.toLowerCase().includes(q) ||
          row.paymentLinkUrl.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, status, currency, dateFilter]);

  // Which empty state applies. The default tab (Active) and the empty
  // filters don't count as narrowing until the merchant changes one: a
  // first-time merchant should be told what payment links are for, not to
  // adjust filters.
  const hasNarrowingFilters =
    !!search.trim() ||
    status !== PAYMENT_LINK_DEFAULT_STATUS ||
    !!dateFilter ||
    (currency?.length ?? 0) > 0;

  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No matching payment links",
        description: "Try a different search, or clear a filter to widen the results.",
      }
    : {
        title: "Share a payment link and start collecting",
        description:
          "Create a link, send it to your customer, and collect payment without building a checkout.",
      };

  const [detailsRow, setDetailsRow] = useState<PaymentLinkRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const openDetails = (row: PaymentLinkRow) => {
    setDetailsRow(row);
    setDetailsOpen(true);
  };

  const handleCreated = (row: PaymentLinkRow) => {
    setRows((prev) => [row, ...prev]);
    openDetails(row);
  };

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      <PageHeader
        title="Payment Links"
        subtitle={`${rows.length} Links Created`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="refresh" className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            >
              Report
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={() => setCreateOpen(true)}
            >
              Create Payment Link
            </Button>
          </>
        }
      />

      {/* No metrics section: there is no payment links analytics endpoint
          yet, and the cards that were here drew static figures as if they
          were the merchant's. They come back with real data. */}

      {/* Single cohesive card: title, status tabs, then the filter bar, all
       * sharing one border/rounded container, the table sits directly
       * beneath with only a top border, same hierarchy as the Settlement
       * Reports and Transactions tables. */}
      <DataTableCard<PaymentLinkRow>
        tabs={
          <SegmentedTabs options={PAYMENT_LINK_STATUS_FILTERS} value={status} onChange={onStatus} />
        }
        toolbar={
          <div className="flex items-center gap-2.5 flex-wrap">
            <RotatingSearchInput
              value={search}
              onSearch={onSearch}
              words={["customer name", "email", "payment link"]}
              className="min-w-40 max-w-xs flex-1"
            />

            <div className="hidden sm:block h-4 w-px bg-border" />

            <FilterChipGroup className="flex items-center gap-2 flex-wrap">
              <PaymentLinksDateFilter value={dateFilter} onChange={setDateFilter} />
              <MultiSelectChipFilter
                value={currency}
                options={currencyOptions}
                onChange={setCurrency}
                placeholder="Currency"
              />
            </FilterChipGroup>
          </div>
        }
        emptyState={
          <PlaceholderState
            variant="empty-table"
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              hasNarrowingFilters ? undefined : (
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                  onClick={() => setCreateOpen(true)}
                >
                  Create payment link
                </Button>
              )
            }
            className="py-16"
          />
        }
        columns={[
          ...paymentLinkColumns,
          rowActionColumn((row) => (
            <Button
              variant="outline"
              size="sm"
              rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
              onClick={() => openDetails(row)}
              className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
            >
              View details
            </Button>
          )),
        ]}
        data={filteredRows}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        rowKey={(row) => row.id}
        // The whole row opens the link's details, through DataTable's
        // row-level handler rather than a wrapper around every cell.
        onRowClick={openDetails}
        pagination={{
          mode: "client",
          pageSize: PAYMENT_LINKS_PAGE_LIMIT,
        }}
        maxBodyHeight="none"
      />

      <PaymentLinkDetailsModal row={detailsRow} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <CreatePaymentLinkModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
