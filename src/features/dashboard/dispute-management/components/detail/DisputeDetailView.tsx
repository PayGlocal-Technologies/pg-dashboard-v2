"use client";

import { Button, Separator, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils/format";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { CopyableCell } from "@/components/common/CopyableCell";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import {
  DetailBackLink,
  DetailRow,
  DetailSection,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { TransactionPaymentMethod } from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/pa-transactions/components/TransactionId";
import {
  PaymentTimeline,
  type TimelineStep,
} from "@/features/dashboard/pa-transactions/components/PaymentTimeline";
import {
  CB_LEVEL_META,
  DISPLAY_STATUS_META,
} from "@/features/dashboard/dispute-management/constants";
import { paymentRow, respondBy } from "@/features/dashboard/dispute-management/helpers";
import { formatFeeWithCode } from "@/features/dashboard/dispute-management/disputeStages";
import {
  useCbDocuments,
  useCbTimeline,
  useDisputeCase,
  useNow,
} from "@/features/dashboard/dispute-management/hooks";
import {
  useDisputeResolutionFlow,
  type DisputeFlow,
} from "@/features/dashboard/dispute-management/useDisputeResolutionFlow";
import { DisputeStatusCard } from "@/features/dashboard/dispute-management/components/detail/DisputeStatusCard";
import { DocumentChips } from "@/features/dashboard/dispute-management/components/detail/DisputeStatusNoticeCard";
import { DisputeDetailsCard } from "@/features/dashboard/dispute-management/components/detail/DisputeDetailsCard";
import { DisputeAcceptChoice } from "@/features/dashboard/dispute-management/components/detail/DisputeAcceptChoice";
import { DisputeRespondForm } from "@/features/dashboard/dispute-management/components/detail/DisputeRespondForm";
import { DisputeConfirmDialog } from "@/features/dashboard/dispute-management/components/detail/DisputeConfirmDialog";
import { DisputeFulfilmentDialog } from "@/features/dashboard/dispute-management/components/detail/DisputeFulfilmentDialog";
import { DisputeCommentsSection } from "@/features/dashboard/dispute-management/components/detail/DisputeCommentsSection";
import type {
  CbExternalDrawerViewStatus,
  DisputeCase,
} from "@/features/dashboard/dispute-management/types";

export type { DisputeFlow };

/** The newest timeline entry is amber when it names a step that needs attention (CbTimelineCard). */
const ATTENTION_WORDS = ["disputed", "contested", "insufficient", "partially", "arbitration"];

const CONTESTING: CbExternalDrawerViewStatus[] = [
  "UPLOAD_DOC",
  "UNDER_REVIEW",
  "INSUFFICIENT_DOC",
  "READY_TO_REPRESENT",
  "BANK_REVIEW",
];

/**
 * The headline for where the case stands, pg-dashboard's
 * CB_EXTERNAL_AMOUNT_DETAILS_MAPPER: what the big amount means right now.
 */
function headline(dispute: DisputeCase): { title: string; amount: number } {
  const { status } = dispute;
  if (CONTESTING.includes(status))
    return { title: "Contesting for", amount: dispute.levelContestedAmount ?? dispute.amount };
  if (status === "DISPUTE_CLOSED")
    return { title: "Accepted amount", amount: dispute.levelAcceptedAmount ?? 0 };
  if (status === "DISPUTE_CLOSED_MERCHANT_FAV" || status === "DISPUTE_CLOSED_CUSTOMER_FAV")
    return { title: "Contested for", amount: dispute.levelContestedAmount ?? dispute.amount };
  if (status === "DISPUTE_RESOLVED_BY_REFUND")
    return { title: "Dispute resolved by refund", amount: dispute.amount };
  if (status === "NO_RESPONSE") return { title: "Disputed amount", amount: dispute.amount };
  return { title: "Dispute raised for", amount: dispute.amount };
}

/**
 * One dispute, fetched by merchant ID and dispute ID
 * (`GET /v2/cb/details/{mid}/{cbId}`), and its Accept / Contest / Withdraw
 * flow. Shared by Dispute Management's drawer and in-place page, so both
 * views act on the same case and the same flow (an open dialog or the
 * evidence form survives Expand).
 */
export function useDisputeDetailModel({
  mid,
  cbId,
  onOpenForm,
}: {
  mid: string;
  cbId: string;
  onOpenForm?: () => void;
}) {
  const { dispute, isLoading, isError } = useDisputeCase(mid, cbId);
  const flow = useDisputeResolutionFlow({ dispute, onOpenForm });
  return { dispute, isLoading, isError, flow };
}

/**
 * The flow's dialogs (confirmations, the accept choice and the shipment
 * step), rendered once beside the views so the drawer and the page never
 * both mount a copy.
 */
export function DisputeFlowDialogs({
  dispute,
  flow,
}: {
  dispute: DisputeCase;
  flow: DisputeFlow;
}) {
  const now = useNow();
  return (
    <>
      <DisputeConfirmDialog
        kind={flow.confirmKind}
        open={flow.confirmOpen}
        onOpenChange={flow.setConfirmOpen}
        dispute={dispute}
        onConfirm={flow.handleConfirmed}
      />
      <DisputeAcceptChoice
        open={flow.acceptDialogOpen}
        onOpenChange={flow.setAcceptDialogOpen}
        // What "accept in full" returns: the contested part when one is
        // already set (after a partial accept), else the whole level amount.
        amount={dispute.levelContestedAmount || dispute.amount}
        currency={dispute.currency}
        daysToRespond={respondBy(dispute.dueDate, now).days}
        allowPartial={dispute.level !== "ARBITRATION"}
        onAcceptFull={flow.handleConfirmAcceptFull}
        onAcceptPartially={flow.handleAcceptPartially}
        isAccepting={flow.isAccepting}
      />
      <DisputeFulfilmentDialog
        open={flow.fulfilmentOpen}
        onClose={flow.closeFulfilment}
        onSubmit={flow.submitFulfilment}
        isSubmitting={flow.isFulfilling}
      />
    </>
  );
}

/** Loading and not-found for a view whose case has not arrived. */
export function DisputeDetailPlaceholder({
  isLoading,
  layout,
}: {
  isLoading: boolean;
  layout: "page" | "drawer";
}) {
  if (isLoading) {
    return (
      <div className={cn("space-y-4", layout === "page" && "mx-auto max-w-350")}>
        <Shimmer className="h-24 w-full rounded-lg" />
        <Shimmer className="h-48 w-full rounded-lg" />
        <Shimmer className="h-40 w-full rounded-lg" />
      </div>
    );
  }
  return (
    <PlaceholderState
      variant="error"
      title="Couldn't load this dispute"
      description="Something went wrong fetching its details. Try again in a moment."
      className="py-16"
    />
  );
}

function TimelineSection({ mid, cbId }: { mid: string; cbId: string }) {
  const { items, isLoading } = useCbTimeline(mid, cbId);
  // The API's own entries, newest first, as pg-dashboard lists them.
  const steps: TimelineStep[] = items.map((item, index) => {
    const label = item.actionDescription || "-";
    const attention =
      index === 0 && ATTENTION_WORDS.some((w) => label.toLowerCase().includes(w));
    return {
      id: item.actionId || `${index}`,
      label,
      description: formatTimestamp(item.formattedCreationTime, ""),
      state: index === 0 ? (attention ? "danger" : "current") : "complete",
    };
  });
  return (
    <DetailSection title="Timeline">
      {isLoading ? (
        <Shimmer className="h-24 w-full rounded-md" />
      ) : steps.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No updates yet.</p>
      ) : (
        <PaymentTimeline steps={steps} variant="ticks" />
      )}
    </DetailSection>
  );
}

