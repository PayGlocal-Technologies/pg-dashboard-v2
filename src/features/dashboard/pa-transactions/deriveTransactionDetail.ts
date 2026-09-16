import { getDisputeReasonMeta } from "@/features/dashboard/pa-transactions/disputeReasonMeta";
import { buildLinkedChildRows } from "@/features/dashboard/pa-transactions/linkedChildRecords";
import { settlementRows } from "@/features/dashboard/settlement-reports/mock-data";
import { derivePaymentBucket } from "@/features/dashboard/pa-transactions/status/paymentBucket";
import { deriveTransactionStatusChip } from "@/features/dashboard/pa-transactions/status/transactionStatus";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";
import {
  getDisputedAmount,
  getActiveDisputeAmount,
  getChargedBackDisputeAmount,
  getClearedDisputeAmount,
  getFailedRefundAmount,
  getNetAmount,
  getProcessingRefundAmount,
  getRefundedAmount,
  getRemainingAmount,
  getSettledAmount,
} from "@/features/dashboard/pa-transactions/financial/deriveFinancials";
import { generateTimelineEvents } from "@/features/dashboard/pa-transactions/financial/generateTimeline";
import type {
  DisputeEvent,
  DisputeEventStatus,
  RefundEvent,
  SettlementEvent,
  TransactionFinancials,
} from "@/features/dashboard/pa-transactions/financial/types";

// TODO(integration): the search-result row (PaTransaction) only carries the
// fields the list needs. A handful of fields below, issuer bank, merchant
// txn ID, customer phone/address/comments, UTR, settled-to account, have no
// source on this type yet and are deterministically derived per-row purely
// for this preview. Replace deriveTransactionDetail() with a real call to a
// transaction-detail endpoint (see TransactionDetailResponse in types.ts,
// already modeled after pg-dashboard's track-transactions contract) once one
// exists, instead of guessing the shape further.
//
// Shared by TransactionDetailsDrawer and TransactionDetailFeature (the full
// page reached via the drawer's Expand button) so both always show the exact
// same data for a given transaction.

const ISSUER_BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "State Bank of India",
  "Kotak Mahindra Bank",
];
const SETTLEMENT_ACCOUNTS = ["HDFC ****4521", "ICICI ****7789", "Axis ****3312"];
const ADDRESS_POOL = [
  "482 Anna Salai, Chennai, Tamil Nadu 600002, India",
  "14 Residency Road, Bengaluru, Karnataka 560025, India",
  "27 Marine Drive, Mumbai, Maharashtra 400020, India",
  "9 Park Street, Kolkata, West Bengal 700016, India",
];
const COMMENT_POOL = [
  "Customer requested invoice via email.",
  "First time customer, verified via OTP.",
  "Repeat customer, no additional checks needed.",
  "",
];

/** Reference code shown in Status Notes for failed/expired payments. Raw
 * externalStatus (normalized like derivePaymentBucket does) -> code.
 * Statuses not listed here fall back to a generic code in deriveErrorCode(). */
const ERROR_CODES: Record<string, string> = {
  ISSUER_DECLINE: "E1001",
  GENERAL_DECLINE: "E1002",
  CUSTOMER_CANCELLED: "E1003",
  AUTHENTICATION_TIMEOUT: "E1004",
  AUTHENTICATION_FAILED: "E1005",
  ALTPAY_DECLINE: "E1006",
  MARKED_AS_FRAUD: "E1007",
  SYSTEM_DECLINED: "E1008",
  ABANDONED: "E1009",
  SYSTEM_ERROR: "E5001",
  REQUEST_ERROR: "E4001",
  CONFIG_ERROR: "E4002",
  EXPIRED: "E1010",
};

/** Only a payment that never completed gets an error code, gated on the
 * same payment bucket that drives Status Notes' reason text and border
 * color. */
