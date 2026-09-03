export interface DisputeReasonMeta {
  /** Short, concise, merchant-facing label a merchant can scan in 1-2
   * seconds, e.g. "Duplicate charge". Never the long scheme sentence. */
  merchantLabel: string;
  /** Card-network reason code, e.g. "12.6". */
  reasonCode: string;
  /** Longer scheme-level sentence, shown as supporting text below the
   * merchant label, not as the primary heading. */
  description: string;
}

/** The single reason-metadata table every dispute reason string in the app
 * resolves through, keyed the same way every other status/reason lookup in
 * this codebase normalizes its key (uppercase, spaces to underscores).
 * Covers both the transactions feature's own synthesized reasons
 * ("Duplicate processing", "Credit not processed", ...) and
 * dispute-management's own DISPUTE_REASONS vocabulary ("Duplicate charge",
 * "Subscription cancelled", "Other reason"), which otherwise has no
 * reasonCode/description of its own, see toPaTransaction in
 * dispute-management/index.tsx. Extend this table for a new reason rather
 * than adding a second lookup elsewhere. */
export const DISPUTE_REASON_DETAILS: Record<string, DisputeReasonMeta> = {
  FRAUDULENT: {
    merchantLabel: "Fraudulent transaction",
    reasonCode: "10.4",
    description: "The customer claims they did not authorise this purchase.",
  },
  PRODUCT_NOT_RECEIVED: {
    merchantLabel: "Item not received",
    reasonCode: "13.1",
    description: "The customer claims they did not receive the goods or services purchased.",
  },
  DUPLICATE_PROCESSING: {
    merchantLabel: "Duplicate charge",
    reasonCode: "12.6",
    description: "The customer claims they were charged more than once for the same purchase.",
  },
  DUPLICATE_CHARGE: {
    merchantLabel: "Duplicate charge",
    reasonCode: "12.6",
    description: "The customer claims they were charged more than once for the same purchase.",
  },
  CREDIT_NOT_PROCESSED: {
    merchantLabel: "Credit not processed",
    reasonCode: "13.6",
    description: "The customer claims a refund or credit was not issued as expected.",
  },
  SUBSCRIPTION_CANCELLED: {
    merchantLabel: "Subscription cancelled",
    reasonCode: "13.7",
    description: "The customer claims they cancelled a recurring subscription before this charge.",
  },
  OTHER_REASON: {
    merchantLabel: "Other reason",
    reasonCode: "N/A",
    description: "The customer disputed this charge for a reason outside the standard categories.",
  },
};

/** Falls back to the reason string itself (title-cased is unnecessary,
 * dispute reasons already arrive human-readable) when it isn't in the table
 * above, rather than throwing or showing a blank label. */
export function getDisputeReasonMeta(reason: string): DisputeReasonMeta {
  const key = reason.toUpperCase().replace(/ /g, "_");
  return (
    DISPUTE_REASON_DETAILS[key] ?? {
      merchantLabel: reason,
      reasonCode: "N/A",
      description: reason,
    }
  );
}
