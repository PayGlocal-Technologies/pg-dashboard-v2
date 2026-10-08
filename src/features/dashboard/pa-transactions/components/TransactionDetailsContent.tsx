"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Separator, StatusBadge } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { ProductFeedback } from "@/components/common/ProductFeedback";
import {
  customerName,
  formatDisplayDateTime,
} from "@/features/dashboard/pa-transactions/paColumns";
import { getStatusMeta } from "@/features/dashboard/pa-transactions/columns";
import { deriveTransactionDetail } from "@/features/dashboard/pa-transactions/deriveTransactionDetail";
import {
  CopyableDetailRow,
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { AmountBreakdownBody } from "@/features/dashboard/pa-transactions/components/AmountBreakdownBody";
import {
  IssueRefundDialog,
  type RefundSubmission,
} from "@/features/dashboard/pa-transactions/components/IssueRefundDialog";
import { LinkedTransactionsSection } from "@/features/dashboard/pa-transactions/components/LinkedTransactionsSection";
import {
  CardNetworkLogo,
  PaymentCategoryLogo,
  TransactionPaymentMethod,
} from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { BankName } from "@/components/common/BankLogo";
import { PaymentTimeline } from "@/features/dashboard/pa-transactions/components/PaymentTimeline";
import { formatTimelineSteps } from "@/features/dashboard/pa-transactions/components/timelineStepFormatting";
import { validateRefund } from "@/features/dashboard/pa-transactions/financial/deriveFinancials";
import { deriveTimelineSteps } from "@/features/dashboard/pa-transactions/financial/generateTimeline";
import { formatNow } from "@/features/dashboard/pa-transactions/formatNow";
import type { RefundEvent } from "@/features/dashboard/pa-transactions/financial/types";
import { useRefundEvents } from "@/stores/useRefundEvents";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

const EMPTY_REFUND_EVENTS: RefundEvent[] = [];

/** Statuses a refund can be issued against: the payment was captured. */
const REFUNDABLE_STATUSES = new Set(["SUCCESS", "SENT_FOR_CAPTURE"]);

/**
 * Everything about one PA transaction, shared by the collapsed view (the
 * drawer) and the expanded one (the page), so the two can never drift: the
 * header (amount, status, when and how, who), Timeline,
 * Payment Breakdown, Linked Transactions, Payment Details, Customer Details
 * and Status Notes. Only the arrangement differs:
 *
 *  - "drawer": one column, header then each section in turn.
 *  - "page":   the header across the top, then a wide left column (timeline,
 *    breakdown, linked) beside a sticky right one (payment,
 *    customer, status notes).
 *
 * The status chip is the table's own (columns.tsx), so a row and its details
 * always say the same thing. No dispute content: disputes are not shown on
 * this page.
 */
export function TransactionDetailsContent({
  transaction,
  layout,
  decorative = false,
}: {
  transaction: PaTransaction;
  layout: "drawer" | "page";
  /** A display-only copy (the drawer/page hand-off draws one): no feedback
   *  prompt or refund dialog of its own, so they never appear twice. */
  decorative?: boolean;
}) {
  const router = useRouter();
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  // Session-issued refunds not yet on the transaction itself, merged into
  // every refundable/refunded figure by deriveTransactionDetail.
  const refundEvents = useRefundEvents(
    (s) => s.eventsByTransactionId[transaction.gid ?? ""] ?? EMPTY_REFUND_EVENTS
  );
  const addRefundEvent = useRefundEvents((s) => s.addRefundEvent);
  const [refundOpen, setRefundOpen] = useState(false);

  const detail = deriveTransactionDetail(transaction, refundEvents);
  const status = getStatusMeta(transaction.externalStatus);
  const amount = parseFloat(transaction.totalAmount ?? "0");
  const currency = transaction.txnCurrency ?? "INR";
  const name = customerName(transaction) || "Unknown customer";
  const isCaptured = REFUNDABLE_STATUSES.has(
    (transaction.externalStatus ?? "").toUpperCase().replace(/ /g, "_")
  );
  const refundableAmount = detail.financials.remainingAmount;
  const canRefund = isCaptured && refundableAmount > 0;
  const formattedDateTime =
    formatDisplayDateTime(transaction.formattedCreationDateTime) ?? "Not available";
  const isPage = layout === "page";

  function handleIssueRefund({ amount: refundAmount, reason, details }: RefundSubmission) {
    // Checked against every refund on this transaction, so it can't be
    // over-refunded across several partial refunds.
    const validation = validateRefund(amount, currency, detail.financials.refundEvents, {
      amount: refundAmount,
      currency,
    });
    if (!validation.ok) {
      toast.error("Refund not issued", { description: validation.reason });
      return;
    }
    const transactionId = transaction.gid ?? "";
    addRefundEvent(transactionId, {
      id: `${transactionId}-refund-${detail.financials.refundEvents.length + 1}`,
      transactionId,
      amount: refundAmount,
      currency,
      status: "PROCESSING",
      reason: reason.replace(/_/g, " "),
      details,
      createdAt: formatNow(new Date()),
    });
    toast.success(`Refund of ${formatCurrency(refundAmount, currency)} issued`, {
      description: "This transaction's status has been updated to reflect the refund.",
    });
  }

  /** A linked row is this transaction's own refund child: open its page. */
  function goToLinked(row: PaTransaction) {
    setStoredTransaction(transaction);
    if (row.linkedRecordType === "refund") {
      router.push(
        `/pa-transactions/${encodeURIComponent(transaction.gid ?? "")}/refunds/${encodeURIComponent(row.linkedRecordId ?? "")}`
      );
      return;
    }
    router.push(`/pa-transactions/${encodeURIComponent(row.gid ?? "")}`);
  }

  function goToSettlement(settlementId: string) {
    router.push(`/reports/settlement-report/${encodeURIComponent(settlementId)}`);
  }

  const header = (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p
            className={cn(
              "flex items-baseline gap-2 font-bold tracking-tight text-foreground tabular-nums",
              isPage ? "text-4xl" : "text-3xl"
            )}
          >
            {formatCurrency(amount, currency)}
            <span className="text-base font-medium text-muted-foreground">{currency}</span>
          </p>
          <StatusBadge
            variant={status.variant}
            label={status.label}
            trailIcon={status.trailIcon}
            size="sm"
          />
        </div>
        {canRefund && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRefundOpen(true)}
            className="shadow-none"
          >
            Issue Refund
          </Button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground">
        <span>{formattedDateTime}</span>
        <Separator orientation="vertical" className="h-3.5" />
        <TransactionPaymentMethod row={transaction} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Charged to <span className="font-semibold text-foreground/85">{name}</span>
      </p>
    </div>
  );

  // A failed payment's step also says why, in small print under its time:
  // the same reason Status Notes gives.
  const timelineSteps = formatTimelineSteps(
    deriveTimelineSteps(detail.financials),
    currency,
    goToSettlement
  ).map((step) =>
    step.id === "payment-failed" && detail.statusReason
      ? {
          ...step,
          description: (
            <>
              {step.description}
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground/80">
                {detail.statusReason}
              </span>
            </>
          ),
        }
      : step
  );

  const timeline = (
    <section className="flex flex-col gap-2">
      <SectionLabel>Timeline</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <PaymentTimeline steps={timelineSteps} />
      </Card>
    </section>
  );

  const breakdown = detail.amountBreakdown && (
    <section className="flex flex-col gap-2">
      <SectionLabel>Payment Breakdown</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <AmountBreakdownBody
          amountReceived={detail.amountBreakdown.amountReceived}
          fee={detail.amountBreakdown.fee}
          refundedAmount={detail.amountBreakdown.refundedAmount}
          netAmount={detail.amountBreakdown.netAmount}
          currency={currency}
        />
      </Card>
    </section>
  );

  const linked = (
    <section className="flex flex-col gap-2">
      <SectionLabel>Linked Transactions</SectionLabel>
      <LinkedTransactionsSection
        transactions={detail.linkedTransactions}
        onViewDetails={goToLinked}
      />
    </section>
  );

  const paymentDetails = (
    <section className="flex flex-col gap-2">
      <SectionLabel>Payment Details</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <div className="flex flex-col gap-5">
          {transaction.gid ? (
            <CopyableDetailRow
              layout="inline"
              label="Transaction ID"
              value={transaction.gid}
              monospace
              wrap
            />
          ) : (
            <DetailRow layout="inline" label="Transaction ID" value="Not available" />
          )}
          <CopyableDetailRow
            layout="inline"
            label="Merchant Transaction ID"
            value={detail.merchantTxnId}
            monospace
            wrap
          />
          <DetailRow
            layout="inline"
            label="Payment Category"
            value={
              <span className="inline-flex items-center gap-2">
                <PaymentCategoryLogo row={transaction} />
                {detail.paymentCategory}
              </span>
            }
          />
          {detail.cardType && (
            <DetailRow
              layout="inline"
              label="Card Type"
              value={
                <span className="inline-flex items-center gap-2">
                  <CardNetworkLogo brand={detail.cardType} />
                  {detail.cardType}
                </span>
              }
            />
          )}
          <DetailRow layout="inline" label="Issuer" value={<BankName name={detail.issuerBank} />} />
        </div>
      </Card>
    </section>
  );

  const customerDetails = (
    <section className="flex flex-col gap-2">
      <SectionLabel>Customer Details</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <div className="flex flex-col gap-5">
          <DetailRow label="Customer Name" value={name} />
          {transaction.encEmailId ? (
            <CopyableDetailRow label="Email ID" value={transaction.encEmailId} />
          ) : (
            <DetailRow label="Email ID" value="Not available" />
          )}
          <CopyableDetailRow label="Phone Number" value={detail.customerPhone} />
          <CopyableDetailRow label="Address" value={detail.customerAddress} wrap />
          {detail.comments && (
            <div>
              <p className="text-xs text-muted-foreground">Comments</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground/85">
                {detail.comments}
              </p>
            </div>
          )}
        </div>
      </Card>
    </section>
  );

  const statusNotes = (
    <section className="flex flex-col gap-2">
      <SectionLabel>Status Notes</SectionLabel>
      <Card
        className={cn("gap-5 p-5 shadow-none", status.variant === "danger" && "border-red-200")}
      >
        <DetailRow label="Reason" value={detail.statusReason} />
        {detail.errorCode && <DetailRow label="Error Code" value={detail.errorCode} />}
      </Card>
    </section>
  );

  const refundDialog = !decorative && (
    <IssueRefundDialog
      open={refundOpen}
      onOpenChange={setRefundOpen}
      currency={currency}
      refundableAmount={refundableAmount}
      onSubmit={handleIssueRefund}
    />
  );

  if (!isPage) {
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
          {timeline}
          {breakdown}
          {paymentDetails}
          {customerDetails}
          {statusNotes}
          {linked}
        </div>
        {refundDialog}
      </div>
    );
  }

  return (
    // data-morph-*: where the drawer's view lands in the drawer-to-page
    // hand-off, its body in the main column (see DrawerExpandMorph).
    <div className="space-y-5" data-morph-anchor>
      {header}
      <Separator />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-4" data-morph-body>
          {timeline}
          {isCaptured && !decorative && <ProductFeedback key={transaction.gid} />}
          {breakdown}
          {linked}
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          {paymentDetails}
          {customerDetails}
          {statusNotes}
        </div>
      </div>
      {refundDialog}
    </div>
  );
}