function deriveErrorCode(
  raw: string | undefined,
  bucket: "in_flight" | "failed" | "expired" | "success"
): string | undefined {
  if (bucket !== "failed" && bucket !== "expired") return undefined;
  const key = raw?.toUpperCase().replace(/ /g, "_") ?? "";
  return ERROR_CODES[key] ?? "E1000";
}

/** Every dispute status (see status/disputeStatus.ts), the reason assumed
 * for a dispute with no structured data of its own (real, not-yet-migrated
 * API data whose raw externalStatus happens to already BE one of these 8
 * values, see the disputeEvents fallback below). Its reasonCode/
 * description/merchant label come from the shared getDisputeReasonMeta
 * lookup, not duplicated here. */
const STATUS_DEFAULT_REASON: Record<string, string> = {
  NEEDS_RESPONSE: "Fraudulent",
  UNDER_REVIEW: "Product not received",
  MORE_EVIDENCE_NEEDED: "Fraudulent",
  REOPENED: "Fraudulent",
  CLEARED: "Duplicate processing",
  CHARGED_BACK: "Credit not processed",
  ACCEPTED: "Duplicate processing",
  EXPIRED: "Fraudulent",
};

const DISPUTE_STATUS_VALUES = new Set(Object.keys(STATUS_DEFAULT_REASON));

function seedFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** "07/08/2026, 08:47:05" + 1 day -> "08/08/2026, 08:47:05". Deterministic
 * (derived from the transaction's own timestamp, not the current time), so
 * it's safe to call during render, see CLAUDE.md's Date.now() purity rule. */
function addDaysToFormatted(value: string | undefined, days: number): string {
  if (!value) return "Not available";
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  const [day, month, year] = (datePart ?? "").split("/").map(Number);
  if (!day || !month || !year) return "Not available";
  const [hours, minutes, seconds] = (timePart ?? "00:00:00").split(":").map(Number);
  const d = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Illustrative MDR-style fee, not a real fee schedule.
const FEE_RATE = 0.018;

function paymentCategoryLabel(instrument?: string): string {
  const key = instrument?.toUpperCase() ?? "";
  if (key.includes("UPI")) return "UPI Payment";
  if (key.includes("NETBANKING")) return "Net Banking Payment";
  if (key.includes("WALLET")) return "Wallet Payment";
  return "Card Payment";
}

export interface TransactionDetailView {
  merchantTxnId: string;
  paymentCategory: string;
  cardType?: string;
  issuerBank: string;
  customerPhone: string;
  customerAddress: string;
  comments: string;
  statusReason: string;
  /** Only set for failed/refunded transactions, see deriveErrorCode(). */
  errorCode?: string;
  settlement:
    | { applicable: false }
    | {
        applicable: true;
        isSettled: true;
        settledOnDate: string;
        utrNumber: string;
        settledToAccount: string;
        settlementId: string;
      }
    | {
        applicable: true;
        isSettled: false;
        expectedOnDate: string;
      };
  /** This transaction's own refund/dispute children, as display rows (see
   * buildLinkedChildRows), never independent transactions, see
   * PaTransaction.linkedRecordType. "Other transactions from this
   * customer" has no index to query yet, so this never includes any. */
  linkedTransactions: PaTransaction[];
  /** null for failed transactions, no funds actually moved. netAmount is
   * amountReceived - fee - refundedAmount (never disputedAmount, see
   * getNetAmount's own doc comment), the same refundedAmount financials.
   * refundedAmount already holds, so this can never disagree with the
   * header status or timeline. */
  amountBreakdown: {
    amountReceived: number;
    fee: number;
    refundedAmount: number;
    disputedAmount: number;
    netAmount: number;
  } | null;
  /** The transaction's own first dispute (see PaTransaction.disputes), null
   * if it has none, drives DisputeActionCard/DisputeDetailsCard/
   * PaymentTimeline. Only the first dispute is surfaced here, matching the
   * current one-dispute-at-a-time UI, financials.disputeEvents below carries
   * the full list. */
  dispute: DisputeDetail | null;
  /** Refund/dispute/settlement child events plus every amount/status derived
   * from them, see the Unified Transaction ID & Financial Event Logic spec.
   * refundEvents combines the transaction's own mock-seeded row.refunds with
   * any session-issued ones passed via deriveTransactionDetail's second
   * argument (see useRefundEvents), disputeEvents/settlementEvents come
   * straight from row.disputes/row.settlements. */
  financials: TransactionFinancials;
}

export interface DisputeDetail {
  disputeId: string;
  amount: number;
  /** The dispute's own (scheme-level) reason string, e.g. "Duplicate
   * processing", shown as secondary metadata next to reasonCode, not the
   * primary heading, see merchantLabel below. */
  reason: string;
  reasonCode: string;
  /** Short, concise, merchant-facing label derived from `reason` via
   * getDisputeReasonMeta, e.g. "Duplicate charge", the PRIMARY heading a
   * merchant should see first (see DisputeActionCard), never invented
   * per-dispute, always derived from the same reason data reasonCode/
   * description come from. */
  merchantLabel: string;
  /** Longer sentence shown in DisputeActionCard, e.g. "The cardholder claims
   * they did not authorise this purchase." */
  description: string;
  /** Formatted like row.formattedCreationDateTime ("DD/MM/YYYY, HH:MM:SS"). */
  raisedOn: string;
  respondBy: string;
}

export function deriveTransactionDetail(
  row: PaTransaction,
  /** Session-issued refund events not yet folded into row.refunds (see
   * useRefundEvents), merged with row's own refunds below. Defaults to none
   * so every existing call site keeps working unchanged (Section 34
   * backwards-compatibility: no extra refunds recorded === []). */
  additionalRefundEvents: RefundEvent[] = []
): TransactionDetailView {
  const seed = seedFromString(row.gid ?? row.formattedCreationDateTime ?? "txn");
  const transactionId = row.gid ?? "";
  const currency = row.txnCurrency ?? "INR";
  const amountReceived = parseFloat(row.totalAmount ?? "0");

  // Real, not-yet-migrated API data with no structured disputes[] of its
  // own can still have its raw externalStatus already BE one of the 8
  // dispute-vocabulary values (see the disputeEvents fallback below); when
  // that's the case, the underlying PAYMENT itself is treated as
  // successful (a dispute can only exist on a payment that was collected),
  // never as still in-flight/failed/expired.
  const rawKey = row.externalStatus?.toUpperCase().replace(/ /g, "_") ?? "";
  const isRawDisputeStatus = DISPUTE_STATUS_VALUES.has(rawKey);
  const paymentBucket = isRawDisputeStatus ? "success" : derivePaymentBucket(row.externalStatus);

  const statusReason = isRawDisputeStatus
    ? "Additional verification is in progress for this payment."
    : paymentBucket === "success"
      ? "Payment completed successfully."
      : paymentBucket === "failed" || paymentBucket === "expired"
        ? `Payment declined${row.message ? `: ${row.message}` : "."}`
        : "Payment is still being processed.";

  const errorCode = deriveErrorCode(row.externalStatus, paymentBucket);

  const fee = Math.round(amountReceived * FEE_RATE * 100) / 100;
  // Fee-only net, used below for the settlement fallback's own synthesized
  // amount (what was actually settled AT THAT TIME), deliberately NOT
  // refund-adjusted, a later refund must never shrink a historical
  // settlement, see Section 9 of the Payment Breakdown spec. The Payment
  // Breakdown's own (refund-adjusted) netAmount is computed further down,
  // once refundedAmount is known.
  const feeAdjustedAmount = Math.round((amountReceived - fee) * 100) / 100;

  // "Other transactions from this customer" has no index to query yet, see
  // TransactionDetailView's own doc comment on this field.
  const linkedTransactions: PaTransaction[] = [];

  // Settlement: the transaction's own settlements[] (see PaTransaction) is
  // the real source of truth. Rows that don't carry one yet (most of this
  // mock set, and any real, not-yet-migrated API data) fall back to the
  // same deterministic synthesis this function always used, so nothing
  // regresses for a transaction this task didn't touch.
  let settlement: TransactionDetailView["settlement"];
  let settlementEvents: SettlementEvent[];
  if (row.settlements && row.settlements.length > 0) {
    settlementEvents = row.settlements;
    const first = row.settlements[0]!;
    settlement =
      first.status === "SETTLED"
        ? {
            applicable: true,
            isSettled: true,
            settledOnDate: first.settledOnDate ?? "Not available",
            utrNumber: first.utrNumber ?? "Not available",
            settledToAccount: first.settledToAccount ?? "Not available",
            settlementId: first.settlementReportId ?? "",
          }
        : {
            applicable: true,
            isSettled: false,
            expectedOnDate: first.expectedOnDate ?? "Not available",
          };
  } else if (paymentBucket === "success") {
    const isSettled = seed % 3 !== 0;
    settlement = isSettled
      ? {
          applicable: true,
          isSettled: true,
          settledOnDate: addDaysToFormatted(row.formattedCreationDateTime, 1),
          utrNumber: `UTR${100000 + (seed % 900000)}`,
          settledToAccount: SETTLEMENT_ACCOUNTS[seed % SETTLEMENT_ACCOUNTS.length]!,
          settlementId: settlementRows[seed % settlementRows.length]!.id,
        }
      : {
          applicable: true,
          isSettled: false,
          expectedOnDate: addDaysToFormatted(row.formattedCreationDateTime, 1),
        };
    settlementEvents = [
      {
        id: `${transactionId}-settlement`,
        transactionId,
        amount: feeAdjustedAmount,
        currency,
        status: settlement.isSettled ? "SETTLED" : "PENDING",
        settledOnDate: settlement.isSettled ? settlement.settledOnDate : undefined,
        utrNumber: settlement.isSettled ? settlement.utrNumber : undefined,
        settledToAccount: settlement.isSettled ? settlement.settledToAccount : undefined,
        settlementReportId: settlement.isSettled ? settlement.settlementId : undefined,
        expectedOnDate: settlement.isSettled ? undefined : settlement.expectedOnDate,
      },
    ];
  } else {
    settlement = { applicable: false };
    settlementEvents = [];
  }

  // Dispute: the transaction's own disputes[] is the real source of truth.
  // A row with no structured disputes[] but a raw status that already IS
  // one of the 8 dispute-vocabulary values (real, not-yet-migrated API
  // data) falls back to the same deterministic synthesis this function
  // always used.
  let disputeEvents: DisputeEvent[];
  if (row.disputes && row.disputes.length > 0) {
    disputeEvents = row.disputes;
  } else if (isRawDisputeStatus) {
    const defaultReason = STATUS_DEFAULT_REASON[rawKey] ?? STATUS_DEFAULT_REASON.NEEDS_RESPONSE!;
    const reasonMeta = getDisputeReasonMeta(defaultReason);
    // Disputes are typically filed some days after the original charge, not
    // the same instant, raisedOn is offset from the payment date so the
    // Payment Timeline reads as a real sequence of events.
    const raisedOn = addDaysToFormatted(row.formattedCreationDateTime, 2 + (seed % 5));
    const respondBy = addDaysToFormatted(raisedOn, 6);
    disputeEvents = [
      {
        id: `du_${seed.toString(36)}${(row.gid ?? "").slice(-6).replace(/[^a-zA-Z0-9]/g, "")}`,
        transactionId,
        amount: amountReceived,
        currency,
        reason: defaultReason,
        reasonCode: reasonMeta.reasonCode,
        description: reasonMeta.description,
        status: rawKey as DisputeEventStatus,
        raisedOn,
        respondBy,
        resolvedOn:
          rawKey === "CLEARED" ||
          rawKey === "CHARGED_BACK" ||
          rawKey === "ACCEPTED" ||
          rawKey === "EXPIRED"
            ? respondBy
            : undefined,
      },
    ];
  } else {
    disputeEvents = [];
  }

  const dispute: DisputeDetail | null = disputeEvents[0]
    ? {
        disputeId: disputeEvents[0].id,
        amount: disputeEvents[0].amount,
        reason: disputeEvents[0].reason,
        reasonCode: disputeEvents[0].reasonCode,
        merchantLabel: getDisputeReasonMeta(disputeEvents[0].reason).merchantLabel,
        description: disputeEvents[0].description,
        raisedOn: disputeEvents[0].raisedOn,
        respondBy: disputeEvents[0].respondBy ?? disputeEvents[0].raisedOn,
      }
    : null;

  // Refunds: this transaction's own mock-seeded refunds plus any issued this
  // session (see useRefundEvents), never a separate merchant-facing
  // transaction for either.
  const refundEvents: RefundEvent[] = [...(row.refunds ?? []), ...additionalRefundEvents];

  const refundedAmount = getRefundedAmount(refundEvents);
  const hasProcessingRefund = refundEvents.some((r) => r.status === "PROCESSING");
  const activeDisputeAmount = getActiveDisputeAmount(disputeEvents);
  const disputedAmount = getDisputedAmount(disputeEvents);
  // Uses the fully-resolved refund/dispute arrays (mock-seeded + session-
  // issued refunds, real or fallback-synthesized disputes), not just
  // row.refunds/row.disputes, so a refund issued this session shows up
  // immediately, see buildLinkedChildRows's own doc comment.
  linkedTransactions.push(...buildLinkedChildRows(row, refundEvents, disputeEvents));
  const derivedTransactionStatus = deriveTransactionStatusChip({
    paymentBucket,
    originalAmount: amountReceived,
    refundedAmount,
    hasProcessingRefund,
    disputeEvents,
  });

  // Payment Breakdown: same refundedAmount/disputedAmount financials
  // exposes below, computed here rather than duplicated in the component
  // (see getNetAmount's own doc comment on why disputedAmount is shown but
  // never subtracted).
  const amountBreakdown: TransactionDetailView["amountBreakdown"] =
    paymentBucket === "failed" || paymentBucket === "expired"
      ? null
      : {
          amountReceived,
          fee,
          refundedAmount,
          disputedAmount,
          netAmount: getNetAmount(amountReceived, fee, refundedAmount),
        };

  const financials: TransactionFinancials = {
    transactionId,
    originalAmount: amountReceived,
    currency,
    refundEvents,
    disputeEvents,
    settlementEvents,
    refundedAmount,
    processingRefundAmount: getProcessingRefundAmount(refundEvents),
    failedRefundAmount: getFailedRefundAmount(refundEvents),
    settledAmount: getSettledAmount(settlementEvents),
    disputedAmount,
    activeDisputeAmount,
    clearedDisputeAmount: getClearedDisputeAmount(disputeEvents),
    chargedBackDisputeAmount: getChargedBackDisputeAmount(disputeEvents),
    remainingAmount: getRemainingAmount(amountReceived, refundedAmount),
    derivedTransactionStatus,
    timelineEvents: generateTimelineEvents({
      currency,
      originalAmount: amountReceived,
      paymentInitiatedAt: row.formattedCreationDateTime ?? "",
      paymentBucket,
      refundEvents,
      disputeEvents,
      settlementEvents,
    }),
  };

  return {
    merchantTxnId: row.gid ?? "Not available",
    paymentCategory: paymentCategoryLabel(row.paymentInstrument),
    cardType: row.cardBrand,
    issuerBank: ISSUER_BANKS[seed % ISSUER_BANKS.length]!,
    customerPhone: `+91 ${9000000000 + (seed % 99999999)}`,
    customerAddress: ADDRESS_POOL[seed % ADDRESS_POOL.length]!,
    comments: COMMENT_POOL[seed % COMMENT_POOL.length]!,
    statusReason,
    errorCode,
    settlement,
    linkedTransactions,
    amountBreakdown,
    dispute,
    financials,
  };
}
