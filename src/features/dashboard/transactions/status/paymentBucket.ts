/** Normalizes a raw `externalStatus` string into a coarse payment outcome.
 * This is the ONLY place a raw payment status is read to decide the
 * transaction status chip (see transactionStatus.ts), short-lived
 * processing steps (Processing, Authorised, Sent for capture, Cancelled)
 * are intentionally collapsed into "in_flight"/"failed" here rather than
 * ever rendering as their own chip, per the status-vocabulary spec. */
export type PaymentBucket = "in_flight" | "failed" | "expired" | "success";

/** Raw statuses that mean "still on its way to the bank, no answer yet",
 * these must never surface as their own status chip (spec: Processing,
 * Authorised are explicitly NOT transaction status chips). */
const IN_FLIGHT_STATUSES = new Set([
  "PROCESSING",
  "AUTHORIZED",
  "AUTHORISED",
  "SENT_FOR_CAPTURE",
  "INPROGRESS",
  "IN_PROGRESS",
  "CAPTURE_STARTED",
  "STEP_UP",
  "AUTH_REVERSAL_STARTED",
]);

/** Raw statuses meaning the payment did not go through. `CUSTOMER_CANCELLED`
 * is included here rather than getting its own "Cancelled" chip, the spec
 * explicitly removes Cancelled from the transaction status vocabulary,
 * treating it as a lifecycle event, not a distinct persistent outcome. */
const FAILED_STATUSES = new Set([
  "ISSUER_DECLINE",
  "GENERAL_DECLINE",
  "CUSTOMER_CANCELLED",
  "CANCELLED",
  "AUTHENTICATION_TIMEOUT",
  "AUTHENTICATION_FAILED",
  "SYSTEM_ERROR",
  "REQUEST_ERROR",
  "CONFIG_ERROR",
  "SYSTEM_DECLINED",
  "ABANDONED",
  "ALTPAY_DECLINE",
  "MARKED_AS_FRAUD",
]);

const EXPIRED_STATUSES = new Set(["EXPIRED"]);

const SUCCESS_STATUSES = new Set(["SUCCESS", "REVERSED"]);

/** Classifies a raw externalStatus into one of the 4 coarse buckets this
 * module governs. Anything unrecognized falls back to "in_flight" (never
 * silently rendered as its own chip label, see transactionStatus.ts) rather
 * than "failed", since an unknown status is more likely a not-yet-modeled
 * in-progress state than a terminal failure. */
export function derivePaymentBucket(externalStatus: string | undefined): PaymentBucket {
  const key = externalStatus?.toUpperCase().replace(/ /g, "_") ?? "";
  if (SUCCESS_STATUSES.has(key)) return "success";
  if (EXPIRED_STATUSES.has(key)) return "expired";
  if (FAILED_STATUSES.has(key)) return "failed";
  if (IN_FLIGHT_STATUSES.has(key)) return "in_flight";
  return "in_flight";
}
