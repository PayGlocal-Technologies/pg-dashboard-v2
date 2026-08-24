"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { ReferAndEarnBanner } from "@/components/common/ReferAndEarnBanner";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { CopyableCell } from "@/components/common/CopyableCell";
import {
  customerName,
  formatDisplayDateTime,
  getStatusMeta,
} from "@/features/dashboard/transactions/paColumns";
import {
  deriveTransactionDetail,
  type DisputeDetail,
} from "@/features/dashboard/transactions/deriveTransactionDetail";
import { getDisputeReasonMeta } from "@/features/dashboard/transactions/disputeReasonMeta";
import {
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import { AmountBreakdownBody } from "@/features/dashboard/transactions/components/AmountBreakdownBody";
import { LinkedTransactionsSection } from "@/features/dashboard/transactions/components/LinkedTransactionsSection";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/transactions/components/TransactionId";
import { DisputeActionCard } from "@/features/dashboard/transactions/components/DisputeActionCard";
import { DisputeStatusNoticeCard } from "@/features/dashboard/transactions/components/DisputeStatusNoticeCard";
import type { DisputeFormStep } from "@/features/dashboard/transactions/components/DisputeFormTimelineCard";
import { DisputeDetailsCard } from "@/features/dashboard/transactions/components/DisputeDetailsCard";
import { DisputeAcceptChoice } from "@/features/dashboard/transactions/components/DisputeAcceptChoice";
import {
  DisputeRespondForm,
  type DisputeRespondMode,
} from "@/features/dashboard/transactions/components/DisputeRespondForm";
import { PaymentTimeline } from "@/features/dashboard/transactions/components/PaymentTimeline";
import { formatTimelineSteps } from "@/features/dashboard/transactions/components/timelineStepFormatting";
import { deriveDisputeOnlyTimelineSteps } from "@/features/dashboard/transactions/financial/generateTimeline";
import { getDisputeDetailLinkedRows } from "@/features/dashboard/transactions/linkedChildRecords";
import { formatNow } from "@/features/dashboard/transactions/formatNow";
import { withDisputeStatus } from "@/features/dashboard/transactions/withDisputeStatus";
import { useDisputeResolutions } from "@/stores/useDisputeResolutions";
import { useRefundEvents } from "@/stores/useRefundEvents";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { RefundEvent } from "@/features/dashboard/transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const EMPTY_REFUND_EVENTS: RefundEvent[] = [];

export type DisputeDetailOrigin = "transactions" | "dispute-management";

const ORIGIN_COPY: Record<
  DisputeDetailOrigin,
  { listPath: string; backLabel: string; notFoundHint: string }
> = {
  transactions: {
    listPath: "/transactions",
    backLabel: "Back to Transactions",
    notFoundHint: "Open this dispute from the Transactions list to view its details.",
  },
  "dispute-management": {
    listPath: "/dispute-management",
    backLabel: "Back to Dispute Management",
    notFoundHint: "Open this dispute from the Dispute Management list to view its details.",
  },
};

interface DisputeDetailFeatureProps {
  transactionId: string;
  disputeId: string;
  /** Defaults to "transactions". See ORIGIN_COPY, controls only the back-
   * link target/copy, matching TransactionDetailFeature's own origin prop. */
  origin?: DisputeDetailOrigin;
}

/** Full-page detail view for a single dispute, a child financial event of
 * `transactionId` (see PaTransaction.disputes), never an independent
 * payment of its own. Distinct from the parent transaction's own page
 * (TransactionDetailFeature): this page tells the story of THIS dispute
 * (its reason/code/timeline/actions), the parent's Linked Transactions
 * shows it as one of possibly several children, this page's own Linked
 * Transactions shows the parent plus any sibling refund on the same parent
 * (see getDisputeDetailLinkedRows), never itself. */
export function DisputeDetailFeature({
  transactionId,
  disputeId,
  origin = "transactions",
}: DisputeDetailFeatureProps) {
  const router = useRouter();
  const { listPath: LIST_PATH, backLabel, notFoundHint } = ORIGIN_COPY[origin];
  const transaction = useTransactionDetail((s) => s.transaction);
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  const refundEvents = useRefundEvents(
    (s) => s.eventsByTransactionId[transaction?.gid ?? ""] ?? EMPTY_REFUND_EVENTS
  );
  const resolveDispute = useDisputeResolutions((s) => s.resolveDispute);

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [disputeScreen, setDisputeScreen] = useState<"detail" | "respond">("detail");
  const [respondMode, setRespondMode] = useState<DisputeRespondMode>("contest");
  const [submittedDocuments, setSubmittedDocuments] = useState<string[]>([]);

  const dispute =
    transaction?.gid === transactionId
      ? transaction.disputes?.find((d) => d.id === disputeId)
      : undefined;

  if (!transaction || transaction.gid !== transactionId || !dispute) {
    return (
      <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
        <div className="page-enter mx-auto max-w-350 space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Icon name="alert-circle" size={22} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dispute not found</h3>
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

  const detail = deriveTransactionDetail(transaction, refundEvents);
  const amount = dispute.amount;
  const currency = dispute.currency || transaction.txnCurrency || "INR";
  // This dispute's own status badge, not the parent's aggregate (see
  // getDisplayStatus on the parent page), reuses the exact existing
  // DISPUTED/NEEDS_ACTION/UNDER_REVIEW/INSUFFICIENT_DOCUMENTS/WON/LOST
  // labels.
  const statusMeta = getStatusMeta(dispute.status);
  const isUnderBankReview = dispute.reviewPhase === "BANK_REVIEW";
  const name = customerName(transaction) || "Unknown customer";
  const formattedDateTime = formatDisplayDateTime(dispute.raisedOn) ?? "Not available";

  // Built directly from THIS dispute (matched by disputeId), never
  // detail.dispute (which always points at disputeEvents[0] and could be a
  // different dispute if this transaction ever had more than one).
  const disputeDetail: DisputeDetail = {
    disputeId: dispute.id,
    amount: dispute.amount,
    reason: dispute.reason,
    reasonCode: dispute.reasonCode,
    merchantLabel: getDisputeReasonMeta(dispute.reason).merchantLabel,
    description: dispute.description,
    raisedOn: dispute.raisedOn,
    respondBy: dispute.respondBy ?? dispute.raisedOn,
  };

  // "Action required" covers both raw statuses that mean the same thing to
  // the merchant (see PA_STATUS_META): a freshly raised dispute awaiting
  // accept/contest, or one where documents still need to be uploaded.
  // INSUFFICIENT_DOCUMENTS also needs the merchant to act, but is its own
  // distinct notice (re-upload, not a first-time accept/contest choice), so
  // it's excluded here and handled in its own branch below.
  const disputeAwaitingDecision =
    dispute.status === "DISPUTED" || dispute.status === "NEEDS_ACTION";

  const underReviewSteps: DisputeFormStep[] | undefined =
    dispute.status === "UNDER_REVIEW"
      ? [
          {
            label: "Chargeback",
            description: formatDisplayDateTime(dispute.raisedOn) ?? dispute.raisedOn,
            state: "complete",
          },
          {
            label: "Merchant Response",
            description: "Upload supporting documents before the response deadline.",
            state: "complete",
          },
          {
            label: "Evidence Submitted",
            description: "Your supporting evidence has been received and queued for review.",
            state: "complete",
          },
          {
            label: "PayGlocal Review",
            description: isUnderBankReview
              ? "Your evidence was reviewed and a representation was prepared for the issuing bank."
              : "PayGlocal will review your evidence and prepare a representation for submission to the issuing bank.",
            state: isUnderBankReview ? "complete" : "current",
          },
          {
            label: "Bank Review",
            description:
              "The issuing bank may take up to approximately 60 business days to review the submitted evidence and issue a decision.",
            state: isUnderBankReview ? "current" : "locked",
          },
          {
            label: "Final Decision",
            description:
              "If the decision is in your favour, the dispute will close successfully. Otherwise, depending on the card network's process, the case may proceed to Pre-Arbitration.",
            state: "locked",
          },
          { label: "Closed", description: "", state: "locked" },
        ]
      : undefined;

  function backToDisputeDetails() {
    setDisputeScreen("detail");
  }

  function handleConfirmAcceptFull() {
    resolveDispute(transaction!.gid ?? "", "LOST");
    setStoredTransaction(
      withDisputeStatus(transaction!, disputeId, "LOST", undefined, formatNow(new Date()))
    );
    toast.success("Dispute marked as lost", {
      description: `${formatCurrency(amount, currency)} ${currency} has been refunded to the cardholder.`,
    });
    router.push(LIST_PATH);
  }

  function handleAcceptDispute() {
    setAcceptDialogOpen(true);
  }

  function handleContestDispute() {
    setRespondMode("contest");
    setDisputeScreen("respond");
  }

  function handleLearnMore() {
    toast.message("Learn how to respond to disputes", {
      description: "This action isn't wired up yet.",
    });
  }

  function goToLinked(row: PaTransaction) {
    setStoredTransaction(transaction!);
    if (row.linkedRecordType === "refund") {
      router.push(
        `/transactions/${encodeURIComponent(transaction!.gid ?? "")}/refunds/${encodeURIComponent(row.linkedRecordId ?? "")}`
      );
      return;
    }
    router.push(`/transactions/${encodeURIComponent(row.gid ?? "")}`);
  }

  if (disputeScreen === "respond") {
    return (
      <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
        <DisputeRespondForm
          mode={respondMode}
          disputedAmount={amount}
          currency={currency}
          onBack={backToDisputeDetails}
          onSubmit={(documentNames) => {
            resolveDispute(transaction!.gid ?? "", "UNDER_REVIEW");
            setStoredTransaction(
              withDisputeStatus(transaction!, disputeId, "UNDER_REVIEW", documentNames)
            );
            setSubmittedDocuments(documentNames);
            toast.success("Documents uploaded", {
              description: "Your dispute is now under review.",
            });
            setDisputeScreen("detail");
          }}
        />
      </div>
    );
  }

  const linkedTransactions = getDisputeDetailLinkedRows(transaction);

  const timelineSteps = formatTimelineSteps(
    deriveDisputeOnlyTimelineSteps(detail.financials, disputeId),
    currency,
    () => {}
  );

  return (
    <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
      <div className="page-enter mx-auto max-w-350 space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dispute Details</h1>

        <Button
          type="button"
          variant="link"
          leftIcon={<Icon name="chevron-left" size={14} />}
          onClick={() => router.push(LIST_PATH)}
          className="h-auto w-fit gap-1 p-0 text-sm font-medium"
        >
          {backLabel}
        </Button>

        <div>
          <div className="flex flex-wrap items-center gap-3">
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

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground">
            <span>{formattedDateTime}</span>
            <Separator orientation="vertical" className="h-3.5" />
            <TransactionPaymentMethod row={transaction} />
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Charged to <span className="font-semibold text-foreground/85">{name}</span>
          </p>
          <Separator className="mt-4" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <SectionLabel>Dispute</SectionLabel>
              {disputeAwaitingDecision ? (
                <DisputeActionCard
                  merchantLabel={disputeDetail.merchantLabel}
                  reasonCode={dispute.reasonCode}
                  reason={dispute.reason}
                  description={dispute.description}
                  onLearnMore={handleLearnMore}
                  onAccept={handleAcceptDispute}
                  onContest={handleContestDispute}
                />
              ) : dispute.status === "WON" ? (
                <DisputeStatusNoticeCard
                  icon="check-circle"
                  iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  title="Dispute won"
                  description="You successfully contested this dispute, the disputed amount stays with you. This dispute is now closed."
                />
              ) : dispute.status === "LOST" ? (
                <DisputeStatusNoticeCard
                  icon="check-circle"
                  iconClassName="bg-muted text-muted-foreground"
                  title="Dispute closed"
                  description="You accepted this dispute and a refund was initiated to the cardholder. This dispute is now closed."
                />
              ) : dispute.status === "INSUFFICIENT_DOCUMENTS" ? (
                <DisputeStatusNoticeCard
                  icon="alert-triangle"
                  iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
                  title="Insufficient documents"
                  description="We need more information to investigate this dispute. Please upload additional documents to submit more supporting evidence."
                  documents={dispute.documents}
                  action={{ label: "Upload documents", onClick: handleContestDispute }}
                />
              ) : (
                <DisputeStatusNoticeCard
                  icon="clock"
                  iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  title={isUnderBankReview ? "Bank is reviewing your evidence" : "Under review"}
                  description={
                    isUnderBankReview
                      ? "Bank is reviewing the evidence. We'll notify you when we have a decision from the bank."
                      : "Your documents have been submitted and will be reviewed."
                  }
                  documents={submittedDocuments.length > 0 ? submittedDocuments : dispute.documents}
                  steps={underReviewSteps}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Timeline</SectionLabel>
              <Card className="gap-0 p-5">
                <PaymentTimeline steps={timelineSteps} />
              </Card>
            </div>

            <ReferAndEarnBanner />

            {detail.amountBreakdown && (
              <div className="flex flex-col gap-2">
                <SectionLabel>Payment Breakdown</SectionLabel>
                <Card className="gap-0 p-5">
                  <AmountBreakdownBody
                    amountReceived={detail.amountBreakdown.amountReceived}
                    fee={detail.amountBreakdown.fee}
                    refundedAmount={detail.amountBreakdown.refundedAmount}
                    disputedAmount={detail.amountBreakdown.disputedAmount}
                    netAmount={detail.amountBreakdown.netAmount}
                    currency={transaction.txnCurrency ?? currency}
                  />
                </Card>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <SectionLabel>Linked Transactions</SectionLabel>
              <LinkedTransactionsSection
                transactions={linkedTransactions}
                onViewDetails={goToLinked}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-4">
            <DisputeDetailsCard
              dispute={disputeDetail}
              transaction={transaction}
              currency={currency}
            />

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
                  <DetailRow label="Payment Category" value={detail.paymentCategory} />
                  {detail.cardType && <DetailRow label="Card Type" value={detail.cardType} />}
                  <DetailRow label="Issuer" value={detail.issuerBank} />
                </div>
              </Card>
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Customer Details</SectionLabel>
              <Card className="gap-0 p-5">
                <div className="flex flex-col gap-5">
                  <DetailRow label="Customer Name" value={name} />
                  <DetailRow label="Email ID" value={transaction.encEmailId ?? "Not available"} />
                  <DetailRow label="Phone Number" value={detail.customerPhone} />
                </div>
              </Card>
            </div>
          </div>
        </div>

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
