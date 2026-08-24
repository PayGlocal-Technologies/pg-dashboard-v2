import { isDisputeActive } from "@/features/dashboard/transactions/financial/deriveFinancials";
import type {
  DisputeEvent,
  RefundEvent,
  SettlementEvent,
  TimelineEventRecord,
  TimelineStepData,
  TransactionFinancials,
} from "@/features/dashboard/transactions/financial/types";

/** "DD/MM/YYYY, HH:MM:SS" -> epoch ms, same format as
 * PaTransaction.formattedCreationDateTime. Used only to sort timeline events
 * by their real recorded time, never to compare against the current time
 * (see CLAUDE.md's Date.now() purity rule, this module never calls it). */
export function parseFormattedTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  const [day, month, year] = (datePart ?? "").split("/").map(Number);
  if (!day || !month || !year) return 0;
  const [hours, minutes, seconds] = (timePart ?? "00:00:00").split(":").map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0).getTime();
}

export interface GenerateTimelineInput {
  currency: string;
  originalAmount: number;
  /** The transaction's own formattedCreationDateTime. */
  paymentInitiatedAt: string;
  paymentBucket: "success" | "failed" | "pending";
  refundEvents: RefundEvent[];
  disputeEvents: DisputeEvent[];
  settlementEvents: SettlementEvent[];
}

/** Builds the chronological list of everything that has happened to a
 * transaction, from real event timestamps, not an assumed fixed sequence
 * (Section 23-25 of the financial-logic spec). A historical event (e.g. a
 * dispute being raised) is always included even after a later event (e.g.
 * that dispute being won) occurs, callers must not regenerate/replace past
 * entries based on the transaction's current status. This only produces
 * data, it does not render anything, see TransactionDetailFeature's own
 * PaymentTimeline/buildDisputeTimelineSteps for the existing UI. */
export function generateTimelineEvents({
  currency,
  originalAmount,
  paymentInitiatedAt,
  paymentBucket,
  refundEvents,
  disputeEvents,
  settlementEvents,
}: GenerateTimelineInput): TimelineEventRecord[] {
  const events: TimelineEventRecord[] = [];

  events.push({
    type: "PAYMENT_INITIATED",
    timestamp: paymentInitiatedAt,
    amount: originalAmount,
    currency,
  });

  if (paymentBucket === "failed") {
    events.push({
      type: "PAYMENT_FAILED",
      timestamp: paymentInitiatedAt,
      amount: originalAmount,
      currency,
    });
  } else if (paymentBucket === "success") {
    events.push({
      type: "PAYMENT_CAPTURED",
      timestamp: paymentInitiatedAt,
      amount: originalAmount,
      currency,
    });
  }

  for (const settlement of settlementEvents) {
    if (settlement.status === "SETTLED") {
      events.push({
        type: "PAYMENT_SETTLED",
        timestamp: settlement.settledOnDate ?? paymentInitiatedAt,
        amount: settlement.amount,
        currency: settlement.currency,
        settlementId: settlement.id,
      });
    }
  }

  for (const refund of refundEvents) {
    events.push({
      type: "REFUND_INITIATED",
      timestamp: refund.createdAt,
      amount: refund.amount,
      currency: refund.currency,
      refundId: refund.id,
    });
    if (refund.status === "SUCCEEDED") {
      events.push({
        type: "REFUND_SUCCEEDED",
        timestamp: refund.createdAt,
        amount: refund.amount,
        currency: refund.currency,
        refundId: refund.id,
      });
    } else if (refund.status === "FAILED") {
      events.push({
        type: "REFUND_FAILED",
        timestamp: refund.createdAt,
        amount: refund.amount,
        currency: refund.currency,
        refundId: refund.id,
      });
    }
  }

  for (const dispute of disputeEvents) {
    events.push({
      type: "DISPUTE_RAISED",
      timestamp: dispute.raisedOn,
      amount: dispute.amount,
      currency: dispute.currency,
      disputeId: dispute.id,
    });

    if (dispute.documents && dispute.documents.length > 0) {
      events.push({
        type: "EVIDENCE_SUBMITTED",
        timestamp: dispute.evidenceSubmittedOn ?? dispute.resolvedOn ?? dispute.raisedOn,
        disputeId: dispute.id,
      });
    }

    if (dispute.status === "WON") {
      events.push({
        type: "DISPUTE_WON",
        timestamp: dispute.resolvedOn ?? dispute.raisedOn,
        amount: dispute.amount,
        currency: dispute.currency,
        disputeId: dispute.id,
      });
      events.push({
        type: "FUNDS_REINSTATED",
        timestamp: dispute.resolvedOn ?? dispute.raisedOn,
        amount: dispute.amount,
        currency: dispute.currency,
        disputeId: dispute.id,
      });
    } else if (dispute.status === "LOST") {
      events.push({
        type: "DISPUTE_LOST",
        timestamp: dispute.resolvedOn ?? dispute.raisedOn,
        amount: dispute.amount,
        currency: dispute.currency,
        disputeId: dispute.id,
      });
      events.push({
        type: "FUNDS_WITHDRAWN",
        timestamp: dispute.resolvedOn ?? dispute.raisedOn,
        amount: dispute.amount,
        currency: dispute.currency,
        disputeId: dispute.id,
      });
    }
  }

  // Stable sort by real timestamp, ties (same recorded time) keep their
  // push order above, which already lists a given moment's payment event
  // before its child events.
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const diff =
        parseFormattedTimestamp(a.event.timestamp) - parseFormattedTimestamp(b.event.timestamp);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(({ event }) => event);
}

