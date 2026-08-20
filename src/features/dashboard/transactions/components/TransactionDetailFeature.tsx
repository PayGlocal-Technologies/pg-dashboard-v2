"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Separator, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { ProductFeedback } from "@/components/common/ProductFeedback";
import { ReferAndEarnBanner } from "@/components/common/ReferAndEarnBanner";
import { CopyableCell } from "@/components/common/CopyableCell";
import {
  customerName,
  formatDisplayDateTime,
  getStatusBucket,
  getStatusMeta,
} from "@/features/dashboard/transactions/paColumns";
import {
  deriveTransactionDetail,
  type TransactionDetailView,
} from "@/features/dashboard/transactions/deriveTransactionDetail";
import {
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import { AmountBreakdownBody } from "@/features/dashboard/transactions/components/AmountBreakdownBody";
import {
  IssueRefundDialog,
  type RefundSubmission,
} from "@/features/dashboard/transactions/components/IssueRefundDialog";
import { SettlementNotApplicableNote } from "@/features/dashboard/transactions/components/SettlementDetailsBody";
import { LinkedTransactionsSection } from "@/features/dashboard/transactions/components/LinkedTransactionsSection";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/transactions/components/TransactionId";
import { DisputeActionCard } from "@/features/dashboard/transactions/components/DisputeActionCard";
import { DisputeStatusNoticeCard } from "@/features/dashboard/transactions/components/DisputeStatusNoticeCard";
import { DisputeDetailsCard } from "@/features/dashboard/transactions/components/DisputeDetailsCard";
import { DisputeAcceptChoice } from "@/features/dashboard/transactions/components/DisputeAcceptChoice";
import {
  DisputeRespondForm,
  type DisputeRespondMode,
} from "@/features/dashboard/transactions/components/DisputeRespondForm";
import {
  PaymentTimeline,
  type TimelineStep,
} from "@/features/dashboard/transactions/components/PaymentTimeline";
import type { DisputeDetail } from "@/features/dashboard/transactions/deriveTransactionDetail";
import { useDisputeResolutions } from "@/stores/useDisputeResolutions";
import { useIssuedRefunds } from "@/stores/useIssuedRefunds";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const EMPTY_REFUNDS: PaTransaction[] = [];

export type TransactionDetailOrigin = "transactions" | "dispute-management";

const ORIGIN_COPY: Record<
  TransactionDetailOrigin,
  { listPath: string; pageTitle: string; backLabel: string; notFoundHint: string }
> = {
  transactions: {
    listPath: "/transactions",
    pageTitle: "Transactions",
    backLabel: "Back to Transactions",
    notFoundHint: "Open this transaction from the Transactions list to view its details.",
  },
  "dispute-management": {
    listPath: "/dispute-management",
    pageTitle: "Dispute Details",
    backLabel: "Back to Dispute Management",
    notFoundHint: "Open this dispute from the Dispute Management list to view its details.",
  },
};

/** Payment Timeline steps for a disputed transaction, branches on the raw
 * status (not the "disputed" bucket, every dispute sub-status shares that
 * bucket) to show the right stage as "current" vs "complete". */
function buildDisputeTimelineSteps(
  transaction: PaTransaction,
  dispute: DisputeDetail
): TimelineStep[] {
  const rawStatus = transaction.externalStatus?.toUpperCase().replace(/ /g, "_") ?? "";
  const steps: TimelineStep[] = [
    {
      label: "Payment started",
      description: transaction.formattedCreationDateTime,
      state: "complete",
    },
    {
      label: "Payment captured",
      description: transaction.formattedCreationDateTime,
      state: "complete",
    },
    { label: "Payment disputed", description: dispute.raisedOn, state: "complete" },
  ];

  if (rawStatus === "WON" || rawStatus === "LOST") {
    steps.push({
      label: "Under review",
      description: "Evidence reviewed by the card network",
      state: "complete",
    });
    steps.push(
      rawStatus === "WON"
        ? {
            label: "Dispute won",
            description: `Funds retained, resolved ${dispute.respondBy}`,
            state: "complete",
          }
        : {
            label: "Dispute lost",
            description: `Refunded to cardholder, resolved ${dispute.respondBy}`,
            state: "danger",
          }
    );
  } else if (rawStatus === "UNDER_REVIEW") {
    steps.push({
      label: "Under review",
      description: "Evidence submitted, awaiting the card network's decision",
      state: "current",
    });
  } else {
    // DISPUTED / NEEDS_ACTION, still awaiting a merchant response.
    steps.push({
      label: "Awaiting your response",
      description: `Respond by ${dispute.respondBy}`,
      state: "current",
    });
  }

  return steps;
}

type StepState = "complete" | "current" | "pending";

interface SettlementStepperProps {
  settlement: Extract<TransactionDetailView["settlement"], { applicable: true }>;
  initiatedOn?: string;
  onViewSettlement: (settlementId: string) => void;
}

/** Same complete/current/pending visual language as SettlementTimeline
 * (emerald check / amber clock / muted dot, connecting line), a fresh, small
 * local version rather than importing that component directly, since a PA
 * transaction's settlement journey (2 steps) doesn't share a data shape with
 * a settlement batch's (5 steps, compliance review, FX conversion, etc). */
function SettlementStepper({ settlement, initiatedOn, onViewSettlement }: SettlementStepperProps) {
  const isSettled = settlement.isSettled;
  const steps: { label: string; description?: ReactNode; state: StepState }[] = [
    { label: "Payment captured", description: initiatedOn, state: "complete" },
    {
      label: isSettled ? "Settled" : "Settlement in progress",
      description: isSettled ? (
        <span className="flex flex-wrap items-center gap-x-1.5">
          <span>{settlement.settledOnDate}</span>
          <span aria-hidden="true">·</span>
          <span>{settlement.utrNumber}</span>
          <Button
            type="button"
            variant="link"
            onClick={() => onViewSettlement(settlement.settlementId)}
            className="h-auto min-h-0 p-0 text-xs font-medium"
          >
            View settlement
          </Button>
        </span>
      ) : (
        settlement.expectedOnDate
      ),
      state: isSettled ? "complete" : "current",
    },
  ];

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.label} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full",
                  step.state === "complete" && "bg-emerald-500 text-white",
                  step.state === "current" && "bg-amber-500 text-white"
                )}
              >
                {step.state === "complete" && (
                  <Icon name="check" size={12} strokeWidth={3} aria-hidden />
                )}
                {step.state === "current" && <Icon name="clock" size={11} aria-hidden />}
              </span>
              {!isLast && <div aria-hidden="true" className="my-1 w-px flex-1 bg-primary" />}
            </div>
            <div className={cn("min-w-0", !isLast && "pb-5")}>
              <p className="text-sm font-semibold text-foreground/85">{step.label}</p>
              {step.description && (
                <div className="text-xs text-muted-foreground">{step.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface TransactionDetailFeatureProps {
  transactionId: string;
  /** Where this page was reached from, controls the header text, back-link
   * label/target and not-found copy, without changing anything else about
   * the detail view itself. Defaults to "transactions". */
  origin?: TransactionDetailOrigin;
}

export function TransactionDetailFeature({
  transactionId,
  origin = "transactions",
}: TransactionDetailFeatureProps) {
  const router = useRouter();
  const { listPath: LIST_PATH, pageTitle, backLabel, notFoundHint } = ORIGIN_COPY[origin];
  const transaction = useTransactionDetail((s) => s.transaction);
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  const issuedRefunds = useIssuedRefunds(
    (s) => s.refundsByParentGid[transaction?.gid ?? ""] ?? EMPTY_REFUNDS
  );
  const addRefund = useIssuedRefunds((s) => s.addRefund);
  const resolveDispute = useDisputeResolutions((s) => s.resolveDispute);
  const [refundOpen, setRefundOpen] = useState(false);
  // "Accept dispute" opens this pop-up (full vs. partial), it doesn't
  // replace the page, "Contest dispute" skips straight to the "respond"
  // screen in contest mode.
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  // Which "screen" of the dispute-response workflow is showing, replaces the
  // whole page (not an overlay).
  const [disputeScreen, setDisputeScreen] = useState<"detail" | "respond">("detail");
  const [respondMode, setRespondMode] = useState<DisputeRespondMode>("contest");

  if (!transaction || transaction.gid !== transactionId) {
    return (
      <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
        <div className="page-enter mx-auto max-w-[1400px] space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Icon name="alert-circle" size={22} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Transaction not found</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{notFoundHint}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push(LIST_PATH)}>
              Go back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const detail = deriveTransactionDetail(transaction);
  const statusMeta = getStatusMeta(transaction.externalStatus);
  const amount = parseFloat(transaction.totalAmount ?? "0");
  const currency = transaction.txnCurrency ?? "INR";
  const name = customerName(transaction) || "Unknown customer";
  const showFeedback = getStatusBucket(transaction.externalStatus) === "success";
  const formattedDateTime =
    formatDisplayDateTime(transaction.formattedCreationDateTime) ?? "Not available";

  const alreadyRefunded = issuedRefunds.reduce(
    (sum, r) => sum + parseFloat(r.totalAmount ?? "0"),
    0
  );
  const refundableAmount = Math.max(amount - alreadyRefunded, 0);
  const canRefund = showFeedback && refundableAmount > 0;
  const linkedTransactions = [...detail.linkedTransactions, ...issuedRefunds];
  const isDisputed = getStatusBucket(transaction.externalStatus) === "disputed";
  // "Awaiting a decision" (DISPUTED/NEEDS_ACTION) still shows the Accept/
  // Contest actions. "UNDER_REVIEW" and "LOST" have already been decided, a
  // lost dispute in particular can't be contested any more (it was accepted
  // in full, per handleConfirmAcceptFull), so both show a plain status
  // notice in the same slot instead (see DisputeStatusNoticeCard).
  const rawDisputeStatus = transaction.externalStatus?.toUpperCase().replace(/ /g, "_") ?? "";
  const disputeAwaitingDecision =
    rawDisputeStatus !== "UNDER_REVIEW" && rawDisputeStatus !== "LOST";

  function backToDisputeDetails() {
    setDisputeScreen("detail");
  }

  function handleConfirmAcceptFull() {
    resolveDispute(transaction!.gid ?? "", "LOST");
    setStoredTransaction({ ...transaction!, externalStatus: "LOST" });
    toast.success("Dispute marked as lost", {
      description: `${formatCurrency(amount, currency)} ${currency} has been refunded to the cardholder.`,
    });
    router.push(LIST_PATH);
  }

  if (disputeScreen === "respond") {
    return (
      <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
        <DisputeRespondForm
          mode={respondMode}
          disputedAmount={amount}
          currency={currency}
          onBack={backToDisputeDetails}
          onSubmit={() => {
            resolveDispute(transaction!.gid ?? "", "UNDER_REVIEW");
            setStoredTransaction({ ...transaction!, externalStatus: "UNDER_REVIEW" });
            toast.success("Documents uploaded", {
              description: "Your dispute is now under review.",
            });
            setDisputeScreen("detail");
          }}
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

  // Disputed transactions turn this card into a Payment Timeline (tracking
  // when the dispute was raised and every stage since) instead of the usual
  // settlement stepper, same position in the left column either way.
  const settlementDetailsSection =
    isDisputed && detail.dispute ? (
      <div className="flex flex-col gap-2">
        <SectionLabel>Timeline</SectionLabel>
        <Card className="gap-0 p-5">
          <PaymentTimeline steps={buildDisputeTimelineSteps(transaction, detail.dispute)} />
        </Card>
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        <SectionLabel>Settlement Details</SectionLabel>
        <Card className="gap-0 p-5">
          {detail.settlement.applicable ? (
            <SettlementStepper
              settlement={detail.settlement}
              initiatedOn={transaction.formattedCreationDateTime}
              onViewSettlement={goToSettlement}
            />
          ) : (
            <SettlementNotApplicableNote />
          )}
        </Card>
      </div>
    );

  // Right-column addition, only for disputed transactions, sits above
  // Payment Details (mirrors the reference: dispute-specific info first,
  // generic payment info below).
  const disputeDetailsSection = isDisputed && detail.dispute && (
    <DisputeDetailsCard dispute={detail.dispute} transaction={transaction} currency={currency} />
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
          netAmount={detail.amountBreakdown.netAmount}
          currency={currency}
        />
      </Card>
    </div>
  );

  function handleAcceptDispute() {
    setAcceptDialogOpen(true);
  }

  function handleContestDispute() {
    // Same DisputeRespondForm as "Accept partially", just without the
    // contest-amount field (contesting the full amount, nothing accepted).
    setRespondMode("contest");
    setDisputeScreen("respond");
  }

  function handleLearnMore() {
    toast.message("Learn how to respond to disputes", {
      description: "This action isn't wired up yet.",
    });
  }

  function handleIssueRefund({ amount: refundAmount, reason, details }: RefundSubmission) {
    const reasonLabel = reason.replace(/_/g, " ");
    const refundTxn: PaTransaction = {
      ...transaction!,
      gid: `${transaction!.gid ?? "TXN"}-RF${Date.now().toString(36)}`,
      externalStatus: "SENT_FOR_REFUND",
      totalAmount: String(refundAmount),
      message: details || `Refund issued: ${reasonLabel}`,
      parentTransaction: transaction!,
    };
    addRefund(transaction!.gid ?? "", refundTxn);
    toast.success(`Refund of ${formatCurrency(refundAmount, currency)} issued`, {
      description: "A new linked transaction has been created for this refund.",
    });
  }

  function goToDetail(row: PaTransaction) {
    setStoredTransaction(row);
    router.push(`/transactions/${encodeURIComponent(row.gid ?? "")}`);
  }

  function goToSettlement(settlementId: string) {
    router.push(`/reports/settlement-report/${encodeURIComponent(settlementId)}`);
  }

  return (
    <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
      <div className="page-enter mx-auto max-w-[1400px] space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>

        <Button
          type="button"
          variant="link"
          leftIcon={<Icon name="chevron-left" size={14} />}
          onClick={() => router.push(LIST_PATH)}
          className="h-auto w-fit gap-1 p-0 text-sm font-medium"
        >
          {backLabel}
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
              <StatusBadge
                variant={statusMeta.variant}
                label={statusMeta.label}
                trailIcon={statusMeta.trailIcon}
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
          <div className="flex flex-col gap-4">
            {isDisputed && detail.dispute && (
              <div className="flex flex-col gap-2">
                {/* SectionLabel here (matching every other section) isn't just
                 * cosmetic, without it this card started flush at the top while
                 * Dispute Details on the right began below its own label,
                 * misaligning the two columns. */}
                <SectionLabel>Dispute</SectionLabel>
                {disputeAwaitingDecision ? (
                  <DisputeActionCard
                    description={detail.dispute.description}
                    onLearnMore={handleLearnMore}
                    onAccept={handleAcceptDispute}
                    onContest={handleContestDispute}
                  />
                ) : rawDisputeStatus === "LOST" ? (
                  <DisputeStatusNoticeCard
                    icon="check-circle"
                    iconClassName="bg-muted text-muted-foreground"
                    title="Dispute closed"
                    description="You accepted this dispute and a refund was initiated to the cardholder. This dispute is now closed."
                  />
                ) : (
                  <DisputeStatusNoticeCard
                    icon="check-circle"
                    iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    title="Documents submitted"
                    description="Your evidence has been submitted and this dispute is now under review by the card network."
                  />
                )}
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
          <div className="flex flex-col gap-4 lg:sticky lg:top-4">
            {disputeDetailsSection}

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

        <DisputeAcceptChoice
          open={acceptDialogOpen}
          onOpenChange={setAcceptDialogOpen}
          amount={amount}
          currency={currency}
          onAcceptFull={handleConfirmAcceptFull}
          onAcceptPartially={() => {
            setRespondMode("partial");
            setDisputeScreen("respond");
          }}
        />
      </div>
    </div>
  );
}
