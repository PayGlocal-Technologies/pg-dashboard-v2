// Transaction-domain contracts shared by the MCA and PA transaction features
// (@/features/dashboard/mca-transactions and
// @/features/dashboard/pa-transactions). The row and response shapes each
// segment's table renders are segment-specific and live in that feature's own
// types.ts — only what both sides speak lives here.

/** A single option in a status / method / currency filter control. */
export interface FilterOption {
  value: string;
  label: string;
}

// ── OpenSearch request body ──────────────────────────────────────────────────

export interface TableReqBody {
  pageLimit: number;
  from: number;
  searchFilterType?: string;
  queryString?: string;
  fieldSearch?: Record<string, string | string[]>;
  startTime?: number;
  endTime?: number;
  sortBy?: string;
  fieldOrSearch?: Record<string, string[]>;
}

// ── Filter state ─────────────────────────────────────────────────────────────

export interface TxnFilterValues {
  externalStatus?: string[];
  iso2Code?: string[];
  paymentInstrument?: string[];
  currency?: string[];
  /**
   * Country *names*, not ISO2 codes — the client search filters on
   * `fieldSearch.country`, which holds display names (pg-dashboard's client list
   * feeds it straight from the country dropdown's labels). Distinct from
   * `iso2Code` above, which is the PA transaction table's own country filter and
   * really is coded.
   */
  country?: string[];
  startTime?: number;
  endTime?: number;
}

// ── Transaction Detail API ────────────────────────────────────────────────────
// Mirror of pg-dashboard/src/features/track-transactions/types.ts

export interface TxnPaymentDetails {
  paymentStatus?: string | null;
  amount?: string | null;
  currency?: string | null;
  category?: string | null;
  paymentMethod?: string | null;
  brand?: string | null;
  cardType?: string | null;
  ccNumber?: string | null;
  transactionStartDate?: string | null;
  transactionCompletionDate?: string | null;
}

export interface LinkedTransactionDetail {
  gid?: string | null;
  txnAmount?: string | null;
  status?: string | null;
  txnType?: string | null;
}

export interface ProcessorResponseDetails {
  reconciliationReferenceNumber?: string | null;
  arNumber?: string | null;
  authCode?: string | null;
  eciValue?: string | null;
  processorId?: string | null;
  processorReasonCode?: string | null;
}

export interface CustomerBillingDetails {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  addressStreet1?: string | null;
  addressStreet2?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  emailId?: string | null;
  callingCode?: string | null;
  phoneNumber?: string | null;
}

export interface TxnResponseDetails {
  glocalReasonCode?: string | null;
  glocalReasonMessage?: string | null;
  glocalDetailReasonMessage?: string | null;
  processorReasonDesc?: string | null;
  processorReasonCode?: string | null;
}

export interface TransactionDetails {
  txnId?: string | null;
  merchantId?: string | null;
  merchantTxnId?: string | null;
  inrAmount?: string | null;
  inrExchangeRate?: string | null;
  paymentDetails?: TxnPaymentDetails | null;
  linkedTransactions?: {
    linkedTransactionDetailsList?: LinkedTransactionDetail[] | null;
  } | null;
  otherDetails?: {
    issuerCountry?: string | null;
    issuerName?: string | null;
  } | null;
  processorResponseDetails?: ProcessorResponseDetails | null;
  customerBillingDetails?: CustomerBillingDetails | null;
  txnResponseDetails?: TxnResponseDetails | null;
  dccTxn?: boolean | null;
}

export interface TransactionDetailResponse {
  data?: {
    transactionDetails?: TransactionDetails | null;
  } | null;
}

export interface SettlementTxnDetail {
  mdrFeeAmount?: number | null;
  taxAmount?: number | null;
  settlementExternalStatus?: string | null;
  settledDate?: string | null;
  conversionRate?: number | null;
  amtTobeSettled?: number | null;
  tentative?: boolean | null;
  arn?: string | null;
}

export interface SettlementDetailResponse {
  data?: {
    settlementTxnDetail?: SettlementTxnDetail | null;
  } | null;
}

export interface ChargebackDetails {
  txnGid?: string | null;
  cbId?: string | null;
  cbLevel?: string | null;
  cbReasonCode?: string | null;
  formattedCreationTime?: string | null;
  cbInternalStatus?: string | null;
  formattedCbDueDate?: string | null;
  cbAmount?: string | null;
  cbCurrency?: string | null;
  cbRefNo?: string | null;
  cbMessageText?: string | null;
  cbNotificationId?: string | null;
  outcome?: string | null;
  arn?: string | null;
}

export interface ChargebackDetailsResponse {
  data?: {
    chargebackTxnDetail?: {
      chargebackTransactions?: ChargebackDetails[] | null;
    } | null;
  } | null;
}
