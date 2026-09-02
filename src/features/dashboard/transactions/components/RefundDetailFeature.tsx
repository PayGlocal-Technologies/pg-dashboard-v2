"use client";

import { useRouter } from "next/navigation";
import { Button, Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { StatusBadgeWithTooltip } from "@/components/common/StatusBadgeWithTooltip";
import { CopyableCell } from "@/components/common/CopyableCell";
import {
  formatDisplayDateTime,
  getRefundStatusMeta,
} from "@/features/dashboard/transactions/paColumns";
import {
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import { truncateId } from "@/features/dashboard/transactions/components/TransactionId";
import { LinkedTransactionsSection } from "@/features/dashboard/transactions/components/LinkedTransactionsSection";
import {
  PaymentTimeline,
  type TimelineStep,
} from "@/features/dashboard/transactions/components/PaymentTimeline";
import { getRefundDetailLinkedRows } from "@/features/dashboard/transactions/linkedChildRecords";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { RefundEvent } from "@/features/dashboard/transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

/** A refund's OWN lifecycle, not the parent transaction's, see
 * TransactionDetailFeature's buildTransactionTimelineSteps for that. A
 * refund only ever has one real timestamp (createdAt), so a SUCCEEDED
 * refund's "initiated"/"processed" steps intentionally share it rather than
 * fabricating a second one. */
function buildRefundOnlyTimelineSteps(refund: RefundEvent, currency: string): TimelineStep[] {
  const when = formatDisplayDateTime(refund.createdAt) ?? refund.createdAt;
  const amountLabel = formatCurrency(refund.amount, refund.currency ?? currency);
  const initiated: TimelineStep = {
    id: "refund-initiated",
    label: "Refund initiated",
    description: `${amountLabel} · ${when}`,
    state: refund.status === "PROCESSING" ? "current" : "complete",
  };
  if (refund.status === "COMPLETED") {
    return [
      initiated,
      { id: "refund-completed", label: "Refund completed", description: when, state: "complete" },
    ];
  }
  if (refund.status === "FAILED") {
    return [
      initiated,
      { id: "refund-failed", label: "Refund failed", description: when, state: "danger" },
    ];
  }
  return [initiated];
}

interface RefundDetailFeatureProps {
  transactionId: string;
  refundId: string;
}

/** Full-page detail view for a single refund, a child financial event of
 * `transactionId` (see PaTransaction.refunds), never an independent
 * transaction of its own, see linkedChildRecords.ts's own doc comment. This
 * page shows only THIS refund's own amount/status/timeline, aggregate
 * refund totals stay on the parent's own Payment Breakdown. Reuses the same
 * Card/DetailRow/SectionLabel/PaymentTimeline/LinkedTransactionsSection
 * primitives TransactionDetailFeature already uses, no new visual system. */
export function RefundDetailFeature({ transactionId, refundId }: RefundDetailFeatureProps) {
  const router = useRouter();
  const transaction = useTransactionDetail((s) => s.transaction);
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);

  const refund =
    transaction?.gid === transactionId
      ? transaction.refunds?.find((r) => r.id === refundId)
      : undefined;

  if (!transaction || transaction.gid !== transactionId || !refund) {
    return (
      <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
        <div className="page-enter mx-auto max-w-350 space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Icon name="alert-circle" size={22} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Refund not found</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Open this refund from its transaction&apos;s Linked Transactions to view its
                details.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/transactions")}>
              Go back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currency = refund.currency || transaction.txnCurrency || "INR";
  const originalAmount = parseFloat(transaction.totalAmount ?? "0");
  const statusMeta = getRefundStatusMeta(refund.status);
  const formattedDateTime = formatDisplayDateTime(refund.createdAt) ?? "Not available";

  // Parent, always, plus any sibling dispute(s) belonging to THIS SAME
  // parent (Section 17 of the parent-child model spec), never other
  // transactions from this customer, never unrelated refunds.
  const linkedTransactions: PaTransaction[] = getRefundDetailLinkedRows(transaction);

  function goToParent() {
    setStoredTransaction(transaction!);
    router.push(`/transactions/${encodeURIComponent(transactionId)}`);
  }

  function goToLinked(row: PaTransaction) {
    setStoredTransaction(transaction!);
    router.push(`/transactions/${encodeURIComponent(row.gid ?? "")}`);
  }

  return (
    <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
      <div className="page-enter mx-auto max-w-350 space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Refund Details</h1>

        <Button
          type="button"
          variant="link"
          leftIcon={<Icon name="chevron-left" size={14} />}
          onClick={goToParent}
          className="h-auto w-fit gap-1 p-0 text-sm font-medium"
        >
          Back to Transaction
        </Button>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-baseline gap-2 text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {formatCurrency(refund.amount, currency)}
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
          <div className="mt-3 text-[13px] font-medium text-foreground">{formattedDateTime}</div>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            Refund of{" "}
            <span className="font-semibold text-foreground/85">
              {formatCurrency(originalAmount, transaction.txnCurrency ?? currency)}{" "}
              {transaction.txnCurrency}
            </span>{" "}
            transaction
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <SectionLabel>Timeline</SectionLabel>
              <Card className="gap-0 p-5">
                <PaymentTimeline steps={buildRefundOnlyTimelineSteps(refund, currency)} />
              </Card>
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Linked Transactions</SectionLabel>
              <LinkedTransactionsSection
                transactions={linkedTransactions}
                onViewDetails={goToLinked}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-4">
            <div className="flex flex-col gap-2">
              <SectionLabel>Refund Details</SectionLabel>
              <Card className="gap-0 p-5">
                <div className="flex flex-col gap-5">
                  <div className="group">
                    <p className="text-xs text-muted-foreground">Refund ID</p>
                    <div className="mt-0.5">
                      <CopyableCell
                        value={truncateId(refund.id)}
                        copyValue={refund.id}
                        label="Refund ID"
                        monospace
                        className="font-semibold text-foreground/85"
                      />
                    </div>
                  </div>
                  {refund.reason && <DetailRow label="Reason" value={refund.reason} />}
                  <DetailRow label="Initiated On" value={formattedDateTime} />
                  <div className="group">
                    <p className="text-xs text-muted-foreground">Parent Transaction ID</p>
                    <div className="mt-0.5">
                      <CopyableCell
                        value={truncateId(transaction.gid ?? "Not available")}
                        copyValue={transaction.gid ?? ""}
                        label="Parent Transaction ID"
                        monospace
                        className="font-semibold text-foreground/85"
                      />
                    </div>
                  </div>
                  <DetailRow
                    label="Parent Transaction Amount"
                    value={`${formatCurrency(originalAmount, transaction.txnCurrency ?? currency)} ${transaction.txnCurrency}`}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
