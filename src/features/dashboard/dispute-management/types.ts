/** Same 6-status vocabulary already established for disputed PA transactions,
 * see PA_STATUS_META in @/features/dashboard/transactions/paColumns. */
export type DisputeRawStatus =
  "DISPUTED" | "NEEDS_ACTION" | "UNDER_REVIEW" | "INSUFFICIENT_DOCUMENTS" | "WON" | "LOST";

export interface DisputeRow {
  disputeId: string;
  txnGid: string;
  status: DisputeRawStatus;
  amount: number;
  currency: string;
  reason: string;
  customerName: string;
  email: string;
  /** Structurally compatible with PaTransaction's own optional fields, so
   * TransactionPaymentMethod/TransactionAmount can be reused as-is for the
   * Payment Method/Amount columns instead of rebuilding them. */
  cardBrand?: string;
  maskedCardNumber?: string;
  paymentInstrument?: string;
  /** "DD/MM/YYYY, HH:MM:SS", same format as PaTransaction.formattedCreationDateTime. */
  disputedOn: string;
  /** Only set for statuses that still need a merchant response (DISPUTED, NEEDS_ACTION). */
  respondBy?: string;
}

// TODO(integration): this feature is mock-data only, see mockRows.ts. Wire up
// the real chargeback-search endpoint (see ChargebackDetails/ChargebackDetailsResponse
// in @/features/dashboard/transactions/types) once it's available.
