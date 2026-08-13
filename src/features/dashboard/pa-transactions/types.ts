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
