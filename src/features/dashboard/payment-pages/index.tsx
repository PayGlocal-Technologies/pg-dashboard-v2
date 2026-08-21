"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  type Column,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageHeader,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { paymentPageColumns } from "@/features/dashboard/payment-pages/columns";
import { useEditingPaymentPage } from "@/features/dashboard/payment-pages/useEditingPaymentPage";
import {
  PaymentPagesAmountFilter,
  type AmountRangeValue,
} from "@/features/dashboard/payment-pages/components/PaymentPagesAmountFilter";
import {
  PAYMENT_PAGES_PAGE_LIMIT,
  PAYMENT_PAGE_STATUS_FILTERS,
  PAYMENT_PAGE_STATUS_OPTIONS,
} from "@/features/dashboard/payment-pages/constants";
import { paymentPageRows } from "@/features/dashboard/payment-pages/mock-data";
import type { PaymentPageRow } from "@/features/dashboard/payment-pages/types";

// TODO(integration): this screen is mock data only (see mock-data.ts). Wire it
// up to the real payment pages endpoints per the CLAUDE.md migration checklist
// before shipping — endpoint URL, request payload and response statuses must
// all be copied from pg-dashboard, not guessed.

export function PaymentPagesFeature() {
  const router = useRouter();
  const setEditingRow = useEditingPaymentPage((s) => s.setRow);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [statusChip, setStatusChip] = useState<string[] | undefined>(undefined);
  const [amountRange, setAmountRange] = useState<AmountRangeValue | undefined>(undefined);

  const onClear = () => {
    setStatus("All");
    setSearch("");
    setStatusChip(undefined);
    setAmountRange(undefined);
  };
  const hasActive =
    status !== "All" || search !== "" || !!statusChip?.length || !!amountRange;

  const openCreate = () => router.push("/payment-page/create");
  const onEdit = (row: PaymentPageRow) => {
    setEditingRow(row);
    router.push("/payment-page/edit");
  };
  // TODO(integration): wire disable to the backend once available (see mock-data.ts).
  const onDisable = (row: PaymentPageRow) => {
    void row;
  };

  // Always-visible actions column (the DataTable rowAction slot only shows on
  // row hover, so the menu button lives in a real column instead).
  const actionsColumn: Column<PaymentPageRow> = {
    key: "actions",
    header: "",
    width: "64px",
    minWidth: 56,
    align: "right",
    render: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Actions for ${row.product}`}
            className="h-auto min-h-0 cursor-pointer rounded-md px-1.5 py-1 text-muted-foreground hover:text-foreground"
          >
            <Icon name="more-horizontal" className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(row)}>
            <Icon name="pencil" className="h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onDisable(row)}>
            <Icon name="ban" className="h-3.5 w-3.5" />
            Disable
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  const columns = [...paymentPageColumns, actionsColumn];

  const filteredRows = useMemo(() => {
    return paymentPageRows.filter((row) => {
      if (status !== "All" && row.status !== status) return false;
      if (statusChip && !statusChip.includes(row.status)) return false;
      if (amountRange) {
        // Payer-chosen ("Customer decides") rows have no fixed amount, so an
        // explicit amount range excludes them.
        if (row.amount == null) return false;
        if (amountRange.min != null && row.amount < amountRange.min) return false;
        if (amountRange.max != null && row.amount > amountRange.max) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return row.product.toLowerCase().includes(q) || row.link.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, status, statusChip, amountRange]);

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      <PageHeader
        title="Payment Pages"
        subtitle="Branded pages to collect payments, donations, or custom form data"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={openCreate}
          >
            Create payment page
          </Button>
        }
      />

      {/* Single cohesive card: status tabs, then the filter bar, all sharing one
       * border/rounded container; the table sits directly beneath with only a
       * top border — same hierarchy as Payment Links and Transactions. */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="pl-5 pr-3 pb-3 pt-5">
          <div className="space-y-3">
            <SegmentedTabs
              options={PAYMENT_PAGE_STATUS_FILTERS}
              value={status}
              onChange={setStatus}
            />

            <div className="border-t border-border pt-3 flex items-center gap-2.5 flex-wrap">
              <RotatingSearchInput
                value={search}
                onSearch={setSearch}
                words={["product name"]}
                ariaLabel="Search payment pages"
                className="min-w-40 max-w-xs flex-1"
              />

              <div className="hidden sm:block h-4 w-px bg-border" />

              <div className="flex items-center gap-2 flex-wrap">
                <PaymentPagesAmountFilter value={amountRange} onChange={setAmountRange} />
                <MultiSelectChipFilter
                  value={statusChip}
                  options={PAYMENT_PAGE_STATUS_OPTIONS}
                  onChange={setStatusChip}
                  placeholder="Status"
                />
              </div>

              {hasActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon name="x" className="w-3 h-3" />}
                  onClick={onClear}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredRows}
          emptyTitle="No payment pages found"
          emptyDescription="Try adjusting your filters or search query"
          rowKey={(row) => row.id}
          pageSize={PAYMENT_PAGES_PAGE_LIMIT}
          density="compact"
          tableLayout="fixed"
          className="rounded-none border-0 border-t border-border"
        />
      </Card>
    </div>
  );
}
