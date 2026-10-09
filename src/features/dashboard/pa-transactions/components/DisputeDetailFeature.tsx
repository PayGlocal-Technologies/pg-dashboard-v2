"use client";

import { useRouter } from "next/navigation";
import { Button, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { CopyableCell } from "@/components/common/CopyableCell";
import {
  customerName,
  formatDisplayDateTime,
  getDisputeStatusMeta,
} from "@/features/dashboard/pa-transactions/paColumns";
import { DISPUTE_PHASE_META } from "@/features/dashboard/pa-transactions/status/disputeStatus";
import {
  deriveTransactionDetail,
  type DisputeDetail,
} from "@/features/dashboard/pa-transactions/deriveTransactionDetail";
import { getDisputeReasonMeta } from "@/features/dashboard/pa-transactions/disputeReasonMeta";
import {
  DetailBackLink,
  DetailRow,
  DetailSection,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { AmountBreakdownBody } from "@/features/dashboard/pa-transactions/components/AmountBreakdownBody";
import { LinkedTransactionsSection } from "@/features/dashboard/pa-transactions/components/LinkedTransactionsSection";
import {
  CardNetworkLogo,
  PaymentCategoryLogo,
  TransactionPaymentMethod,
} from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { BankName } from "@/components/common/BankLogo";
import { truncateId } from "@/features/dashboard/pa-transactions/components/TransactionId";
import { DisputeStatusCard } from "@/features/dashboard/pa-transactions/components/DisputeStatusCard";
import { DisputeDetailsCard } from "@/features/dashboard/pa-transactions/components/DisputeDetailsCard";
import { DisputeAcceptChoice } from "@/features/dashboard/pa-transactions/components/DisputeAcceptChoice";
import { DisputeRespondForm } from "@/features/dashboard/pa-transactions/components/DisputeRespondForm";
import { DisputeConfirmDialog } from "@/features/dashboard/pa-transactions/components/DisputeConfirmDialog";
import { formatFee, stageOf } from "@/features/dashboard/pa-transactions/status/disputeStages";
import {
  PaymentTimeline,
  type TimelineStep,
} from "@/features/dashboard/pa-transactions/components/PaymentTimeline";
import type { DisputeEvent } from "@/features/dashboard/pa-transactions/financial/types";
import { formatTimelineSteps } from "@/features/dashboard/pa-transactions/components/timelineStepFormatting";
import { deriveDisputeOnlyTimelineSteps } from "@/features/dashboard/pa-transactions/financial/generateTimeline";
import { getDisputeDetailLinkedRows } from "@/features/dashboard/pa-transactions/linkedChildRecords";
import { useDisputeResolutionFlow } from "@/features/dashboard/pa-transactions/useDisputeResolutionFlow";
import { useRefundEvents } from "@/stores/useRefundEvents";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { RefundEvent } from "@/features/dashboard/pa-transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

const EMPTY_REFUND_EVENTS: RefundEvent[] = [];

export type DisputeDetailOrigin = "transactions" | "dispute-management";

const ORIGIN_COPY: Record<
  DisputeDetailOrigin,
  { listPath: string; backLabel: string; notFoundHint: string; pageTitle: string }
> = {
  // Reached from the Transactions list — this page is one status a
  // transaction can be in, not a separate "Dispute" object as far as the
  // merchant is concerned there, so the title stays "Transaction Details"
  // like every other pa-transactions detail page, never the word "Dispute".
  transactions: {
    listPath: "/pa-transactions",
    backLabel: "Back to Transactions",
    notFoundHint: "Open this dispute from the Transactions list to view its details.",
    pageTitle: "Transaction Details",
  },
  "dispute-management": {
    listPath: "/dispute-management",
    backLabel: "Back to Dispute Management",
    notFoundHint: "Open this dispute from the Dispute Management list to view its details.",
    pageTitle: "Dispute Details",
  },
};

interface DisputeDetailFeatureProps {
  transactionId: string;
  disputeId: string;
  /** Defaults to "transactions". See ORIGIN_COPY, controls only the back-
   * link target/copy, matching TransactionDetailFeature's own origin prop. */
  origin?: DisputeDetailOrigin;
}

/**
 * The dispute's own timeline, plus the escalation steps the "Pre-arb and
 * arb" design shows: the move to pre-arbitration or arbitration, a partial
 * accept, a withdrawal (instead of a plain "Dispute lost"), and any fee
 * charged on closing.
 */
function withEscalationSteps(steps: TimelineStep[], dispute: DisputeEvent): TimelineStep[] {
  const stage = stageOf(dispute);
  const out = [...steps];
  const raisedAt = formatDisplayDateTime(dispute.raisedOn) ?? dispute.raisedOn;
  if (stage !== "CHARGEBACK") {
    const at = out.findIndex((st) => st.id?.startsWith("dispute-raised-"));
    out.splice(at === -1 ? 0 : at + 1, 0, {
      id: `stage-${stage}`,
      label: `Dispute moved to ${stage === "ARBITRATION" ? "arbitration" : "pre-arbitration"}`,
      description: raisedAt,
      state: "danger",
    });
  }
  if (dispute.acceptedAmount !== undefined) {
    const at = out.findIndex((st) => st.id?.startsWith("evidence-submitted-"));
    out.splice(at === -1 ? out.length : at, 0, {
      id: "partially-accepted",
      label: "Dispute partially accepted",
      description: `${formatCurrency(dispute.acceptedAmount, dispute.currency)} returned to the customer`,
      state: "complete",
    });
  }
  if (dispute.withdrawn) {
    const at = out.findIndex((st) => st.id?.startsWith("dispute-accepted-"));
    if (at !== -1) out[at] = { ...out[at]!, label: "Dispute withdrawn" };
  }
  if (dispute.appliedFee) {
    out.push({
      id: "fee-charged",
      label: `${dispute.appliedFee.kind === "ARBITRATION" ? "Arbitration" : "Withdrawal"} fee charged`,
      description: `${formatFee(dispute.appliedFee)} settled from your account`,
      state: "danger",
    });
  }
  return out;
}

/** Full-bleed page surface. `[&_.shadow-sm]:shadow-none` flattens flux's
 *  default lift on every card, button and chip on the page; floating layers
 *  (tooltips, dialogs) are portalled out and keep theirs. */
const PAGE_CLASS =
  "-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6 [&_.shadow-sm]:shadow-none";

export type DisputeFlow = ReturnType<typeof useDisputeResolutionFlow>;

/**
 * One dispute and its Accept / Contest / Withdraw flow, read from the
 * transaction store (where the list puts the row's transaction before
 * opening it). Shared by the route page and by Dispute Management's drawer
 * and in-place page, so both views act on the same dispute state and the
 * same flow (an open dialog or the evidence form survives Expand).
 */
export function useDisputeDetailModel({
  transactionId,
  disputeId,
  onOpenForm,
}: {
  transactionId: string;
  disputeId: string;
  onOpenForm?: () => void;
}) {
  const transaction = useTransactionDetail((s) => s.transaction);
  const dispute =
    transaction?.gid === transactionId
      ? transaction.disputes?.find((d) => d.id === disputeId)
      : undefined;

  // Called unconditionally (rules of hooks), even when the dispute is not
  // found; the fallback transaction/amount/currency are only ever read once
  // `dispute` is confirmed to exist.
  const flow = useDisputeResolutionFlow({
    transaction: transaction ?? ({ gid: transactionId } as PaTransaction),
    disputeId,
    amount: dispute?.amount ?? 0,
    currency: dispute?.currency || transaction?.txnCurrency || "INR",
    dispute,
    onOpenForm,
    // No onAccepted redirect: the view shows the closed "Dispute accepted"
    // state, as the "Pre-arb and arb" design does.
  });

  return {
    transaction: transaction && dispute ? transaction : undefined,
    dispute,
    flow,
  };
}

/** The flow's dialogs (escalation confirmations and the accept choice).
 *  Rendered once beside the views rather than inside them, so the drawer
 *  and the page never both mount a copy. */
export function DisputeFlowDialogs({
  dispute,
  transaction,
  flow,
}: {
  dispute: DisputeEvent;
  transaction: PaTransaction;
  flow: DisputeFlow;
}) {
  const currency = dispute.currency || transaction.txnCurrency || "INR";
  return (
    <>
      <DisputeConfirmDialog
        kind={flow.confirmKind}
        open={flow.confirmOpen}
        onOpenChange={flow.setConfirmOpen}
        amount={dispute.amount}
        currency={currency}
        respondBy={dispute.respondBy}
        withdrawalFeeApplies={dispute.withdrawalFeeApplies}
        onConfirm={flow.handleConfirmed}
      />
      <DisputeAcceptChoice
        open={flow.acceptDialogOpen}
        onOpenChange={flow.setAcceptDialogOpen}
        amount={dispute.amount}
        currency={currency}
        onAcceptFull={flow.handleConfirmAcceptFull}
        onAcceptPartially={flow.handleAcceptPartially}
      />
    </>
  );
}

/**
 * A dispute's details, in one of two layouts:
 *  - "page": the full view, summary on top, then the 3:1 split (status,
 *    timeline, breakdown, linked transactions | details, payment, customer).
 *    Shows the evidence form in place while the flow is on it.
 *  - "drawer": the collapsed view, one column of the parts that matter at a
 *    glance (status and actions, dispute details, timeline, payment,
 *    customer). The evidence form never opens here; the flow's onOpenForm
 *    expands to the page first.
 */
export function DisputeDetailView({
  transaction,
  dispute,
  flow,
  layout,
  backLabel,
  onBack,
  onCollapse,
  decorative = false,
}: {
  transaction: PaTransaction;
  dispute: DisputeEvent;
  flow: DisputeFlow;
  layout: "page" | "drawer";
  /** Page only. */
  backLabel?: string;
  onBack?: () => void;
  /** Page only, when it was expanded from the drawer. */
  onCollapse?: () => void;
  /** A still copy for the expand/collapse hand-off: no entry animation. */
  decorative?: boolean;
}) {
  const router = useRouter();
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  const refundEvents = useRefundEvents(
    (s) => s.eventsByTransactionId[transaction.gid ?? ""] ?? EMPTY_REFUND_EVENTS
  );
  const isDrawer = layout === "drawer";

  const detail = deriveTransactionDetail(transaction, refundEvents);
  const disputeId = dispute.id;
  const amount = dispute.amount;
  const currency = dispute.currency || transaction.txnCurrency || "INR";
  // This dispute's own status badge, not the parent's aggregate (see
  // getDisplayStatus on the parent page), reuses the dispute-status
  // vocabulary directly (status/disputeStatus.ts), never the transaction's.
  const statusMeta = getDisputeStatusMeta(dispute.status);
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

  if (!isDrawer && flow.disputeScreen === "respond") {
    return (
      <DisputeRespondForm
        mode={flow.respondMode}
        stage={stageOf(dispute)}
        disputedAmount={amount}
        currency={currency}
        onBack={flow.backToDetail}
        onSubmit={flow.handleRespondSubmit}
      />
    );
  }

  const linkedTransactions = getDisputeDetailLinkedRows(transaction);

  const timelineSteps = withEscalationSteps(
    formatTimelineSteps(
      deriveDisputeOnlyTimelineSteps(detail.financials, disputeId),
      currency,
      () => {}
    ),
    dispute
  );

  const summary = (
    <div className={isDrawer ? undefined : "pb-4"}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "font-semibold tabular-nums text-foreground",
            isDrawer ? "text-3xl" : "text-[34px]"
          )}
        >
          {formatCurrency(amount, currency)}
        </span>
        <StatusBadgeWithTooltip
          size="md"
          variant={statusMeta.variant}
          label={statusMeta.label}
          trailIcon={statusMeta.trailIcon}
          tooltip={statusMeta.tooltip}
        />
        {dispute.disputePhase && (
          <StatusBadgeWithTooltip
            size="md"
            variant="muted"
            label={DISPUTE_PHASE_META[dispute.disputePhase].label}
            tooltip={DISPUTE_PHASE_META[dispute.disputePhase].description}
          />
        )}
      </div>

      {(dispute.appliedFee || dispute.acceptedAmount !== undefined) && (
        <div className="mt-2 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-2.5 py-1 text-[13px] text-foreground/85">
          <span>
            Disputed amount:{" "}
            <span className="font-medium tabular-nums">{formatCurrency(amount, currency)}</span>
          </span>
          {dispute.acceptedAmount !== undefined && (
            <>
              <Separator orientation="vertical" className="h-3.5" />
              <span>
                Accepted amount:{" "}
                <span className="font-medium tabular-nums">
                  {formatCurrency(dispute.acceptedAmount, currency)}
                </span>
              </span>
            </>
          )}
          {dispute.appliedFee && (
            <>
              <Separator orientation="vertical" className="h-3.5" />
              <span>
                {dispute.appliedFee.kind === "ARBITRATION" ? "Penalty fee" : "Withdrawal fee"}:{" "}
                <span className="font-medium tabular-nums text-red-600 dark:text-red-400">
                  {formatFee(dispute.appliedFee)}
                </span>
              </span>
            </>
          )}
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <span>{formattedDateTime}</span>
        <Separator orientation="vertical" className="h-3.5" />
        <TransactionPaymentMethod row={transaction} />
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Disputed by <span className="font-medium text-foreground">{name}</span>
      </p>
    </div>
  );

  const statusSection = (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Dispute
      </h3>
      <DisputeStatusCard
        dispute={dispute}
        disputeDetail={disputeDetail}
        onAccept={flow.handleAcceptDispute}
        onContest={flow.handleContestDispute}
        onWithdraw={flow.handleWithdrawDispute}
        submittedDocuments={flow.submittedDocuments}
      />
    </section>
  );

  const timelineSection = (
    <DetailSection title="Timeline">
      <PaymentTimeline steps={timelineSteps} variant="ticks" />
    </DetailSection>
  );

  const disputeDetailsSection = (
    <DisputeDetailsCard dispute={disputeDetail} transaction={transaction} currency={currency} />
  );

  const paymentSection = (
    <DetailSection title="Payment Details">
      <DetailRow
        label="Transaction ID"
        value={
          <span className="group">
            <CopyableCell
              value={truncateId(transaction.gid ?? "Not available")}
              copyValue={transaction.gid ?? ""}
              label="Transaction ID"
              className="font-medium text-foreground"
            />
          </span>
        }
      />
      <DetailRow
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
          label="Card Type"
          value={
            <span className="inline-flex items-center gap-2">
              <CardNetworkLogo brand={detail.cardType} />
              {detail.cardType}
            </span>
          }
        />
      )}
      <DetailRow label="Issuer" value={<BankName name={detail.issuerBank} />} />
    </DetailSection>
  );

  const customerSection = (
    <DetailSection title="Customer Details">
      <DetailRow label="Customer Name" value={name} />
      <DetailRow label="Email ID" value={transaction.encEmailId ?? "Not available"} />
      <DetailRow label="Phone Number" value={detail.customerPhone} />
    </DetailSection>
  );

  if (isDrawer) {
    return (
      <div className="space-y-6">
        {summary}
        {statusSection}
        {disputeDetailsSection}
        {timelineSection}
        {paymentSection}
        {customerSection}
      </div>
    );
  }

  return (
    <div
      className={cn("mx-auto max-w-350 space-y-5 overflow-x-hidden", !decorative && "page-enter")}
    >
      {onCollapse ? (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
            onClick={onBack}
            className="pl-0 text-primary hover:text-primary-hover"
          >
            {backLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="shrink" className="h-4 w-4" />}
            onClick={onCollapse}
            className="text-muted-foreground hover:text-foreground"
          >
            Collapse
          </Button>
        </div>
      ) : (
        onBack && backLabel && <DetailBackLink label={backLabel} onClick={onBack} />
      )}

      {summary}

      {/* Same 3:1 split and spacing as the MCA details page. */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[3fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {statusSection}
          {timelineSection}

          {detail.amountBreakdown && (
            <DetailSection title="Payment Breakdown">
              <AmountBreakdownBody
                // No processing fee on a dispute's page, so the net is
                // what was received less any refunds.
                amountReceived={detail.amountBreakdown.amountReceived}
                refundedAmount={detail.amountBreakdown.refundedAmount}
                disputedAmount={detail.amountBreakdown.disputedAmount}
                netAmount={
                  detail.amountBreakdown.amountReceived - detail.amountBreakdown.refundedAmount
                }
                currency={transaction.txnCurrency ?? currency}
              />
            </DetailSection>
          )}

          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Linked Transactions
            </h3>
            <LinkedTransactionsSection
              transactions={linkedTransactions}
              onViewDetails={goToLinked}
            />
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-4">
          {disputeDetailsSection}
          {paymentSection}
          {customerSection}
        </div>
      </div>
    </div>
  );
}

/** The dispute's own route (/dispute-management/[txn]/[dispute] and the
 *  Transactions child route): the full page on the app's card surface, with
 *  Back to its list. Dispute Management itself opens disputes in a drawer
 *  and expands in place instead (see its index). */
export function DisputeDetailFeature({
  transactionId,
  disputeId,
  origin = "transactions",
}: DisputeDetailFeatureProps) {
  const router = useRouter();
  const { listPath: LIST_PATH, backLabel, notFoundHint } = ORIGIN_COPY[origin];
  const { transaction, dispute, flow } = useDisputeDetailModel({ transactionId, disputeId });

  if (!transaction || !dispute) {
    return (
      <div className={PAGE_CLASS}>
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

  return (
    <div className={PAGE_CLASS}>
      <DisputeDetailView
        transaction={transaction}
        dispute={dispute}
        flow={flow}
        layout="page"
        backLabel={backLabel}
        onBack={() => router.push(LIST_PATH)}
      />
      <DisputeFlowDialogs dispute={dispute} transaction={transaction} flow={flow} />
    </div>
  );
}
