"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { ProductFeedback } from "@/components/common/ProductFeedback";
import { ReferAndEarnBanner } from "@/components/common/ReferAndEarnBanner";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { CopyableCell } from "@/components/common/CopyableCell";
import {
  customerName,
  formatDisplayDateTime,
  getDisplayStatus,
  getDisplayStatusBucket,
} from "@/features/dashboard/pa-transactions/paColumns";
import { deriveTransactionDetail } from "@/features/dashboard/pa-transactions/deriveTransactionDetail";
import {
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { AmountBreakdownBody } from "@/features/dashboard/pa-transactions/components/AmountBreakdownBody";
import { DisputeStatusCard } from "@/features/dashboard/pa-transactions/components/DisputeStatusCard";
import { DisputeAcceptChoice } from "@/features/dashboard/pa-transactions/components/DisputeAcceptChoice";
import { DisputeRespondForm } from "@/features/dashboard/pa-transactions/components/DisputeRespondForm";
import {
  IssueRefundDialog,
  type RefundSubmission,
} from "@/features/dashboard/pa-transactions/components/IssueRefundDialog";
import { LinkedTransactionsSection } from "@/features/dashboard/pa-transactions/components/LinkedTransactionsSection";
import { TransactionPaymentMethod } from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/pa-transactions/components/TransactionId";
import { PaymentTimeline } from "@/features/dashboard/pa-transactions/components/PaymentTimeline";
import { formatTimelineSteps } from "@/features/dashboard/pa-transactions/components/timelineStepFormatting";
import { validateRefund } from "@/features/dashboard/pa-transactions/financial/deriveFinancials";
import { deriveTimelineSteps } from "@/features/dashboard/pa-transactions/financial/generateTimeline";
import { formatNow } from "@/features/dashboard/pa-transactions/formatNow";
import { useDisputeResolutionFlow } from "@/features/dashboard/pa-transactions/useDisputeResolutionFlow";
import type { RefundEvent } from "@/features/dashboard/pa-transactions/financial/types";
import { useRefundEvents } from "@/stores/useRefundEvents";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

const EMPTY_REFUND_EVENTS: RefundEvent[] = [];

// This is the PARENT transaction's own page, it tells the story of the
// original payment and its overall (aggregate) state, see
// DisputeDetailFeature/RefundDetailFeature for a specific child event's own
// page. A dispute or refund is never opened here directly any more, see
// PaTransactionTable/TransactionDetailsDrawer/this file's own goToDetail,
// this page's only entry points are a plain "payment" row, "Back to
// Transaction", or a Linked Transactions row pointing at the parent itself.
const LIST_PATH = "/pa-transactions";
const PAGE_TITLE = "Transactions";
const BACK_LABEL = "Back to Transactions";
const NOT_FOUND_HINT = "Open this transaction from the Transactions list to view its details.";

interface TransactionDetailFeatureProps {
  transactionId: string;
}

export function TransactionDetailFeature({ transactionId }: TransactionDetailFeatureProps) {
  const router = useRouter();
  const transaction = useTransactionDetail((s) => s.transaction);
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  // Session-issued refunds not yet folded into transaction.refunds (see
  // useRefundEvents), merged with the transaction's own refunds inside
  // deriveTransactionDetail for every refundable/refunded-amount calculation
  // below.
  const refundEvents = useRefundEvents(
    (s) => s.eventsByTransactionId[transaction?.gid ?? ""] ?? EMPTY_REFUND_EVENTS
  );
  const addRefundEvent = useRefundEvents((s) => s.addRefundEvent);
  const [refundOpen, setRefundOpen] = useState(false);

  // Computed unconditionally (rules of hooks — useDisputeResolutionFlow
  // below calls useState), using a fallback transaction on the not-found
  // branch; deriveTransactionDetail already defaults every field it reads,
  // so a mostly-empty fallback object is safe here and this doubles as the
  // page's own `detail` after the not-found guard, no second call needed.
  const detail = deriveTransactionDetail(
    transaction ?? ({ gid: transactionId } as PaTransaction),
    refundEvents
  );
  const activeDisputeEvent = detail.financials.disputeEvents[0];

  // Same Accept/Contest workflow DisputeDetailFeature's own page runs (see
  // useDisputeResolutionFlow's own doc comment) — contesting or accepting a
  // dispute from THIS (parent) page must resolve it right here, never
  // detour through the dispute's own page first.
  const flow = useDisputeResolutionFlow({
    transaction: transaction ?? ({ gid: transactionId } as PaTransaction),
    disputeId: activeDisputeEvent?.id ?? "",
    amount: activeDisputeEvent?.amount ?? 0,
    currency: activeDisputeEvent?.currency || transaction?.txnCurrency || "INR",
  });

  if (!transaction || transaction.gid !== transactionId) {
    return (
      <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
        <div className="page-enter mx-auto max-w-350 space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Icon name="alert-circle" size={22} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Transaction not found</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{NOT_FOUND_HINT}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push(LIST_PATH)}>
              Go back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // The one combined status badge (see getDisplayStatus's own doc comment),
  // never the raw externalStatus directly, a refund/dispute on this same
  // transaction must be reflected here.
  const statusMeta = getDisplayStatus(transaction);
  const amount = parseFloat(transaction.totalAmount ?? "0");
  const currency = transaction.txnCurrency ?? "INR";
  const name = customerName(transaction) || "Unknown customer";
  const statusBucket = getDisplayStatusBucket(transaction);
  const showFeedback = statusBucket === "success";
  const formattedDateTime =
    formatDisplayDateTime(transaction.formattedCreationDateTime) ?? "Not available";

  // Sourced from the centralized financial derivation (see
  // deriveTransactionDetail/getRefundedAmount/getRemainingAmount) rather than
  // summed here, this is the single source of truth for what's already been
  // refunded and what's left to refund.
  const refundableAmount = detail.financials.remainingAmount;
  // Issue Refund belongs on this (parent) page whenever money actually
  // reached the merchant and some of it is still unaccounted for — not just
  // "success". A parent that's already Refunded and disputed (or Refund in
  // progress, or Disputed) still has this same page as its own detail view
  // (see this file's own top-of-file doc comment), and can still have
  // remaining amount left to refund, so only "pending" (money never
  // collected) and "failed" (payment never went through) buckets are
  // excluded — those two never have anything real to refund.
  const canRefund =
    statusBucket !== "pending" && statusBucket !== "failed" && refundableAmount > 0;
  const linkedTransactions = detail.linkedTransactions;
  // Hides the promotional banner while a dispute is active, and (below)
  // shows the same Dispute status/action card DisputeDetailFeature's own
  // page renders — a transaction that's Disputed, or Refunded and disputed,
  // must tell the exact same story here as it does on the dispute's own
  // page. Accepting/contesting runs right here too (see the `flow` hook
  // above), never a detour through the dispute's own page first.
  const isDisputed = detail.dispute !== null;
  const disputeAmount = activeDisputeEvent?.amount ?? 0;
  const disputeCurrency = activeDisputeEvent?.currency || currency;

  // Contesting/accepting swaps this whole page for the same
  // DisputeRespondForm DisputeDetailFeature's own page uses, exactly like
  // that page does — see useDisputeResolutionFlow's own doc comment.
  if (flow.disputeScreen === "respond") {
    return (
      <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
        <DisputeRespondForm
          mode={flow.respondMode}
          disputedAmount={disputeAmount}
          currency={disputeCurrency}
          onBack={flow.backToDetail}
          onSubmit={flow.handleRespondSubmit}
        />
      </div>
    );
  }

  // Settlement Details sits in the big left column and Payment Details in
  // the narrower sticky right column for every transaction in this (Payments
  // workflow) feature, regardless of status, the opposite of the original
  // left/right arrangement. Column widths themselves (1fr / 360px) are
  // unchanged, only which section lands in which.
  const paymentDetailsSection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Payment Details</SectionLabel>
      <Card className="gap-0 p-5">
        <div className="flex flex-col gap-5">
          <div className="group">
            <p className="text-xs text-muted-foreground">Transaction ID</p>
            <div className="mt-0.5">
              <CopyableCell
                value={truncateId(transaction.gid ?? "Not available")}
                copyValue={transaction.gid ?? ""}
                label="Transaction ID"
                monospace
                className="font-semibold text-foreground/85"
              />
            </div>
          </div>
          <div className="group">
            <p className="text-xs text-muted-foreground">Merchant Transaction ID</p>
            <div className="mt-0.5">
              <CopyableCell
                value={truncateId(detail.merchantTxnId)}
                copyValue={detail.merchantTxnId}
                label="Merchant Transaction ID"
                monospace
                className="font-semibold text-foreground/85"
              />
            </div>
          </div>
          <DetailRow label="Payment Category" value={detail.paymentCategory} />
          {detail.cardType && <DetailRow label="Card Type" value={detail.cardType} />}
          <DetailRow label="Issuer" value={detail.issuerBank} />
        </div>
      </Card>
    </div>
  );

  // One unified timeline covering the transaction's entire lifecycle
  // (payment, settlement, every refund, every dispute stage), built from the
  // exact same child events the header status is derived from, see
  // formatTimelineSteps's own doc comment. Renamed from "Settlement Details"
  // since it's no longer settlement-only, a refund or dispute must always be
  // visible here, not just settlement history. Always rendered, even for a
  // failed/still-pending payment, "Payment failed"/"Payment started" is
  // itself a real (single-step) timeline, not a reason to fall back to a
  // "not applicable" note.
  const settlementDetailsSection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Timeline</SectionLabel>
      <Card className="gap-0 p-5">
        <PaymentTimeline
          steps={formatTimelineSteps(
            deriveTimelineSteps(detail.financials),
            currency,
            goToSettlement
          )}
        />
      </Card>
    </div>
  );

  // Customer Details <-> Amount Breakdown swap, unconditional (unlike the
  // Payment/Settlement swap above), applies to every PA transaction in this
  // feature regardless of status.
  const customerDetailsSection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Customer Details</SectionLabel>
      <Card className="gap-0 p-5">
        <div className="flex flex-col gap-5">
          <DetailRow label="Customer Name" value={name} />
          <DetailRow label="Email ID" value={transaction.encEmailId ?? "Not available"} />
          <DetailRow label="Phone Number" value={detail.customerPhone} />
          <div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground/85">
              {detail.customerAddress}
            </p>
          </div>
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
    </div>
  );

  const amountBreakdownSection = detail.amountBreakdown && (
    <div className="flex flex-col gap-2">
      <SectionLabel>Payment Breakdown</SectionLabel>
      <Card className="gap-0 p-5">
        <AmountBreakdownBody
          amountReceived={detail.amountBreakdown.amountReceived}
          fee={detail.amountBreakdown.fee}
          refundedAmount={detail.amountBreakdown.refundedAmount}
          disputedAmount={detail.amountBreakdown.disputedAmount}
          netAmount={detail.amountBreakdown.netAmount}
          currency={currency}
        />
      </Card>
    </div>
  );

  function handleIssueRefund({ amount: refundAmount, reason, details }: RefundSubmission) {
    // Over-refund prevention: checked against every existing refund on this
    // transaction, mock-seeded and session-issued alike (detail.financials.
    // refundEvents is the merged set, see deriveTransactionDetail), not just
    // this session's own, so a transaction seeded with refunds close to its
    // limit can't be over-refunded through this dialog.
    const validation = validateRefund(amount, currency, detail.financials.refundEvents, {
      amount: refundAmount,
      currency,
    });
    if (!validation.ok) {
      toast.error("Refund not issued", { description: validation.reason });
      return;
    }

    const reasonLabel = reason.replace(/_/g, " ");
    const transactionId = transaction!.gid ?? "";

    // A child financial event on this same transaction, keyed by its own
    // gid, never a new merchant-facing transaction ID, see useRefundEvents.
    addRefundEvent(transactionId, {
      id: `${transactionId}-refund-${detail.financials.refundEvents.length + 1}`,
      transactionId,
      amount: refundAmount,
      currency,
      status: "PROCESSING",
      reason: reasonLabel,
      details,
      createdAt: formatNow(new Date()),
    });

    toast.success(`Refund of ${formatCurrency(refundAmount, currency)} issued`, {
      description: "This transaction's status has been updated to reflect the refund.",
    });
  }

  function goToDetail(row: PaTransaction) {
    // Linked Transactions rows are this transaction's own refund/dispute
    // children (see buildLinkedChildRows), each opens its own dedicated
    // detail view, never this same parent page again, see
    // RefundDetailFeature/DisputeDetailFeature.
    setStoredTransaction(transaction!);
    if (row.linkedRecordType === "refund") {
      router.push(
        `/pa-transactions/${encodeURIComponent(transaction!.gid ?? "")}/refunds/${encodeURIComponent(row.linkedRecordId ?? "")}`
      );
      return;
    }
    if (row.linkedRecordType === "dispute") {
      router.push(
        `/pa-transactions/${encodeURIComponent(transaction!.gid ?? "")}/disputes/${encodeURIComponent(row.linkedRecordId ?? "")}`
      );
      return;
    }
    router.push(`/pa-transactions/${encodeURIComponent(row.gid ?? "")}`);
  }

  function goToSettlement(settlementId: string) {
    router.push(`/reports/settlement-report/${encodeURIComponent(settlementId)}`);
  }

  return (
    <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
      <div className="page-enter mx-auto max-w-[1400px] space-y-5 overflow-x-hidden">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{PAGE_TITLE}</h1>

        <Button
          type="button"
          variant="link"
          leftIcon={<Icon name="chevron-left" size={14} />}
          onClick={() => router.push(LIST_PATH)}
          className="h-auto w-fit gap-1 p-0 text-sm font-medium"
        >
          {BACK_LABEL}
        </Button>

        {/* Amount, currency, status, date/time and payment method, then
         * charged-to, sits directly on the page background, no card. */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="flex items-baseline gap-2 text-4xl font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(amount, currency)}
                <span className="text-base font-medium text-muted-foreground">{currency}</span>
              </p>
              <StatusBadgeWithTooltip
                variant={statusMeta.variant}
                label={statusMeta.label}
                trailIcon={statusMeta.trailIcon}
                tooltip={statusMeta.tooltip}
                size="sm"
              />
            </div>
            {canRefund && (
              <Button type="button" variant="outline" size="sm" onClick={() => setRefundOpen(true)}>
                Issue Refund
              </Button>
            )}
          </div>

          {/* Same text-[13px] font-medium text-foreground as TransactionPaymentMethod's
           * own text and the Transactions table's Date & Time column, so nothing
           * in this row reads lighter/heavier than anything else. */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground">
            <span>{formattedDateTime}</span>
            <Separator orientation="vertical" className="h-3.5" />
            <TransactionPaymentMethod row={transaction} />
          </div>

          {isDisputed ? (
            <>
              <p className="mt-4 text-sm text-muted-foreground">
                Charged to <span className="font-semibold text-foreground/85">{name}</span>
              </p>
              <Separator className="mt-4" />
            </>
          ) : (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Charged to <span className="font-semibold text-foreground/85">{name}</span>
              </p>
            </>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Left column */}
          <div className="flex min-w-0 flex-col gap-4">
            {isDisputed && activeDisputeEvent && detail.dispute && (
              <div className="flex flex-col gap-2">
                <SectionLabel>Dispute</SectionLabel>
                <DisputeStatusCard
                  dispute={activeDisputeEvent}
                  disputeDetail={detail.dispute}
                  onAccept={flow.handleAcceptDispute}
                  onContest={flow.handleContestDispute}
                  submittedDocuments={flow.submittedDocuments}
                />
              </div>
            )}

            {settlementDetailsSection}

            {!isDisputed && <ReferAndEarnBanner />}

            {showFeedback && <ProductFeedback key={transaction.gid} />}

            {amountBreakdownSection}

            <div className="flex flex-col gap-2">
              <SectionLabel>Linked Transactions</SectionLabel>
              <LinkedTransactionsSection
                transactions={linkedTransactions}
                onViewDetails={goToDetail}
              />
            </div>
          </div>

          {/* Right column, sticky */}
          <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
            {paymentDetailsSection}

            {customerDetailsSection}

            <div className="flex flex-col gap-2">
              <SectionLabel>Status Notes</SectionLabel>
              <Card
                className={cn(
                  "gap-5 p-5",
                  statusMeta.variant === "danger" && "border-red-200 dark:border-red-900/50"
                )}
              >
                <DetailRow label="Reason" value={detail.statusReason} />
                {detail.errorCode && <DetailRow label="Error Code" value={detail.errorCode} />}
              </Card>
            </div>
          </div>
        </div>

        <IssueRefundDialog
          open={refundOpen}
          onOpenChange={setRefundOpen}
          currency={currency}
          refundableAmount={refundableAmount}
          onSubmit={handleIssueRefund}
        />

        {isDisputed && activeDisputeEvent && (
          <DisputeAcceptChoice
            open={flow.acceptDialogOpen}
            onOpenChange={flow.setAcceptDialogOpen}
            amount={disputeAmount}
            currency={disputeCurrency}
            onAcceptFull={flow.handleConfirmAcceptFull}
            onAcceptPartially={flow.handleAcceptPartially}
          />
        )}
      </div>
    </div>
  );
}
