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
import { customerName, getStatusBucket, getStatusMeta } from "@/features/dashboard/transactions/paColumns";
import { deriveTransactionDetail, type TransactionDetailView } from "@/features/dashboard/transactions/deriveTransactionDetail";
import { DetailRow, SectionLabel } from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import { AmountBreakdownBody } from "@/features/dashboard/transactions/components/AmountBreakdownBody";
import {
  IssueRefundDialog,
  type RefundSubmission,
} from "@/features/dashboard/transactions/components/IssueRefundDialog";
import { SettlementNotApplicableNote } from "@/features/dashboard/transactions/components/SettlementDetailsBody";
import { LinkedTransactionsSection } from "@/features/dashboard/transactions/components/LinkedTransactionsSection";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/transactions/components/TransactionId";
import { useIssuedRefunds } from "@/stores/useIssuedRefunds";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const LIST_PATH = "/transactions";
const EMPTY_REFUNDS: PaTransaction[] = [];

/** "07/08/2026, 08:47:05" -> ["07/08/2026", "08:47:05"]. */
function splitDateTime(value?: string): [string, string | undefined] {
  if (!value) return ["Not available", undefined];
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  return [datePart ?? value, timePart];
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
                {step.state === "complete" && <Icon name="check" size={12} strokeWidth={3} aria-hidden />}
                {step.state === "current" && <Icon name="clock" size={11} aria-hidden />}
              </span>
              {!isLast && <div aria-hidden="true" className="my-1 w-px flex-1 bg-primary" />}
            </div>
            <div className={cn("min-w-0", !isLast && "pb-5")}>
              <p className="text-sm font-semibold text-foreground/85">{step.label}</p>
              {step.description && <div className="text-xs text-muted-foreground">{step.description}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function TransactionDetailFeature({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const transaction = useTransactionDetail((s) => s.transaction);
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  const issuedRefunds = useIssuedRefunds((s) => s.refundsByParentGid[transaction?.gid ?? ""] ?? EMPTY_REFUNDS);
  const addRefund = useIssuedRefunds((s) => s.addRefund);
  const [refundOpen, setRefundOpen] = useState(false);

  if (!transaction || transaction.gid !== transactionId) {
    return (
      <div className="page-enter mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Icon name="alert-circle" size={22} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Transaction not found</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Open this transaction from the Transactions list to view its details.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(LIST_PATH)}>
            Go back
          </Button>
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
  const [datePart, timePart] = splitDateTime(transaction.formattedCreationDateTime);

  const alreadyRefunded = issuedRefunds.reduce((sum, r) => sum + parseFloat(r.totalAmount ?? "0"), 0);
  const refundableAmount = Math.max(amount - alreadyRefunded, 0);
  const canRefund = showFeedback && refundableAmount > 0;
  const linkedTransactions = [...detail.linkedTransactions, ...issuedRefunds];

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

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(transaction!.gid ?? "");
      toast.success("Transaction ID copied");
    } catch {
      // Clipboard access denied, non-critical affordance, fail silently.
    }
  }

  function goToDetail(row: PaTransaction) {
    setStoredTransaction(row);
    router.push(`/transactions/${encodeURIComponent(row.gid ?? "")}`);
  }

  function goToSettlement(settlementId: string) {
    router.push(`/reports/settlement-report/${encodeURIComponent(settlementId)}`);
  }

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Transactions</h1>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="link"
            leftIcon={<Icon name="chevron-left" size={14} />}
            onClick={() => router.push(LIST_PATH)}
            className="h-auto w-fit gap-1 p-0 text-sm font-medium"
          >
            Back to Transactions
          </Button>
          <Button
            type="button"
            variant="link"
            leftIcon={<Icon name="minimize-2" size={13} />}
            onClick={() => router.back()}
            className="h-auto w-fit gap-1 p-0 text-sm font-medium text-muted-foreground"
          >
            Collapse
          </Button>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="text-[11px] text-muted-foreground">Transaction ID</p>
          <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
            <span title={transaction.gid} className="truncate font-mono text-xs font-semibold text-foreground/85">
              {truncateId(transaction.gid ?? "Not available")}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCopyId}
              aria-label="Copy transaction ID"
              className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
            >
              <Icon name="copy" size={11} />
            </Button>
          </div>
        </div>
      </div>

      {/* Amount, currency, status, date/time and payment method, then
       * charged-to, sits directly on the page background, no card. */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="flex items-baseline gap-2 text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {formatCurrency(amount, currency)}
              <span className="text-base font-medium text-muted-foreground">{currency}</span>
            </p>
            <StatusBadge variant={statusMeta.variant} label={statusMeta.label} trailIcon={statusMeta.trailIcon} size="sm" />
          </div>
          {canRefund && (
            <Button type="button" variant="outline" size="sm" onClick={() => setRefundOpen(true)}>
              Issue Refund
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{datePart}</span>
          {timePart && (
            <>
              <Separator orientation="vertical" className="h-3.5" />
              <span>{timePart}</span>
            </>
          )}
          <Separator orientation="vertical" className="h-3.5" />
          <TransactionPaymentMethod row={transaction} />
        </div>

        <Separator className="my-4" />

        <p className="text-sm text-muted-foreground">
          Charged to <span className="font-semibold text-foreground/85">{name}</span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <SectionLabel>Payment Details</SectionLabel>
            <Card className="gap-0 p-5">
              <div className="flex flex-col gap-5">
                <DetailRow label="Merchant Transaction ID" value={detail.merchantTxnId} />
                <DetailRow label="Payment Category" value={detail.paymentCategory} />
                {detail.cardType && <DetailRow label="Card Type" value={detail.cardType} />}
                <DetailRow label="Issuer" value={detail.issuerBank} />
              </div>
            </Card>
          </div>

          <ReferAndEarnBanner />

          {showFeedback && <ProductFeedback key={transaction.gid} />}

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
                    <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground/85">{detail.comments}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-2">
            <SectionLabel>Linked Transactions</SectionLabel>
            <LinkedTransactionsSection transactions={linkedTransactions} onViewDetails={goToDetail} />
          </div>
        </div>

        {/* Right column, sticky */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
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

          {detail.amountBreakdown && (
            <div className="flex flex-col gap-2">
              <SectionLabel>Amount Breakdown</SectionLabel>
              <Card className="gap-0 p-5">
                <AmountBreakdownBody
                  amountReceived={detail.amountBreakdown.amountReceived}
                  fee={detail.amountBreakdown.fee}
                  netAmount={detail.amountBreakdown.netAmount}
                  currency={currency}
                />
              </Card>
            </div>
          )}

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
    </div>
  );
}
