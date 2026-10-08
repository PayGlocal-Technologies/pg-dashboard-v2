"use client";

import {
  Button,
  Card,
  DataTableCard,
  Separator,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type Column,
} from "@/components/ui";
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

/** What each figure means, on the ⓘ beside its label. */
const HELP = {
  settlementId:
    "A unique ID PayGlocal creates for this settlement when it is initiated. Quote it when you contact support about this payout.",
  utr: "The Unique Transaction Reference your bank assigns once the money reaches your account. Use it to find this payout in your bank statement.",
  payments: "The total value of the captured payments included in this settlement.",
  gst: "Goods and Services Tax charged on PayGlocal's platform fee.",
  platformFee:
    "PayGlocal's fee for processing the payments in this settlement, after any discounts.",
} as const;

/** An ⓘ that explains the label it sits beside, on hover or focus. */
function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={`About ${label}`}
          className="h-4 w-4 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
        >
          <Icon name="info" size={12} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/** A Details label with its explanation. */
function LabelWithInfo({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <InfoTip label={label} text={help} />
    </span>
  );
}

/**
 * One group of the Amount Breakdown: a header line carrying the group's
 * total, then the lines that make it up, indented and quieter. Gross, then
 * Deductions, then the Net result, so the sum reads top to bottom.
 */
function BreakupGroup({
  title,
  total,
  tone = "default",
  lines = [],
}: {
  title: string;
  total: number;
  tone?: "default" | "negative";
  lines?: { label: string; value: number; help: string }[];
}) {
  const negative = tone === "negative";
  const money = (n: number) => `${negative ? "−" : ""}${formatCurrency(n, "INR")}`;
  return (
    <div className="flex flex-col gap-2.5 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            negative ? "text-red-600 dark:text-red-400" : "text-foreground"
          )}
        >
          {money(total)}
        </span>
      </div>
      {lines.map((line) => (
        <div key={line.label} className="flex items-center justify-between gap-4 pl-4">
          <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
            {line.label}
            <InfoTip label={line.label} text={line.help} />
          </span>
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {money(line.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

const PAYMENT_COLUMNS: Column<MockPaSettlementPayment>[] = [
  {
    key: "createdAt",
    header: "Created on",
    minWidth: 150,
    render: (p) => (
      <span className="whitespace-nowrap text-[12px] font-medium text-muted-foreground">
        {formatDate(p.createdAt)}
      </span>
    ),
  },
  {
    key: "id",
    header: "Transaction ID",
    minWidth: 170,
    render: (p) => (
      <CopyableCell value={p.id} copyValue={p.id} label="Transaction ID" className="text-[12px]" />
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
            label={<LabelWithInfo label="Settlement ID" help={HELP.settlementId} />}
            value={
              settlement.settlementId ? (
                <CopyableCell
                  value={settlement.settlementId}
                  copyValue={settlement.settlementId}
                  label="Settlement ID"
                  className="text-[13px]"
                />
              ) : (
                "—"
              )
            }
          />
          <DetailRow
            label={<LabelWithInfo label="UTR number" help={HELP.utr} />}
            value={
              utr ? (
                <CopyableCell value={utr} copyValue={utr} label="UTR" className="text-[13px]" />
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
      <Card className="shadow-none gap-0 divide-y divide-border p-0">
        <BreakupGroup
          title="Gross settlement"
          total={view.grossAmount}
          lines={[{ label: "Payments", value: view.grossAmount, help: HELP.payments }]}
        />
        <BreakupGroup
          title="Deductions"
          total={deductions}
          tone="negative"
          lines={[
            { label: "Goods and services tax (GST)", value: view.gst, help: HELP.gst },
            {
              label: "Platform fee charged on payments",
              value: view.platformFee,
              help: HELP.platformFee,
            },
          ]}
        />
        {/* The result, set apart: what reached (or will reach) the account. */}
        <div className="flex items-center justify-between gap-4 rounded-b-xl bg-muted/40 px-5 py-4">
          <span className="text-[15px] font-bold text-foreground">Net settlement</span>
          <span className="text-[15px] font-bold tabular-nums text-foreground">
            {formatCurrency(settlement.amount, "INR")}
          </span>
        </div>
      </Card>
    </section>
  );

  const payments = view?.payments ?? [];

  if (!isPage) {
    const preview = payments.slice(0, DRAWER_PAYMENT_PREVIEW);
    return (
      // data-morph-*: where the drawer-to-page hand-off picks this view up
      // (see DrawerExpandMorph). The body's vars are unset outside it.
      <div className="flex flex-col gap-5" data-morph-anchor>
        {header}
        <div
          className="flex flex-col gap-5"
          data-morph-body
          style={{
            translate: "var(--morph-body-x, 0px) var(--morph-gap, 0px)",
            width: "var(--morph-body-w, auto)",
          }}
        >
          {details}
          {breakdown}
          <section className="flex flex-col gap-2">
            <SectionLabel>Payments in this settlement ({payments.length})</SectionLabel>
            <Card className="shadow-none gap-0 p-0">
              <ul className="divide-y divide-border">
                {preview.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate tabular-nums text-[12px] text-foreground">{p.id}</p>
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
      </div>
    );
  }

  return (
    // data-morph-*: where the drawer's view lands in the drawer-to-page
    // hand-off, its details and breakdown in the side column (see
    // DrawerExpandMorph).
    <div className="space-y-5" data-morph-anchor>
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
        <div className="flex flex-col gap-4 lg:sticky lg:top-4" data-morph-body>
          {details}
          {breakdown}
        </div>
      </div>
    </div>
  );
}
