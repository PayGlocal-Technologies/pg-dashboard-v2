"use client";

import { Button, Card, DataTableCard, Separator, StatusBadge, type Column } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableCell } from "@/components/common/CopyableCell";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { formatDayMonth } from "@/lib/utils/format";
import {
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import {
  SETTLEMENT_STATUS_META,
  UtrNotGenerated,
} from "@/features/dashboard/settlement-reports/columns";
import {
  mockPaSettlementView,
  type MockPaSettlementPayment,
} from "@/features/dashboard/settlement-reports/mock-data";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

/** Payments listed in the drawer before "View all" hands off to the page. */
const DRAWER_PAYMENT_PREVIEW = 5;

function BreakupRow({
  label,
  value,
  indent,
  negative,
  emphasis,
}: {
  label: string;
  value: number;
  indent?: boolean;
  negative?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", indent && "pl-3")}>
      <span
        className={cn(
          indent ? "text-[13px]" : "text-sm",
          emphasis ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          indent ? "text-[13px]" : "text-sm",
          emphasis
            ? "font-semibold text-foreground"
            : negative
              ? "font-medium text-red-600 dark:text-red-400"
              : "font-medium text-foreground/85"
        )}
      >
        {negative ? "-" : ""}
        {formatCurrency(value, "INR")}
      </span>
    </div>
  );
}

const PAYMENT_COLUMNS: Column<MockPaSettlementPayment>[] = [
  {
    key: "createdAt",
    header: "Created on",
    minWidth: 150,
    render: (p) => (
      <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
        {formatDate(p.createdAt)}
      </span>
    ),
  },
  {
    key: "id",
    header: "Transaction ID",
    minWidth: 170,
    render: (p) => (
      <CopyableCell
        value={p.id}
        copyValue={p.id}
        label="Transaction ID"
        monospace
        className="text-[12px]"
      />
    ),
  },
  {
    key: "method",
    header: "Payment method",
    minWidth: 120,
    render: (p) => <span className="text-[12px] text-foreground">{p.method}</span>,
  },
  {
    key: "gross",
    header: "Gross amount",
    align: "right",
    minWidth: 120,
    render: (p) => (
      <span className="text-[12px] tabular-nums text-foreground">
        {formatCurrency(p.gross, "INR")}
      </span>
    ),
  },
  {
    key: "deductions",
    header: "Deductions",
    align: "right",
    minWidth: 100,
    render: (p) => (
      <span className="text-[12px] tabular-nums text-red-600 dark:text-red-400">
        -{formatCurrency(p.deductions, "INR")}
      </span>
    ),
  },
  {
    key: "net",
    header: "Net amount",
    align: "right",
    minWidth: 120,
    render: (p) => (
      <span className="text-[12px] font-semibold tabular-nums text-foreground">
        {formatCurrency(p.net, "INR")}
      </span>
    ),
  },
];

/**
 * Everything about one Payments settlement, shared by the collapsed view (the
 * drawer) and the expanded one (the page), the same split as a transaction's
 * details: the header (amount, status, when, Download report), Details,
 * Amount Breakdown and the payments it pays out.
 *
 *  - "drawer": one column, with the first few payments and "View all".
 *  - "page":   the header across the top, then the payments table beside a
 *    sticky right column (Details, Amount Breakdown).
 *
 * MOCK: the breakup, bank account and payments come from
 * mockPaSettlementView; no endpoint returns them yet.
 */
export function SettlementDetailsContent({
  settlement,
  layout,
  onDownload,
  onViewAllPayments,
}: {
  settlement: SettlementRow;
  layout: "drawer" | "page";
  onDownload?: () => void;
  /** Drawer only: hands off to the page, where the full table lives. */
  onViewAllPayments?: () => void;
}) {
  const view = mockPaSettlementView(settlement);
  const isPage = layout === "page";
  const status = settlement.status ? SETTLEMENT_STATUS_META[settlement.status] : null;
  const isProcessing = settlement.status === "PROCESSING";
  const utr = settlement.utrNumbers?.[0];
  const deductions = view ? view.gst + view.platformFee : 0;

  const header = (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p
            className={cn(
              "font-bold tracking-tight text-foreground tabular-nums",
              isPage ? "text-4xl" : "text-3xl"
            )}
          >
            {formatCurrency(settlement.amount, "INR")}
          </p>
          {status && (
            <StatusBadge
              variant={status.variant}
              label={status.label}
              trailIcon={status.trailIcon}
              size="sm"
            />
          )}
        </div>
        {onDownload && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            onClick={onDownload}
            className="shadow-none"
          >
            Download report
          </Button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground">
        <span>Initiated on {formatDayMonth(settlement.paymentReceivedAt.slice(0, 10))}</span>
        <Separator orientation="vertical" className="h-3.5" />
        <span>
          {isProcessing ? "Expected by" : "Settled on"} {formatDayMonth(settlement.id)}, 11:59 PM
        </span>
      </div>
    </div>
  );

  const details = (
    <section className="flex flex-col gap-2">
      <SectionLabel>Details</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <div className="grid grid-cols-2 gap-5">
          <DetailRow
            label="Settlement ID"
            value={
              settlement.settlementId ? (
                <CopyableCell
                  value={settlement.settlementId}
                  copyValue={settlement.settlementId}
                  label="Settlement ID"
                  monospace
                  className="text-[13px]"
                />
              ) : (
                "—"
              )
            }
          />
          <DetailRow
            label="UTR number"
            value={
              utr ? (
                <CopyableCell
                  value={utr}
                  copyValue={utr}
                  label="UTR"
                  monospace
                  className="text-[13px]"
                />
              ) : isProcessing ? (
                <UtrNotGenerated settlementDate={settlement.id} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
          <DetailRow
            label="Bank account"
            value={view ? `${view.account.bankName} ${view.account.maskedAccountNumber}` : "—"}
          />
          <DetailRow
            label="Transactions"
            value={`${settlement.transactionCount.toLocaleString("en-IN")} txns`}
          />
        </div>
      </Card>
    </section>
  );

  const breakdown = view && (
    <section className="flex flex-col gap-2">
      <SectionLabel>Amount Breakdown</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <div className="flex flex-col gap-3">
          <BreakupRow label="Gross settlement" value={view.grossAmount} emphasis />
          <BreakupRow label="Payments" value={view.grossAmount} indent />
          <BreakupRow label="Deductions" value={deductions} negative />
          <BreakupRow label="Goods and services tax (GST)" value={view.gst} indent negative />
          <BreakupRow
            label="Platform fee charged on payments"
            value={view.platformFee}
            indent
            negative
          />
          <div className="border-t border-border pt-3">
            <BreakupRow label="Net settlement" value={settlement.amount} emphasis />
          </div>
        </div>
      </Card>
    </section>
  );

  const payments = view?.payments ?? [];

  if (!isPage) {
    const preview = payments.slice(0, DRAWER_PAYMENT_PREVIEW);
    return (
      <div className="flex flex-col gap-5">
        {header}
        {details}
        {breakdown}
        <section className="flex flex-col gap-2">
          <SectionLabel>Payments in this settlement ({payments.length})</SectionLabel>
          <Card className="shadow-none gap-0 p-0">
            <ul className="divide-y divide-border">
              {preview.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[12px] text-foreground">{p.id}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.method} · {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-foreground">
                    {formatCurrency(p.net, "INR")}
                  </span>
                </li>
              ))}
            </ul>
            {payments.length > preview.length && onViewAllPayments && (
              <div className="border-t border-border px-5 py-2.5">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto min-h-0 p-0 text-xs"
                  onClick={onViewAllPayments}
                >
                  View all {payments.length} payments
                </Button>
              </div>
            )}
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}
      <Separator />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <section className="flex min-w-0 flex-col gap-2">
          <SectionLabel>Payments in this settlement ({payments.length})</SectionLabel>
          <DataTableCard<MockPaSettlementPayment>
            className="shadow-none"
            columns={PAYMENT_COLUMNS}
            data={payments}
            rowKey={(p) => p.id}
            emptyTitle="No payments"
            emptyDescription="This settlement has no payments to show."
            pagination={{ mode: "client", pageSize: 10 }}
            maxBodyHeight="none"
          />
        </section>
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          {details}
          {breakdown}
        </div>
      </div>
    </div>
  );
}
