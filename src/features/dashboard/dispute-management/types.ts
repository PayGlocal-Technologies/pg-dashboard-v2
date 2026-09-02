/** Same 8-status vocabulary already established for disputed PA transactions,
 * see status/disputeStatus.ts's DISPUTE_STATUS_META. */
export type DisputeRawStatus =
  | "NEEDS_RESPONSE"
  | "UNDER_REVIEW"
  | "MORE_EVIDENCE_NEEDED"
  | "REOPENED"
  | "CLEARED"
  | "CHARGED_BACK"
  | "ACCEPTED"
  | "EXPIRED";

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
  /** Only set for statuses that still need a merchant response (NEEDS_RESPONSE,
   * MORE_EVIDENCE_NEEDED, REOPENED). */
  respondBy?: string;
  /** The dispute's broader card-network stage, see status/disputeStatus.ts's
   * DISPUTE_PHASE_META, shown as its own column, never merged into status. */
  disputePhase?: "INQUIRY" | "CHARGEBACK" | "PRE_ARBITRATION" | "ARBITRATION";
}

// TODO(integration): this feature is mock-data only, see mockRows.ts. Wire up
// the real chargeback-search endpoint (see ChargebackDetails/ChargebackDetailsResponse
// in @/features/dashboard/transactions/types) once it's available.
