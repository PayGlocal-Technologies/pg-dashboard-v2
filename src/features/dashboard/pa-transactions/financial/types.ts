// ── Financial event model ───────────────────────────────────────────────────
// A PaTransaction (see @/features/dashboard/pa-transactions/types) is the single
// merchant-facing Transaction. Refunds, disputes and settlements are child
// events that reference it via `transactionId` (the transaction's own `gid`)
// and never carry or create their own merchant-facing transaction ID.
//
// These types and the functions in deriveFinancials.ts/generateTimeline.ts
// are additive: existing consumers (PaTransaction, TransactionDetailView,
// getStatusBucket/getStatusMeta) are unchanged, this is a layer on top used
// to compute derived amounts/status/timeline without duplicating that logic
// across components (see CLAUDE.md-adjacent project convention of a single
// source of truth per concern).

import type { TransactionStatusKey } from "@/features/dashboard/pa-transactions/status/transactionStatus";

/** See status/refundStatus.ts for the display meta. PROCESSING/COMPLETED are
 * the renamed PENDING/SUCCEEDED, matching the status-vocabulary spec's own
 * refund chip vocabulary 1:1 (a real rename, not a relabeled-but-still-
 * transient state: these 3 values ARE the spec's approved refund chips). */
export type RefundEventStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export interface RefundEvent {
  id: string;
  /** FK to the original transaction's gid. Never a new merchant-facing ID. */
  transactionId: string;
  /** Same decimal-string-parsed-to-number convention as PaTransaction.totalAmount. */
  amount: number;
  currency: string;
  status: RefundEventStatus;
  reason?: string;
  details?: string;
  /** "DD/MM/YYYY, HH:MM:SS", same format as PaTransaction.formattedCreationDateTime. */
  createdAt: string;
}

export type SettlementEventStatus = "PENDING" | "SETTLED";

export interface SettlementEvent {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: SettlementEventStatus;
  /** Set once status is "SETTLED". */
  settledOnDate?: string;
  utrNumber?: string;
  settledToAccount?: string;
  /** Links to the existing settlement-report detail page, see
   * TransactionDetailFeature's goToSettlement(). */
  settlementReportId?: string;
  /** Expected date while still PENDING. */
  expectedOnDate?: string;
}

/** Same 8-status vocabulary already established for disputed PA transactions
 * (see status/disputeStatus.ts and DisputeRawStatus in
 * dispute-management/types.ts), reused rather than introducing a second
 * dispute status enum. NEEDS_RESPONSE covers both "just raised" and
 * "documents still needed" (the merged old DISPUTED/NEEDS_ACTION). CLEARED/
 * CHARGED_BACK are the renamed WON/LOST. ACCEPTED (merchant chose not to
 * contest) and REOPENED/EXPIRED are new, see status/disputeStatus.ts's own
 * doc comments for why ACCEPTED is tracked separately from CHARGED_BACK. */
export type DisputeEventStatus =
  | "NEEDS_RESPONSE"
  | "UNDER_REVIEW"
  | "MORE_EVIDENCE_NEEDED"
  | "REOPENED"
  | "CLEARED"
  | "CHARGED_BACK"
  | "ACCEPTED"
  | "EXPIRED";

export interface DisputeEvent {
  id: string;
  transactionId: string;
  /** The disputed amount as originally raised. Never reduced by a later
   * refund, even a full one, see Section 18 of the financial-logic spec:
   * a dispute can legitimately equal or exceed originalAmount - refundedAmount. */
  amount: number;
  currency: string;
  reason: string;
  reasonCode: string;
  description: string;
  status: DisputeEventStatus;
  raisedOn: string;
  respondBy?: string;
  /** Set once status moves to a resolved/terminal value (CLEARED,
   * CHARGED_BACK, ACCEPTED, EXPIRED). */
  resolvedOn?: string;
  /** File names submitted as evidence, see DisputeRespondForm's onSubmit. */
  documents?: string[];
  /** When documents was actually set (see withDisputeStatus in
   * TransactionDetailFeature), used by generateTimelineEvents for the
   * EVIDENCE_SUBMITTED entry's own timestamp, falls back to raisedOn/
   * resolvedOn for mock data that doesn't set this explicitly. */
  evidenceSubmittedOn?: string;
  /** Only meaningful while status is "UNDER_REVIEW": which side is
   * currently reviewing the submitted evidence. Undefined means
   * "PAYGLOCAL_REVIEW", PayGlocal's own internal review immediately after
   * submission, before a representation is forwarded to the issuing bank.
   * Set by withDisputeStatus whenever a fresh submission restarts review. */
  reviewPhase?: "PAYGLOCAL_REVIEW" | "BANK_REVIEW";
  /** The dispute's broader stage in the card-network process, separate from
   * `reviewPhase` (a narrower PayGlocal-vs-bank detail only meaningful
   * during UNDER_REVIEW). Shown as its own badge, never merged into the
   * status, see status/disputeStatus.ts's DISPUTE_PHASE_META. */
  disputePhase?: "INQUIRY" | "CHARGEBACK" | "PRE_ARBITRATION" | "ARBITRATION";
}

