import {
  clampToZero,
  subtractAmounts,
  sumAmounts,
} from "@/features/dashboard/transactions/financial/money";
import type {
  DerivedTransactionStatus,
  DisputeEvent,
  RefundEvent,
  SettlementEvent,
  ValidationResult,
} from "@/features/dashboard/transactions/financial/types";

// ── Refund amounts ───────────────────────────────────────────────────────────
// Only SUCCEEDED refunds count toward refundedAmount, a failed refund attempt
// never moved money and a pending one hasn't moved it yet, see Section 7 of
// the financial-logic spec.

export function getRefundedAmount(refunds: RefundEvent[]): number {
  return sumAmounts(refunds.filter((r) => r.status === "SUCCEEDED").map((r) => r.amount));
}

export function getPendingRefundAmount(refunds: RefundEvent[]): number {
  return sumAmounts(refunds.filter((r) => r.status === "PENDING").map((r) => r.amount));
}

export function getFailedRefundAmount(refunds: RefundEvent[]): number {
  return sumAmounts(refunds.filter((r) => r.status === "FAILED").map((r) => r.amount));
}

// ── Settlement amounts ───────────────────────────────────────────────────────
// A transaction can have many settlement events (Section 8-9), summed here
// rather than assuming exactly one. A later refund must never modify a
// settlement already recorded, callers only ever append new SettlementEvent
// entries, this function just sums whatever currently exists.

export function getSettledAmount(settlements: SettlementEvent[]): number {
  return sumAmounts(settlements.filter((s) => s.status === "SETTLED").map((s) => s.amount));
}

// ── Dispute amounts ──────────────────────────────────────────────────────────
// disputedAmount is the sum of every dispute ever raised against this
// transaction, preserved regardless of outcome (Section 19), won/lost/active
// are separate derived breakdowns, never a replacement for the total.

export function getDisputedAmount(disputes: DisputeEvent[]): number {
  return sumAmounts(disputes.map((d) => d.amount));
}

export function getActiveDisputeAmount(disputes: DisputeEvent[]): number {
  return sumAmounts(disputes.filter(isDisputeActive).map((d) => d.amount));
}

export function getWonDisputeAmount(disputes: DisputeEvent[]): number {
  return sumAmounts(disputes.filter((d) => d.status === "WON").map((d) => d.amount));
}

export function getLostDisputeAmount(disputes: DisputeEvent[]): number {
  return sumAmounts(disputes.filter((d) => d.status === "LOST").map((d) => d.amount));
}

/** A dispute still needs a decision/is being worked (DISPUTED, NEEDS_ACTION,
 * UNDER_REVIEW) vs. already resolved (WON, LOST). The single place this
 * WON/LOST check lives, callers (getDisplayStatus, getActiveDisputeAmount's
 * own filter above, TransactionDetailFeature) all use this instead of
 * re-deriving it. */
export function isDisputeActive(dispute: DisputeEvent | undefined): boolean {
  return !!dispute && dispute.status !== "WON" && dispute.status !== "LOST";
}

// ── Remaining amount ─────────────────────────────────────────────────────────
// originalAmount - refundedAmount, clamped so upstream inconsistency (e.g. a
// refund recorded without going through validateRefund) can never surface as
// a negative "remaining" value.

export function getRemainingAmount(originalAmount: number, refundedAmount: number): number {
  return clampToZero(subtractAmounts(originalAmount, refundedAmount));
}

// ── Net amount (Payment Breakdown) ──────────────────────────────────────────
// amountReceived - fee - refundedAmount. Deliberately excludes disputedAmount,
// a dispute is a separate financial dimension (held/at-risk funds), not
// something PayGlocal's existing model nets against the payment itself, see
// the "Payment Breakdown Must Reflect Refunds, Disputes and Settlement
// State" spec's own explicit "do not combine refund and dispute" rule.

export function getNetAmount(amountReceived: number, fee: number, refundedAmount: number): number {
  return subtractAmounts(subtractAmounts(amountReceived, fee), refundedAmount);
}

// ── Currency guard ───────────────────────────────────────────────────────────
// Never aggregate amounts across different currencies (Section 30). Every
// function above is only ever called with a single transaction's own event
// arrays, which should already share one currency, this is the explicit
// check for the one place a mismatch could otherwise slip in unnoticed: a
// new refund/dispute/settlement event being recorded against a transaction.

