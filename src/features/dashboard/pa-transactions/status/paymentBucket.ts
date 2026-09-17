/** Normalizes a raw `externalStatus` string into one of the payment
 * outcomes the status-vocabulary spec (v3) names directly as its own
 * "BEFORE THE MONEY ARRIVES" chip — Processing, Authorised, Sent for
 * capture, Failed, Cancelled, Expired — plus Success, the one outcome that
 * goes on to be combined with refund/dispute state (see
 * transactionStatus.ts). This is the ONLY place a raw payment status is
 * read to decide the transaction status chip.
 *
 * An earlier version of this module collapsed Processing/Authorised/Sent
 * for capture into one generic "in_flight" placeholder chip ("-") and had
 * no Cancelled chip at all (folding CUSTOMER_CANCELLED into Failed) — that
 * matched an older revision of the spec, not this one, which gives all six
 * their own distinct label and colour (blue for the first three, muted for
 * Cancelled/Expired, red for Failed). Losing that distinction is what made
 * every pre-completion transaction render the same blank dash regardless
 * of which of six very different states it was actually in. */
export type PaymentOutcome =
  "PROCESSING" | "AUTHORISED" | "SENT_FOR_CAPTURE" | "FAILED" | "CANCELLED" | "EXPIRED" | "SUCCESS";

/** "Sent to the bank, no answer yet." */
export const PROCESSING_RAW_VALUES = ["PROCESSING", "INPROGRESS", "IN_PROGRESS"];

/** "Approved by the bank, money not collected." */
export const AUTHORISED_RAW_VALUES = [
  "AUTHORIZED",
  "AUTHORISED",
  "AUTH_REVERSAL_STARTED",
  "STEP_UP",
];

/** "Capture requested, not confirmed." */
export const SENT_FOR_CAPTURE_RAW_VALUES = ["SENT_FOR_CAPTURE", "CAPTURE_STARTED"];

/** "Did not go through" — never includes a cancellation code, see
 * CANCELLED_RAW_VALUES below; the spec gives cancellation its own chip
 * precisely so it isn't read as a failure. */
export const FAILED_RAW_VALUES = [
  "ISSUER_DECLINE",
  "GENERAL_DECLINE",
  "AUTHENTICATION_TIMEOUT",
  "AUTHENTICATION_FAILED",
  "SYSTEM_ERROR",
  "REQUEST_ERROR",
  "CONFIG_ERROR",
  "SYSTEM_DECLINED",
  "ABANDONED",
  "ALTPAY_DECLINE",
  "MARKED_AS_FRAUD",
];

/** "Cancelled before collection." */
export const CANCELLED_RAW_VALUES = ["CUSTOMER_CANCELLED", "CANCELLED"];

/** "Authorised, never collected in time." */
export const EXPIRED_RAW_VALUES = ["EXPIRED"];

/** "Collected" — the only outcome that proceeds to refund/dispute
 * combination in transactionStatus.ts. */
export const SUCCESS_RAW_VALUES = ["SUCCESS", "REVERSED"];

/** Every raw code this module recognises as "still on its way to the bank,
 * no answer yet" in the broad sense (Processing, Authorised, Sent for
 * capture together) — used by the Transactions table's "Pending" filter
 * pill, which groups these three chips into one segment rather than giving
 * each its own pill (see PaTransactionTable). */
export const IN_FLIGHT_RAW_VALUES = [
  ...PROCESSING_RAW_VALUES,
  ...AUTHORISED_RAW_VALUES,
  ...SENT_FOR_CAPTURE_RAW_VALUES,
];

const PROCESSING_STATUSES = new Set(PROCESSING_RAW_VALUES);
const AUTHORISED_STATUSES = new Set(AUTHORISED_RAW_VALUES);
const SENT_FOR_CAPTURE_STATUSES = new Set(SENT_FOR_CAPTURE_RAW_VALUES);
const FAILED_STATUSES = new Set(FAILED_RAW_VALUES);
const CANCELLED_STATUSES = new Set(CANCELLED_RAW_VALUES);
const EXPIRED_STATUSES = new Set(EXPIRED_RAW_VALUES);
const SUCCESS_STATUSES = new Set(SUCCESS_RAW_VALUES);

/** Classifies a raw externalStatus into one of the 7 outcomes above.
 * Anything unrecognized falls back to "PROCESSING" (never silently a
 * failure, and no longer a blank dash either — an unmapped code now still
 * gets a real, if generic, in-progress label) rather than "FAILED", since
 * an unknown status is more likely a not-yet-modeled in-progress state
 * than a terminal one. */
export function derivePaymentOutcome(externalStatus: string | undefined): PaymentOutcome {
  const key = externalStatus?.toUpperCase().replace(/ /g, "_") ?? "";
  if (SUCCESS_STATUSES.has(key)) return "SUCCESS";
  if (EXPIRED_STATUSES.has(key)) return "EXPIRED";
  if (CANCELLED_STATUSES.has(key)) return "CANCELLED";
  if (FAILED_STATUSES.has(key)) return "FAILED";
  if (AUTHORISED_STATUSES.has(key)) return "AUTHORISED";
  if (SENT_FOR_CAPTURE_STATUSES.has(key)) return "SENT_FOR_CAPTURE";
  if (PROCESSING_STATUSES.has(key)) return "PROCESSING";
  return "PROCESSING";
}

/** The coarser 4-value classification `deriveTransactionDetail.ts` and
 * `financial/generateTimeline.ts` build their own (unrelated) timeline-step
 * and error-code logic against — kept alongside `derivePaymentOutcome`
 * rather than replaced by it, since those two consumers only ever needed
 * "still going / didn't go through / expired / collected", not the finer
 * six-way split the Transactions table's own status chip needs. Derived
 * from the same outcome so the two classifications can never disagree
 * about which raw codes land where. */
export type PaymentBucket = "in_flight" | "failed" | "expired" | "success";

const BUCKET_BY_OUTCOME: Record<PaymentOutcome, PaymentBucket> = {
  PROCESSING: "in_flight",
  AUTHORISED: "in_flight",
  SENT_FOR_CAPTURE: "in_flight",
  FAILED: "failed",
  CANCELLED: "failed",
  EXPIRED: "expired",
  SUCCESS: "success",
};

export function derivePaymentBucket(externalStatus: string | undefined): PaymentBucket {
  return BUCKET_BY_OUTCOME[derivePaymentOutcome(externalStatus)];
}
