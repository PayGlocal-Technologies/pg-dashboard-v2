"use client";

import { useMemo, useState } from "react";
import { Button, Card, DataTable, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { paymentLinkColumns, withRowClick } from "@/features/dashboard/payment-links/columns";
import { PaymentLinksStatCards } from "@/features/dashboard/payment-links/components/PaymentLinksStatCards";
import { PaymentLinkDetailsModal } from "@/features/dashboard/payment-links/components/PaymentLinkDetailsModal";
import { CreatePaymentLinkModal } from "@/features/dashboard/payment-links/components/CreatePaymentLinkModal";
import {
  PaymentLinksDateFilter,
  type PaymentLinksDateValue,
} from "@/features/dashboard/payment-links/components/PaymentLinksDateFilter";
import {
  PaymentLinksAmountFilter,
  type AmountRangeValue,
} from "@/features/dashboard/payment-links/components/PaymentLinksAmountFilter";
import {
  PaymentLinksMetricsPeriodFilter,
  type MetricsPeriod,
} from "@/features/dashboard/payment-links/components/PaymentLinksMetricsPeriodFilter";
import {
  PAYMENT_LINKS_PAGE_LIMIT,
  PAYMENT_LINK_STATUS_FILTERS,
} from "@/features/dashboard/payment-links/constants";
import {
  paymentLinkRows as initialPaymentLinkRows,
  paymentLinksMetricsByPeriod,
} from "@/features/dashboard/payment-links/mock-data";
import type { PaymentLinkRow } from "@/features/dashboard/payment-links/types";

// TODO(integration): this screen is mock data only (see mock-data.ts). Wire it
// up to the real payment links endpoints per the CLAUDE.md migration
// checklist before shipping, endpoint URL, request payload and response
// statuses must all be copied from pg-dashboard, not guessed.

export function PaymentLinksFeature() {
  // Held in state (not the plain mock-data export) so a newly created link
  // actually shows up in the table and filters, see CreatePaymentLinkModal.
  const [rows, setRows] = useState<PaymentLinkRow[]>(initialPaymentLinkRows);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [dateFilter, setDateFilter] = useState<PaymentLinksDateValue | undefined>(undefined);
  const [amountRange, setAmountRange] = useState<AmountRangeValue | undefined>(undefined);
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
      if (amountRange) {
        if (amountRange.min != null && row.amount < amountRange.min) return false;
        if (amountRange.max != null && row.amount > amountRange.max) return false;
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
  }, [rows, search, status, currency, dateFilter, amountRange]);

  // Metrics-section time period, deliberately independent of the table's own
  // search/status/amount/currency/dateFilter filters above (see mock-data.ts).
  const [metricsPeriod, setMetricsPeriod] = useState<MetricsPeriod>("today");
  const metricsSnapshot = paymentLinksMetricsByPeriod[metricsPeriod];

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

  const columns = withRowClick(paymentLinkColumns, openDetails);

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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Metrics</h2>
          <PaymentLinksMetricsPeriodFilter value={metricsPeriod} onChange={setMetricsPeriod} />
        </div>

        <PaymentLinksStatCards
          totalAmountLabel={formatCurrency(metricsSnapshot.totalAmountCollected, "USD")}
          totalAmountTrendPct={metricsSnapshot.totalAmountTrendPct}
          totalAmountChartData={metricsSnapshot.totalAmountChart}
          totalLinks={metricsSnapshot.totalLinks}
          totalLinksTodayLabel={metricsSnapshot.totalLinksLabel}
          totalLinksChartData={metricsSnapshot.totalLinksChart}
          paidLinks={metricsSnapshot.paidLinks}
          paidLinksTodayLabel={metricsSnapshot.paidLinksLabel}
          paidLinksChartData={metricsSnapshot.paidLinksChart}
          activeLinks={metricsSnapshot.activeLinks}
          activeLinksTodayLabel={metricsSnapshot.activeLinksLabel}
          activeLinksChartData={metricsSnapshot.activeLinksChart}
        />
      </div>

      {/* Single cohesive card: title, status tabs, then the filter bar, all
       * sharing one border/rounded container, the table sits directly
       * beneath with only a top border, same hierarchy as the Settlement
       * Reports and Transactions tables. */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="pl-5 pr-3 pb-3 pt-5">
          <div className="space-y-3">
            <SegmentedTabs
              options={PAYMENT_LINK_STATUS_FILTERS}
              value={status}
              onChange={onStatus}
            />

            {/* Thin top divider separates the filter bar from the tabs
             * above instead of its own bordered/boxed container. */}
            <div className="border-t border-border pt-3 flex items-center gap-2.5 flex-wrap">
              <RotatingSearchInput
                value={search}
                onSearch={onSearch}
                words={["customer name", "email", "payment link"]}
                className="min-w-40 max-w-xs flex-1"
              />

              <div className="hidden sm:block h-4 w-px bg-border" />

              <div className="flex items-center gap-2 flex-wrap">
                <PaymentLinksDateFilter value={dateFilter} onChange={setDateFilter} />
                <PaymentLinksAmountFilter value={amountRange} onChange={setAmountRange} />
                <MultiSelectChipFilter
                  value={currency}
                  options={currencyOptions}
                  onChange={setCurrency}
                  placeholder="Currency"
                />
              </div>
            </div>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <PlaceholderState
            variant="no-payment-links"
            title="No payment links found"
            description="Try adjusting your filters or search query"
            className="border-t border-border py-16"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredRows}
            emptyTitle="No payment links found"
            emptyDescription="Try adjusting your filters or search query"
            rowKey={(row) => row.id}
            pageSize={PAYMENT_LINKS_PAGE_LIMIT}
            density="compact"
            tableLayout="content"
            className="rounded-none border-0 border-t border-border"
            rowAction={(row) => (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="eye" className="h-2.5 w-2.5" />}
                onClick={() => openDetails(row)}
                className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
              >
                View details
              </Button>
            )}
          />
        )}
      </Card>

      <PaymentLinkDetailsModal row={detailsRow} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <CreatePaymentLinkModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
