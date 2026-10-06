import type {
  DisputeEvent,
  DisputeReviewPhase,
} from "@/features/dashboard/pa-transactions/financial/types";

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

/** How a closed dispute got its outcome, for the table's "Won · …" /
 * "Lost · …" chip. Only meaningful once `status` is final (CLEARED,
 * CHARGED_BACK, ACCEPTED, EXPIRED). TODO(integration): read from the
 * chargeback API; the mock sets it per row. */
export type DisputeResolution =
  | "NO_RESPONSE" // merchant never responded, closed for the customer
  | "CONTESTED" // merchant submitted evidence, the bank decided
  | "CUSTOMER_DROPPED" // customer withdrew the dispute
  | "ACCEPTED" // merchant accepted it and refunded
  | "WITHDRAWN"; // merchant withdrew at arbitration (status ACCEPTED)

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
  /** Which escalation round this dispute is on — every round runs the exact
   * same Raised -> Contested -> Evidence -> Bank review cycle (see `stage`),
   * only the network's own level changes. Its own optional column, never
   * merged into the Status badge (see the dispute-workflow PDF: "Dispute
   * escalated to lvl2/lvl3" always resets Status back to Needs Response, so
   * Status alone can't tell two escalation rounds apart). */
  disputePhase?: "DISPUTE" | "PRE_ARBITRATION" | "ARBITRATION";
  /** The fine-grained step within the current phase, straight from the
   * dispute-workflow PDF (e.g. "Evidence Submitted to PG", "Rejected by PG",
   * "Moved to bank review") — several stages can share one Status (Evidence
   * Submitted to PG/Evidence Approved/Moved to bank review are all "Under
   * review"), this is what tells them apart without inventing new Status
   * terms. Its own optional column, plain text, never a badge. */
  stage?: string;
  /** File names already submitted as evidence, same field/purpose as
   * PaTransaction's own DisputeEvent.documents (see financial/types.ts) —
   * only meaningful once `status` is UNDER_REVIEW or MORE_EVIDENCE_NEEDED,
   * carried through to the shared DisputeDetailFeature page by
   * toPaTransaction() below so the exact same "Submitted documents" list
   * (with a mock preview thumbnail for anything that looks like an image,
   * see mockDocumentPreview.ts) shows there too, not just when reached
   * through the Transactions table. */
  documents?: string[];
  /** See DisputeResolution. */
  resolution?: DisputeResolution;
  /** Under review only: where the evidence is (see DisputeReviewPhase). */
  reviewPhase?: DisputeReviewPhase;
  /** Arbitration only: whether withdrawing carries a withdrawal fee. */
  withdrawalFeeApplies?: boolean;
  /** A fee charged on closing (arbitration loss or withdrawal). */
  appliedFee?: DisputeEvent["appliedFee"];
}

// TODO(integration): this feature has no data source yet (the list renders
// empty, see DISPUTE_ROWS in index.tsx). Wire up
// the real chargeback-search endpoint (`v1/search/cb`, see pg-dashboard's
// features/chargebacks/services.ts) once it's available.