/**
 * A dispute's details, in one of two layouts:
 *  - "page": the full view, summary on top, then the 3:1 split (status,
 *    timeline, comments | details, payment, customer, documents). Shows the
 *    evidence form in place while the flow is on it.
 *  - "drawer": the collapsed view, one column. The evidence form never opens
 *    here; the flow's onOpenForm expands to the page first.
 */
export function DisputeDetailView({
  dispute,
  flow,
  layout,
  backLabel,
  onBack,
  onCollapse,
  decorative = false,
}: {
  dispute: DisputeCase;
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
  const now = useNow();
  const documents = useCbDocuments(dispute.cbId);
  const isDrawer = layout === "drawer";
  const mid = dispute.merchantId;

  if (!isDrawer && flow.disputeScreen === "respond") {
    return (
      <DisputeRespondForm
        mode={flow.respondMode}
        dispute={dispute}
        onBack={flow.backToDetail}
        pendingAcceptedAmount={flow.pendingAcceptedAmount}
        onSubmit={flow.handleSubmitEvidence}
        isSubmitting={flow.isSubmittingEvidence}
      />
    );
  }

  const statusMeta = DISPLAY_STATUS_META[dispute.displayStatus] ?? DISPLAY_STATUS_META.ACTION_REQUIRED;
  const levelMeta = CB_LEVEL_META[dispute.level];
  const head = headline(dispute);
  const money = (n: number) => formatCurrency(n, dispute.currency);
  const payment = paymentRow(
    dispute.payment.method,
    dispute.payment.brand,
    dispute.payment.maskedCardNo
  );
  const accepted = dispute.levelAcceptedAmount;
  const showAccepted = accepted !== null && accepted !== 0 && CONTESTING.includes(dispute.status);
  const isArb = dispute.level === "ARBITRATION";
  const fee =
    isArb && dispute.status === "DISPUTE_CLOSED" && dispute.withdrawalFee
      ? { label: "Withdrawal fee", value: formatFeeWithCode(dispute.withdrawalFee) }
      : isArb && dispute.status === "DISPUTE_CLOSED_CUSTOMER_FAV" && dispute.penaltyFee
        ? { label: "Penalty fee", value: formatFeeWithCode(dispute.penaltyFee) }
        : null;
  const showStrip = head.title !== "Dispute raised for" && head.title !== "Disputed amount";

  const proofDocuments = documents.proof.map((doc) => ({
    name: doc.originalFileName || doc.fileName || "Document",
    url: doc.url,
    label: doc.shortDesc ?? null,
  }));
  const cdfDocuments = documents.cdf.map((doc) => ({
    name: doc.originalFileName || doc.fileName || "Document",
    url: doc.url,
    label: "CDF",
  }));

  const summary = (
    <div className={isDrawer ? undefined : "pb-4"}>
      <p className="text-[13px] font-medium text-muted-foreground">{head.title}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "font-semibold tabular-nums text-foreground",
            isDrawer ? "text-3xl" : "text-[34px]"
          )}
        >
          {money(head.amount)}
        </span>
        <StatusBadgeWithTooltip
          size="md"
          variant={statusMeta.variant}
          label={statusMeta.label}
          trailIcon={statusMeta.trailIcon}
          tooltip={statusMeta.tooltip}
        />
        {levelMeta && (
          <StatusBadgeWithTooltip
            size="md"
            variant="muted"
            label={levelMeta.label}
            tooltip={levelMeta.description}
          />
        )}
      </div>

      {showStrip && (
        <div className="mt-2 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-2.5 py-1 text-[13px] text-foreground/85">
          {showAccepted && (
            <>
              <span>
                Accepted amount:{" "}
                <span className="font-medium tabular-nums">{money(accepted ?? 0)}</span>
              </span>
              <Separator orientation="vertical" className="h-3.5" />
            </>
          )}
          <span>
            Disputed amount:{" "}
            <span className="font-medium tabular-nums">{money(dispute.amount)}</span>
          </span>
          {fee && (
            <>
              <Separator orientation="vertical" className="h-3.5" />
              <span>
                {fee.label}:{" "}
                <span className="font-medium tabular-nums text-red-600 dark:text-red-400">
                  {fee.value}
                </span>
              </span>
            </>
          )}
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <span>{formatTimestamp(dispute.raisedOn, "-")}</span>
        <Separator orientation="vertical" className="h-3.5" />
        <TransactionPaymentMethod row={payment} />
      </div>
      {dispute.customer.name && (
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Disputed by <span className="font-medium text-foreground">{dispute.customer.name}</span>
        </p>
      )}
    </div>
  );

  const statusCard = (
    <DisputeStatusCard
      dispute={dispute}
      documents={proofDocuments}
      now={now}
      onAccept={flow.handleAcceptDispute}
      onContest={flow.handleContestDispute}
      onWithdraw={flow.handleWithdrawDispute}
      onUploadEvidence={flow.handleUploadEvidence}
    />
  );
  const statusSection =
    dispute.status === "DISPUTE_RESOLVED_BY_REFUND" ? null : (
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Dispute
        </h3>
        {statusCard}
      </section>
    );

  const timelineSection = <TimelineSection mid={mid} cbId={dispute.cbId} />;
  const disputeDetailsSection = <DisputeDetailsCard dispute={dispute} now={now} />;

  const txn = dispute.transaction;
  const paymentSection = (
    <DetailSection title="Payment Details">
      <DetailRow
        label="Transaction ID"
        value={
          dispute.txnGid ? (
            <span className="group">
              <CopyableCell
                value={truncateId(dispute.txnGid)}
                copyValue={dispute.txnGid}
                label="Transaction ID"
                className="font-medium text-foreground"
              />
            </span>
          ) : (
            "-"
          )
        }
      />
      {dispute.orderId && (
        <DetailRow
          label="Order ID"
          value={
            <span className="group">
              <CopyableCell
                value={truncateId(dispute.orderId)}
                copyValue={dispute.orderId}
                label="Order ID"
                className="font-medium text-foreground"
              />
            </span>
          }
        />
      )}
      <DetailRow
        label="Transaction Amount"
        value={
          txn.amount !== null && txn.currency
            ? `${formatCurrency(txn.amount, txn.currency)} ${txn.currency}`
            : "-"
        }
      />
      <DetailRow label="Merchant Txn ID" value={txn.merchantTxnId || "-"} />
      <DetailRow label="Merchant Unique ID" value={txn.merchantUniqueId || "-"} />
      <DetailRow label="ARN" value={txn.arn || "-"} />
      <DetailRow label="RRN" value={txn.rrn || "-"} />
      <DetailRow label="Transaction Date" value={formatTimestamp(txn.date, "-")} />
    </DetailSection>
  );

  const customerSection = (
    <DetailSection title="Customer Details">
      <DetailRow label="Customer Name" value={dispute.customer.name || "-"} />
      <DetailRow
        label="Email ID"
        value={
          dispute.customer.email ? (
            <a
              href={`mailto:${dispute.customer.email}`}
              className="break-all text-primary underline-offset-2 hover:underline"
            >
              {dispute.customer.email}
            </a>
          ) : (
            "-"
          )
        }
      />
    </DetailSection>
  );

  // The bank's customer dispute form, shown whenever the case has one.
  const documentsSection =
    cdfDocuments.length > 0 ? (
      <DetailSection title="Dispute Documents">
        <DocumentChips documents={cdfDocuments} />
      </DetailSection>
    ) : null;

  const commentsSection = <DisputeCommentsSection mid={mid} cbId={dispute.cbId} />;

  if (isDrawer) {
    return (
      <div className="space-y-6">
        {summary}
        {statusSection}
        {disputeDetailsSection}
        {timelineSection}
        {paymentSection}
        {customerSection}
        {documentsSection}
        {commentsSection}
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
          {commentsSection}
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-4">
          {disputeDetailsSection}
          {paymentSection}
          {customerSection}
          {documentsSection}
        </div>
      </div>
    </div>
  );
}
