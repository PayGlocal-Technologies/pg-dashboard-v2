"use client";

import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  StatusBadge,
  VisuallyHidden,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CopyableText } from "@/components/common/CopyableText";
import {
  formatCurrency,
  formatTransactionDateOnly,
  formatTransactionTimestamp,
  parseApiDateTime,
  truncateMiddle,
} from "@/lib/utils/format";
import { CountryCell } from "@/features/dashboard/mca-transactions/columns";
import {
  SettlementTimelineStepper,
  type SettlementTimelineStep,
} from "@/features/dashboard/mca-transactions/components/SettlementTimelineStepper";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { PaymentMethodCell } from "@/features/dashboard/pa-transactions/columns";
import {
  CURRENCY_OPTIONS,
  methodLabel,
  statusMetaFor,
} from "@/features/dashboard/transaction-overview/columns";
import type { PartnerTransaction } from "@/features/dashboard/transaction-overview/types";

/**
 * DESIGN MOCK details drawer for the partner Transaction Overview.
 *
 * Mirrors the Multi-Currency Accounts TransactionDetailsDrawer (same right
 * drawer / bottom sheet, header with Close and the copyable transaction ID,
 * the big-amount summary, the "Settlement timeline" card on the same
 * SettlementTimelineStepper, and label-over-value detail cards). It can't reuse
 * that drawer directly: it fetches the live timeline and account data by
 * transaction ID, which sample rows don't have. Here the timeline is derived
 * from the row's status instead, and the view is read-only: a partner watches
 * the invoice step, it doesn't upload.
 *
 * TODO(integration): feed the real partner timeline once its endpoint is
 * confirmed against pg-dashboard.
 */

/** "DD/MM/YYYY HH:mm:ss" shifted by `hours`, back in the same format, so the
 *  timeline's step times read in order after the transaction's own. */
function shiftTimestamp(raw: string, hours: number): string {
  const base = parseApiDateTime(raw);
  if (!base) return raw;
  const d = new Date(base.getTime() + hours * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Steps done so far, then the one in progress, then the rest pending. */
function progressSteps(
  row: PartnerTransaction,
  steps: { title: string; subtitle?: ReactNode }[],
  done: number,
  hoursPerStep: number
): SettlementTimelineStep[] {
  return steps.map((step, i) => ({
    ...step,
    status: i < done ? "success" : i === done ? "inProgress" : "pending",
    date:
      i < done
        ? formatTransactionTimestamp(shiftTimestamp(row.createdAt, i * hoursPerStep))
        : undefined,
  }));
}

const MCA_PROGRESS: Record<string, number> = {
  FUNDS_ON_HOLD: 0,
  DOCUMENT_PENDING: 1,
  SENT_FOR_REVIEW: 2,
  SENT_FOR_SETTLEMENT: 4,
  SETTLED: 6,
  FIRC_SETTLED: 7,
};

function mcaTimeline(row: PartnerTransaction): SettlementTimelineStep[] {
  return progressSteps(
    row,
    [
      {
        title: "Funds in transit",
        subtitle: (
          <span className="flex items-center gap-1.5">
            <CountryFlag iso2={row.country} /> Received in the merchant&apos;s {row.currency}{" "}
            account
          </span>
        ),
      },
      { title: "Upload invoice", subtitle: "The merchant uploads the invoice for this payment." },
      { title: "Invoice review" },
      { title: "Transfer initiated to PayGlocal's India partner bank" },
      { title: "Converted to INR" },
      { title: "Transfer initiated to the merchant's bank account" },
      { title: "FIRC issuance" },
    ],
    MCA_PROGRESS[row.status] ?? 0,
    6
  );
}

function pgTimeline(row: PartnerTransaction): SettlementTimelineStep[] {
  const at = (hours: number) => formatTransactionTimestamp(shiftTimestamp(row.createdAt, hours));
  switch (row.status) {
    case "ISSUER_DECLINE":
      return [
        { status: "success", title: "Payment initiated", date: at(0) },
        {
          status: "error",
          title: "Declined by the issuing bank",
          subtitle: "The customer's bank didn't approve this payment.",
          date: at(0),
        },
      ];
    case "SENT_FOR_REFUND":
      return [
        { status: "success", title: "Payment initiated", date: at(0) },
        { status: "success", title: "Authorized", date: at(0) },
        { status: "success", title: "Captured", date: at(1) },
        {
          status: "inProgress",
          title: "Refund in progress",
          subtitle: "The amount goes back to the customer's original payment method.",
        },
      ];
    default:
      return progressSteps(
        row,
        [
          { title: "Payment initiated" },
          { title: "Authorized" },
          { title: "Captured" },
          {
            title: "Settled to the merchant",
            subtitle: "Paid out to the merchant's bank on the next settlement cycle.",
          },
        ],
        row.status === "SUCCESS" ? 3 : row.status === "AUTHORIZED" ? 2 : 1,
        1
      );
  }
}

/** Label above, value below, as in the MCA details cards. */
function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <Card size="sm" className="shadow-none">
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </section>
  );
}