export function assertSameCurrency(transactionCurrency: string, eventCurrency: string): void {
  if (transactionCurrency !== eventCurrency) {
    throw new Error(
      `Currency mismatch: transaction is ${transactionCurrency}, event is ${eventCurrency}`
    );
  }
}

// ── Refund validation ────────────────────────────────────────────────────────
// Rejects any refund whose amount, combined with refunds already SUCCEEDED or
// PENDING, would exceed the refundable amount (Section 6). PENDING is
// included because it can still succeed, letting it through would allow two
// concurrently-pending refunds to jointly over-refund once both complete.

export function validateRefund(
  originalAmount: number,
  currency: string,
  existingRefunds: RefundEvent[],
  attempted: { amount: number; currency: string }
): ValidationResult {
  if (attempted.amount <= 0) {
    return { ok: false, reason: "Refund amount must be greater than zero." };
  }
  if (attempted.currency !== currency) {
    return {
      ok: false,
      reason: `Refund currency (${attempted.currency}) must match the transaction currency (${currency}).`,
    };
  }
  const committedSoFar = sumAmounts(
    existingRefunds
      .filter((r) => r.status === "SUCCEEDED" || r.status === "PENDING")
      .map((r) => r.amount)
  );
  const remaining = getRemainingAmount(originalAmount, committedSoFar);
  if (attempted.amount > remaining) {
    return {
      ok: false,
      reason: `Refund of ${attempted.amount} exceeds the refundable amount of ${remaining}.`,
    };
  }
  return { ok: true };
}

// ── Transaction status derivation ───────────────────────────────────────────
// A single centralized function (Section 22) so no component derives this
// independently. `paymentBucket` is the existing getStatusBucket() output for
// the transaction's raw externalStatus (success/failed/pending), everything
// else layers refund/dispute state on top of it. Disputed statuses already
// bucket as "disputed" in getStatusBucket, callers pass the *payment* bucket
// the transaction would have had absent any dispute (i.e. "success") so this
// function can tell "disputed" apart from "disputed AND refunded".

export interface DeriveTransactionStatusInput {
  paymentBucket: "success" | "failed" | "pending";
  originalAmount: number;
  refundedAmount: number;
  activeDisputeAmount: number;
}

export function deriveTransactionStatus({
  paymentBucket,
  originalAmount,
  refundedAmount,
  activeDisputeAmount,
}: DeriveTransactionStatusInput): DerivedTransactionStatus {
  if (paymentBucket === "failed") return "FAILED";
  if (paymentBucket === "pending") return "PENDING";

  const isFullyRefunded = refundedAmount > 0 && refundedAmount >= originalAmount;
  const isPartiallyRefunded = refundedAmount > 0 && !isFullyRefunded;
  const isDisputed = activeDisputeAmount > 0;
  const isPartiallyDisputed = isDisputed && activeDisputeAmount < originalAmount;

  if (isDisputed && isFullyRefunded) return "REFUNDED_AND_DISPUTED";
  if (isDisputed && isPartiallyRefunded) return "PARTIALLY_REFUNDED_AND_DISPUTED";
  if (isDisputed) return isPartiallyDisputed ? "PARTIALLY_DISPUTED" : "DISPUTED";
  if (isFullyRefunded) return "REFUNDED";
  if (isPartiallyRefunded) return "PARTIALLY_REFUNDED";
  return "SUCCESSFUL";
}

// ── Child-event reference validation ────────────────────────────────────────
// Every refund/dispute/settlement event must reference the transaction it
// actually belongs to (Section 37's "invalid child-transaction reference"
// edge case), and no two events of the same kind for a transaction may share
// an ID (Section 37's "duplicate child event IDs" edge case).

export function validateChildEventReference(
  expectedTransactionId: string,
  event: { transactionId: string }
): ValidationResult {
  if (event.transactionId !== expectedTransactionId) {
    return {
      ok: false,
      reason: `Event references transaction "${event.transactionId}", expected "${expectedTransactionId}".`,
    };
  }
  return { ok: true };
}

export function hasDuplicateEventIds(events: { id: string }[]): boolean {
  const seen = new Set<string>();
  for (const event of events) {
    if (seen.has(event.id)) return true;
    seen.add(event.id);
  }
  return false;
}
