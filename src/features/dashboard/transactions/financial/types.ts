// ── Financial event model ───────────────────────────────────────────────────
// A PaTransaction (see @/features/dashboard/transactions/types) is the single
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

export type RefundEventStatus = "PENDING" | "SUCCEEDED" | "FAILED";

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

/** Same 6-status vocabulary already established for disputed PA transactions
 * (see DISPUTE_STATUS_KEYS in paColumns.tsx and DisputeRawStatus in
 * dispute-management/types.ts), reused rather than introducing a second
 * dispute status enum. DISPUTED and NEEDS_ACTION are two raw values for the
 * same merchant-facing state (see PA_STATUS_META), both display as "Action
 * required". INSUFFICIENT_DOCUMENTS is reached only once PayGlocal has
 * reviewed submitted evidence and found it inadequate, distinct from the
 * initial "Action required" state. */
export type DisputeEventStatus =
  "DISPUTED" | "NEEDS_ACTION" | "UNDER_REVIEW" | "INSUFFICIENT_DOCUMENTS" | "WON" | "LOST";

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
  /** Set once status moves to WON or LOST. */
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
}

/** The 4 distinct concepts a single `externalStatus` string currently
 * conflates (see paColumns.tsx's getStatusBucket). This type only names the
 * "current overall state" one (transaction status), payment/financial/action
 * state are represented by amountBreakdown/derived amounts and UI logic
 * (disputeAwaitingDecision, canRefund) that already exist and are untouched. */
export type DerivedTransactionStatus =
  | "FAILED"
  | "PENDING"
  | "SUCCESSFUL"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "DISPUTED"
  | "PARTIALLY_DISPUTED"
  | "REFUNDED_AND_DISPUTED"
  | "PARTIALLY_REFUNDED_AND_DISPUTED";

export type TimelineEventType =
  | "PAYMENT_INITIATED"
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_FAILED"
  | "PAYMENT_SETTLED"
  | "REFUND_INITIATED"
  | "REFUND_SUCCEEDED"
  | "REFUND_FAILED"
  | "DISPUTE_RAISED"
  | "EVIDENCE_SUBMITTED"
  | "DISPUTE_WON"
  | "DISPUTE_LOST"
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
  pendingRefundAmount: number;
  failedRefundAmount: number;
  settledAmount: number;
  disputedAmount: number;
  activeDisputeAmount: number;
  wonDisputeAmount: number;
  lostDisputeAmount: number;
  remainingAmount: number;
  derivedTransactionStatus: DerivedTransactionStatus;
  timelineEvents: TimelineEventRecord[];
}
