import type { InvoiceMatchingPayload } from "@/features/dashboard/mca-transactions/types";

/** One row of the "what the transaction says vs what the invoice says" table. */
export interface InvoiceComparisonRow {
  field: string;
  /** The transaction's value (the API's ffmsValue). */
  expected: string;
  /** What extraction read off the invoice. */
  found: string;
  /** Shown, but not treated as a blocking discrepancy — a whitelisted
   *  remitter name is expected to differ. */
  muted?: boolean;
}

export interface InvoiceComparison {
  missing: InvoiceComparisonRow[];
  mismatched: InvoiceComparisonRow[];
}

// The fields the server compares and pg-dashboard surfaces, in display order.
const COMPARED_FIELDS = [
  { key: "amount", label: "Amount" },
  { key: "currency", label: "Currency" },
  { key: "remitterName", label: "Sender name" },
] as const;

const MATCHED = "1";

/**
 * Turns an invoice-matching payload into the rows the dropzone renders.
 *
 * Mirrors pg-dashboard's mismatchTableRows/missingFields exactly, including
 * that `isMatch` is the *string* "1" on a match — anything else, including
 * "0", an empty string, or an absent value, counts as a discrepancy.
 */
export function toInvoiceComparison(payload: InvoiceMatchingPayload): InvoiceComparison {
  const validation = payload.validationStatus ?? {};

  const mismatched = COMPARED_FIELDS.flatMap(({ key, label }) => {
    const field = validation[key];
    if (!field || field.isMatch === MATCHED) return [];
    return [
      {
        field: label,
        expected: field.ffmsValue,
        found: field.extractedValue,
        muted: key === "remitterName" && payload.isWhitelistedName,
      },
    ];
  });

  // Only the sender address is reported as outright absent; every other field
  // comes back as a value that either matched or didn't.
  const missing: InvoiceComparisonRow[] =
    payload.customerAddress?.isAddressPresent === false
      ? [{ field: "Sender address", expected: "Required", found: "—" }]
      : [];

  return { missing, mismatched };
}

/** Whether the merchant needs to be warned before submitting. */
export function hasInvoiceIssues(comparison: InvoiceComparison): boolean {
  return comparison.missing.length > 0 || comparison.mismatched.length > 0;
}

/** Whether the sender name specifically differed — the one discrepancy the
 *  merchant can resolve by accepting the invoice's value onto the FIRC. */
export function hasRemitterNameMismatch(payload: InvoiceMatchingPayload | null): boolean {
  const remitter = payload?.validationStatus?.remitterName;
  return !!remitter && remitter.isMatch !== MATCHED;
}