export type TimelineEventType =
  | "PAYMENT_INITIATED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_FAILED"
  | "PAYMENT_EXPIRED"
  | "PAYMENT_SETTLED"
  | "REFUND_INITIATED"
  | "REFUND_COMPLETED"
  | "REFUND_FAILED"
  | "DISPUTE_RAISED"
  | "EVIDENCE_SUBMITTED"
  | "DISPUTE_CLEARED"
  | "DISPUTE_CHARGED_BACK"
  | "DISPUTE_ACCEPTED"
  | "DISPUTE_EXPIRED"
  | "FUNDS_WITHDRAWN"
  | "FUNDS_REINSTATED";

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export type TimelineStepState = "complete" | "current" | "danger";

/** One entry in the merchant-facing timeline (see deriveTimelineSteps),
 * presentation-agnostic, the UI layer (TransactionDetailFeature) maps this
 * into whatever step shape its timeline component actually renders. */
export interface TimelineStepData {
  /** Stable identity across renders, not just a display label (two refund
   * steps can share the exact same label, "Partially refunded"). */
  id: string;
  label: string;
  state: TimelineStepState;
  timestamp?: string;
  amount?: number;
  currency?: string;
  /** Only present on a "Settled" step. */
  utrNumber?: string;
  settlementReportId?: string;
  /** Only present on a successful-refund step that isn't the transaction's
   * first, see deriveTimelineSteps. */
  isAdditionalRefund?: boolean;
  /** Only present on the trailing "Awaiting your response" step. */
  respondBy?: string;
  /** Only present on the trailing "Settlement in progress" step. */
  expectedOnDate?: string;
  /** Only present on a "Dispute raised" step, the dispute's own reason
   * string/reason code, presentation (deriving a short merchant-facing
   * label from `reason`) is left to the UI layer, see
   * getDisputeReasonMeta. */
  reason?: string;
  reasonCode?: string;
}

export interface TimelineEventRecord {
  type: TimelineEventType;
  /** "DD/MM/YYYY, HH:MM:SS", used both for chronological sorting (via
   * parseFormattedTimestamp) and display. */
  timestamp: string;
  amount?: number;
  currency?: string;
  /** Which child event (if any) this entry was generated from. */
  refundId?: string;
  disputeId?: string;
  settlementId?: string;
}

/** The minimum data shape the transaction detail page/components need to
 * receive (not necessarily new UI to display it), see Section 26 of the
 * financial-logic spec. */
export interface TransactionFinancials {
  transactionId: string;
  originalAmount: number;
  currency: string;
  refundEvents: RefundEvent[];
  disputeEvents: DisputeEvent[];
  settlementEvents: SettlementEvent[];
  refundedAmount: number;
  /** Sum of refunds still PROCESSING (renamed from pendingRefundAmount). */
  processingRefundAmount: number;
  failedRefundAmount: number;
  settledAmount: number;
  disputedAmount: number;
  activeDisputeAmount: number;
  /** Sum of CLEARED disputes (renamed from wonDisputeAmount). */
  clearedDisputeAmount: number;
  /** Sum of disputes where money left the merchant: CHARGED_BACK, ACCEPTED
   * or EXPIRED (renamed from lostDisputeAmount, now covers all 3 reasons). */
  chargedBackDisputeAmount: number;
  remainingAmount: number;
  derivedTransactionStatus: TransactionStatusKey;
  timelineEvents: TimelineEventRecord[];
}