/** The single centralized timeline builder (Section 13 of the "Transaction
 * Status and Timeline Must Always Stay in Sync" spec): reads the exact same
 * financials (refunds/disputes/settlements) getDisplayStatus/
 * deriveTransactionStatus already read, so the header status and this
 * timeline can never disagree, this fixes the previous bug where a
 * "Partially refunded" header could sit above a timeline that stopped at
 * "Settled". Presentation-agnostic (no JSX), the UI layer
 * (TransactionDetailFeature's buildTransactionTimelineSteps) turns each
 * entry into whatever it actually renders (formatted currency/dates, the
 * "View settlement" link, etc). Historical events are never rewritten based
 * on the transaction's CURRENT status, only the trailing entry (if any)
 * reflects "what's happening right now", see TimelineStepData's own doc
 * comment. */
export function deriveTimelineSteps(financials: TransactionFinancials): TimelineStepData[] {
  const { timelineEvents, disputeEvents, refundEvents, settlementEvents, originalAmount } =
    financials;
  const settlementById = new Map(settlementEvents.map((s) => [s.id, s] as const));
  const refundById = new Map(refundEvents.map((r) => [r.id, r] as const));
  const disputeById = new Map(disputeEvents.map((d) => [d.id, d] as const));
  const hasCapturedOrFailedEvent = timelineEvents.some(
    (e) => e.type === "PAYMENT_CAPTURED" || e.type === "PAYMENT_FAILED"
  );

  const steps: TimelineStepData[] = [];
  let refundedSoFar = 0;
  let sawSuccessfulRefund = false;

  for (const event of timelineEvents) {
    switch (event.type) {
      case "PAYMENT_INITIATED":
        // PAYMENT_CAPTURED/PAYMENT_FAILED (same timestamp) already cover a
        // resolved payment, this only needs its own step while still
        // pending.
        if (!hasCapturedOrFailedEvent) {
          steps.push({
            id: "payment-initiated",
            label: "Payment started",
            state: "current",
            timestamp: event.timestamp,
          });
        }
        break;
      case "PAYMENT_CAPTURED":
        steps.push({
          id: "payment-captured",
          label: "Payment captured",
          state: "complete",
          timestamp: event.timestamp,
        });
        break;
      case "PAYMENT_FAILED":
        steps.push({
          id: "payment-failed",
          label: "Payment failed",
          state: "danger",
          timestamp: event.timestamp,
        });
        break;
      case "PAYMENT_SETTLED": {
        const settlement = event.settlementId ? settlementById.get(event.settlementId) : undefined;
        steps.push({
          id: `settled-${event.settlementId ?? event.timestamp}`,
          label: "Settled",
          state: "complete",
          timestamp: event.timestamp,
          amount: event.amount,
          currency: event.currency,
          utrNumber: settlement?.utrNumber,
          settlementReportId: settlement?.settlementReportId,
        });
        break;
      }
      case "REFUND_INITIATED": {
        // A refund still PENDING gets its own step here, one that goes on
        // to SUCCEED/FAIL is instead represented by that terminal event
        // below (same moment, no need to show both).
        const refund = event.refundId ? refundById.get(event.refundId) : undefined;
        if (refund?.status === "PENDING") {
          steps.push({
            id: `refund-initiated-${event.refundId}`,
            label: "Refund initiated",
            state: "current",
            timestamp: event.timestamp,
            amount: event.amount,
            currency: event.currency,
          });
        }
        break;
      }
      case "REFUND_SUCCEEDED": {
        refundedSoFar += event.amount ?? 0;
        const isFullyRefunded = refundedSoFar >= originalAmount;
        steps.push({
          id: `refund-${event.refundId}`,
          label: isFullyRefunded ? "Refunded" : "Partially refunded",
          state: "complete",
          timestamp: event.timestamp,
          amount: event.amount,
          currency: event.currency,
          isAdditionalRefund: sawSuccessfulRefund,
        });
        sawSuccessfulRefund = true;
        break;
      }
      case "REFUND_FAILED":
        steps.push({
          id: `refund-failed-${event.refundId}`,
          label: "Refund failed",
          state: "danger",
          timestamp: event.timestamp,
          amount: event.amount,
          currency: event.currency,
        });
        break;
      case "DISPUTE_RAISED": {
        const dispute = event.disputeId ? disputeById.get(event.disputeId) : undefined;
        steps.push({
          id: `dispute-raised-${event.disputeId}`,
          label: "Dispute raised",
          state: "complete",
          timestamp: event.timestamp,
          amount: event.amount,
          currency: event.currency,
          reason: dispute?.reason,
          reasonCode: dispute?.reasonCode,
        });
        break;
      }
      case "EVIDENCE_SUBMITTED":
        steps.push({
          id: `evidence-submitted-${event.disputeId}`,
          label: "Evidence submitted",
          state: "complete",
          timestamp: event.timestamp,
        });
        break;
      case "DISPUTE_WON":
        steps.push({
          id: `dispute-won-${event.disputeId}`,
          label: "Dispute won",
          state: "complete",
          timestamp: event.timestamp,
        });
        break;
      case "DISPUTE_LOST":
        steps.push({
          id: `dispute-lost-${event.disputeId}`,
          label: "Dispute lost",
          state: "danger",
          timestamp: event.timestamp,
        });
        break;
      case "FUNDS_WITHDRAWN":
      case "FUNDS_REINSTATED":
        // Already communicated by Dispute won/lost immediately above (same
        // moment), not its own step in this timeline.
        break;
    }
  }

  // Trailing "what's happening right now" entries, not historical events,
  // see TimelineStepData's own doc comment, settlement first (matches this
  // function's previous UI-side ordering), then any still-open dispute.
  const pendingSettlement = settlementEvents.find((s) => s.status === "PENDING");
  if (pendingSettlement) {
    steps.push({
      id: "settlement-in-progress",
      label: "Settlement in progress",
      state: "current",
      expectedOnDate: pendingSettlement.expectedOnDate,
    });
  }

  const activeDispute = disputeEvents.find(isDisputeActive);
  if (activeDispute) {
    const id = `dispute-current-${activeDispute.id}`;
    if (activeDispute.status === "UNDER_REVIEW") {
      steps.push({
        id,
        label: activeDispute.reviewPhase === "BANK_REVIEW" ? "Bank review" : "Under review",
        state: "current",
      });
    } else if (activeDispute.status === "INSUFFICIENT_DOCUMENTS") {
      steps.push({ id, label: "Insufficient documents", state: "current" });
    } else {
      steps.push({
        id,
        label: "Awaiting your response",
        state: "current",
        respondBy: activeDispute.respondBy,
      });
    }
  }

  return steps;
}

/** One dispute's own slice of the parent timeline (Section 23 of the
 * parent-child transaction model spec: "child timelines represent that
 * child's lifecycle", not the whole parent's), reusing deriveTimelineSteps'
 * own event/label/ordering logic rather than a second implementation, just
 * filtered down to the entries that belong to `disputeId`. */
export function deriveDisputeOnlyTimelineSteps(
  financials: TransactionFinancials,
  disputeId: string
): TimelineStepData[] {
  return deriveTimelineSteps(financials).filter(
    (step) =>
      step.id === `dispute-raised-${disputeId}` ||
      step.id === `evidence-submitted-${disputeId}` ||
      step.id === `dispute-won-${disputeId}` ||
      step.id === `dispute-lost-${disputeId}` ||
      step.id === `dispute-current-${disputeId}`
  );
}