function StatusNote({ row }: { row: PartnerTransaction }) {
  const amount = formatCurrency(row.amount, row.currency, "en-US");
  const note =
    row.rail === "MCA"
      ? {
          FUNDS_ON_HOLD: {
            variant: "info",
            text: `${amount} received and held in the merchant's virtual account.`,
          },
          DOCUMENT_PENDING: {
            variant: "warning",
            text: "Waiting for the merchant to upload an invoice for this payment.",
          },
          SENT_FOR_REVIEW: {
            variant: "info",
            text: "PayGlocal is reviewing the merchant's invoice. No action needed.",
          },
        }[row.status]
      : {
          ISSUER_DECLINE: {
            variant: "error",
            text: "This payment was declined and no money moved.",
          },
          SENT_FOR_REFUND: {
            variant: "info",
            text: "A refund is on its way back to the customer.",
          },
        }[row.status];
  if (!note) return null;
  return (
    <Alert variant={note.variant as "info" | "warning" | "error"}>
      <AlertDescription>{note.text}</AlertDescription>
    </Alert>
  );
}

function DetailsContent({ row }: { row: PartnerTransaction }) {
  const { label, variant, trailIcon } = statusMetaFor(row);
  const isMca = row.rail === "MCA";
  const isSettled = row.status === "SETTLED" || row.status === "FIRC_SETTLED";
  const currencyIso2 = CURRENCY_OPTIONS.find((o) => o.value === row.currency)?.iso2;

  return (
    <div className="space-y-4">
      {/* Summary: same arrangement as the MCA drawer's. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <CountryCell iso2={row.country} />
          <div className="mt-1.5 flex flex-col items-start gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[34px] font-semibold tabular-nums text-foreground">
                {formatCurrency(row.amount, row.currency, "en-US")}
              </span>
              <StatusBadge variant={variant} label={label} trailIcon={trailIcon} />
            </div>
            <p className="text-[13px] text-muted-foreground">
              {isMca ? "Charged to" : "Paid by"}{" "}
              <span className="font-medium text-foreground">{row.customerName}</span>
            </p>
            {isMca && !isSettled && row.settlementDate && (
              <Badge variant="outline" size="sm">
                Settlement date:{" "}
                {row.status === "FUNDS_ON_HOLD" || row.status === "DOCUMENT_PENDING"
                  ? "To be updated"
                  : formatTransactionDateOnly(row.settlementDate)}
              </Badge>
            )}
          </div>
        </div>
        <span className="shrink-0 text-[13px] text-muted-foreground">
          {formatTransactionTimestamp(row.createdAt)}
        </span>
      </div>

      <StatusNote row={row} />

      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {isMca ? "Settlement timeline" : "Payment timeline"}
        </h3>
        <Card size="sm" className="shadow-none">
          <CardContent>
            <SettlementTimelineStepper items={isMca ? mcaTimeline(row) : pgTimeline(row)} />
          </CardContent>
        </Card>
      </section>

      <Section title="Payment Details">
        <DetailRow label="Transaction date" value={formatTransactionTimestamp(row.createdAt)} />
        {isMca && (
          <DetailRow
            label="Settlement date"
            value={
              !row.settlementDate
                ? "Not generated yet"
                : row.status === "FUNDS_ON_HOLD" || row.status === "DOCUMENT_PENDING"
                  ? "To be updated"
                  : formatTransactionTimestamp(row.settlementDate)
            }
          />
        )}
        <DetailRow
          label="Payment method"
          value={isMca ? methodLabel(row) : <PaymentMethodCell row={row} />}
        />
        <DetailRow
          label="Currency"
          value={
            <span className="flex items-center gap-1.5">
              {currencyIso2 ? <CountryFlag iso2={currencyIso2} /> : null}
              {row.currency}
            </span>
          }
        />
        <DetailRow
          label="Transaction ID"
          value={
            <CopyableText
              value={row.id}
              displayValue={truncateMiddle(row.id, 12, 6)}
              className="min-w-0"
              valueClassName="min-w-0 truncate"
            />
          }
        />
      </Section>

      <Section title={isMca ? "Sender Details" : "Customer Details"}>
        <DetailRow label={isMca ? "Remitter name" : "Customer name"} value={row.customerName} />
        {!isMca && <DetailRow label="Email" value={row.email} />}
        <DetailRow label="Country" value={<CountryCell iso2={row.country} />} />
        <DetailRow label="Merchant ID" value={row.merchantId} />
      </Section>
    </div>
  );
}

export function TransactionOverviewDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: PartnerTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Bottom sheet below md, right drawer from md up, as in the MCA drawer.
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[32rem] sm:max-w-[92vw]"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Transaction details</VisuallyHidden>
        </DrawerTitle>

        <DrawerHeader className="flex shrink-0 items-center gap-2 py-3">
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
          {row && (
            <CopyableText
              value={row.id}
              displayValue={truncateMiddle(row.id, 10, 6)}
              valueClassName="min-w-0 truncate text-muted-foreground"
              className="ml-auto min-w-0"
            />
          )}
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {row && <DetailsContent row={row} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
