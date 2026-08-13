// ── PA (Payment Aggregator — Cards / UPI / NetBanking) ──────────────────────

export interface PaTransaction {
  gid?: string;
  merchantId?: string;
  externalStatus?: string;
  maskedCardNumber?: string;
  txnCurrency?: string;
  totalAmount?: string;
  cardBrand?: string;
  paymentInstrument?: string;
  iso2Code?: string;
  encEmailId?: string;
  formattedCreationDateTime?: string;
  firstName?: string;
  lastName?: string;
  billToFirstName?: string;
  billToLastName?: string;
  message?: string;
  transactionFlow?: string;
  transactionMode?: string;
  /** Mock-only bookkeeping: set on a refund transaction created via Issue
   * Refund so its own detail view can show the original (parent) transaction
   * in Linked Transactions instead of the other way around. Not part of the
   * real API contract. */
  parentTransaction?: PaTransaction;
}

export interface PaTransactionsResponse {
  gid?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  reasonCode?: string;
  errors?: unknown;
  data?: {
    excludeHeaders?: string[];
    headers?: string[];
    data: PaTransaction[] | null;
    totalCount?: number | null;
  } | null;
}
