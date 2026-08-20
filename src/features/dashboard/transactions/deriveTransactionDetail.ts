import { getStatusBucket, getStatusMeta } from "@/features/dashboard/transactions/paColumns";
import { settlementRows } from "@/features/dashboard/settlement-reports/mock-data";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

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

const ISSUER_BANKS = ["HDFC Bank", "ICICI Bank", "Axis Bank", "State Bank of India", "Kotak Mahindra Bank"];
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

/** Reference code shown in Status Notes for non-success statuses. Raw
 * externalStatus (normalized like getStatusMeta does) -> code. Statuses not
 * listed here fall back to a generic code per bucket in deriveErrorCode(). */
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
  SENT_FOR_REFUND: "R2001",
  REFUND_STARTED: "R2002",
};

/** Only failed/refunded transactions get an error code, gated on the same
 * status bucket that drives Status Notes' reason text and border color. */
function deriveErrorCode(raw: string | undefined, bucket: string): string | undefined {
  if (bucket !== "failed" && bucket !== "refunded") return undefined;
  const key = raw?.toUpperCase().replace(/ /g, "_") ?? "";
  return ERROR_CODES[key] ?? (bucket === "failed" ? "E1000" : "R2000");
}

/** Per raw dispute status (DISPUTED/UNDER_REVIEW/NEEDS_ACTION/WON/LOST, see
 * DISPUTE_STATUS_KEYS in paColumns.tsx), the reason a cardholder filed the
 * dispute, its card-network reason code, and the longer sentence shown in
 * DisputeActionCard. Statuses not listed here fall back to a generic
 * "Fraudulent" dispute, only the 5 dispute-bucket statuses ever reach this. */
const DISPUTE_REASON_META: Record<string, { reason: string; reasonCode: string; description: string }> = {
  DISPUTED: {
    reason: "Fraudulent",
    reasonCode: "10.4",
    description: "The cardholder claims they did not authorise this purchase.",
  },
  NEEDS_ACTION: {
    reason: "Fraudulent",
    reasonCode: "10.4",
    description: "The cardholder claims they did not authorise this purchase.",
  },
  UNDER_REVIEW: {
    reason: "Product not received",
    reasonCode: "13.1",
    description: "The cardholder claims they did not receive the goods or services purchased.",
  },
  WON: {
    reason: "Duplicate processing",
    reasonCode: "12.6",
    description: "The cardholder was charged more than once for the same purchase.",
  },
  LOST: {
    reason: "Credit not processed",
    reasonCode: "13.6",
    description: "The cardholder claims a refund or credit was not issued as expected.",
  },
};

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
  /** Same PaTransaction shape as the main table so the Linked Transactions
   * section can reuse buildPaColumns()/DataTable instead of a bespoke list. */
  linkedTransactions: PaTransaction[];
  /** null for failed transactions, no funds actually moved. */
  amountBreakdown: { amountReceived: number; fee: number; netAmount: number } | null;
  /** Only set for the 5 dispute-bucket statuses (see DISPUTE_STATUS_KEYS in
   * paColumns.tsx), drives DisputeActionCard/DisputeDetailsCard/PaymentTimeline. */
  dispute: DisputeDetail | null;
}

export interface DisputeDetail {
  disputeId: string;
  amount: number;
  reason: string;
  reasonCode: string;
  /** Longer sentence shown in DisputeActionCard, e.g. "The cardholder claims
   * they did not authorise this purchase." */
  description: string;
  /** Formatted like row.formattedCreationDateTime ("DD/MM/YYYY, HH:MM:SS"). */
  raisedOn: string;
  respondBy: string;
}

export function deriveTransactionDetail(row: PaTransaction): TransactionDetailView {
  const seed = seedFromString(row.gid ?? row.formattedCreationDateTime ?? "txn");
  const bucket = getStatusBucket(row.externalStatus);
  const statusLabel = getStatusMeta(row.externalStatus).label;

  const statusReason =
    bucket === "success"
      ? `Payment ${statusLabel.toLowerCase()} successfully.`
      : bucket === "failed"
        ? `Payment declined${row.message ? `: ${row.message}` : "."}`
        : bucket === "refunded"
          ? (row.message ?? "Refund processed for this payment.")
          : "Additional verification is in progress for this payment.";

  const errorCode = deriveErrorCode(row.externalStatus, bucket);

  const isSettled = bucket === "success" && seed % 3 !== 0;
  const settlement: TransactionDetailView["settlement"] =
    bucket !== "success"
      ? { applicable: false }
      : isSettled
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

  const amountReceived = parseFloat(row.totalAmount ?? "0");
  const fee = Math.round(amountReceived * FEE_RATE * 100) / 100;
  const amountBreakdown: TransactionDetailView["amountBreakdown"] =
    bucket === "failed"
      ? null
      : { amountReceived, fee, netAmount: Math.round((amountReceived - fee) * 100) / 100 };

  // A refund transaction links back to the original (parent) transaction it
  // was issued against, not the other way around. The parent side of the
  // link (showing its issued refunds) is handled separately by the caller
  // via useIssuedRefunds, this only covers viewing the refund's own detail.
  // A refund with no parentTransaction reference (e.g. a raw seeded mock row
  // with no known parent) simply shows no linked transactions rather than a
  // fabricated one.
  const linkedTransactions: PaTransaction[] =
    bucket === "refunded" && row.parentTransaction ? [row.parentTransaction] : [];

  let dispute: DisputeDetail | null = null;
  if (bucket === "disputed") {
    const rawKey = row.externalStatus?.toUpperCase().replace(/ /g, "_") ?? "";
    const reasonMeta = DISPUTE_REASON_META[rawKey] ?? DISPUTE_REASON_META.DISPUTED!;
    // Disputes are typically filed some days after the original charge, not
    // the same instant, raisedOn is offset from the payment date so the
    // Payment Timeline reads as a real sequence of events.
    const raisedOn = addDaysToFormatted(row.formattedCreationDateTime, 2 + (seed % 5));
    dispute = {
      disputeId: `du_${seed.toString(36)}${(row.gid ?? "").slice(-6).replace(/[^a-zA-Z0-9]/g, "")}`,
      amount: amountReceived,
      reason: reasonMeta.reason,
      reasonCode: reasonMeta.reasonCode,
      description: reasonMeta.description,
      raisedOn,
      respondBy: addDaysToFormatted(raisedOn, 6),
    };
  }

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
  };
}
