// ── MCA (Multi-Currency Accounts) ───────────────────────────────────────────

export interface McaTransaction {
  gid: string;
  merchantId: string;
  amount: string;
  currency: string;
  externalStatus: string;
  internalStatus: string;
  /** When the FFMS record was created. Close to, but not the same instant as,
   *  formattedTransactionCreationDateTime below — the two routinely differ by
   *  up to a minute, so anything labelled "transaction date" in the UI must
   *  read the transaction field, not this one. */
  formattedCreationDateTime: string;
  /** When the transaction itself was created. This is the value pg-dashboard's
   *  MCA table and transaction-details header both display, so it is what
   *  every "Date & Time"/"Transaction date" surface here reads too. */
  formattedTransactionCreationDateTime: string;
  partnerCustomerFullName?: string | null;
  partnerMaskedCustomerFullName: string | null;
  partnerCustomerCountry?: string | null;
  totalMdrDiscount?: string | null;
  frmStatus: "NO_FRM" | "REVIEW_IN_PROGRESS" | "PENDING_MERCHANT_UPLOAD" | "APPROVED";
  invoiceType?: string | null;
  settlementAmount?: string;
  settlementCurrency?: string;
  settlementDate?: string;
  /** Epoch millis. Only present while externalStatus is FUNDS_IN_TRANSIT —
   *  when the funds are expected to land. */
  valueDateTime?: string | null;
  partnerCustomerAddress?: string | null;
  /** Settlement arithmetic, shown by the Settlement Details drawer. These are
   *  the record's own stored figures, distinct from the settlement timeline's
   *  FX_BOOKED/SETTLED event — the drawer reports what was booked against the
   *  transaction, the timeline reports what happened during settlement. */
  opgspAmount?: string | null;
  opgspCurrency?: string | null;
  opgspFxRate?: string | null;
  ccFxRate?: string | null;
  inrAmount?: string | null;
  mdrType?: string | null;
  transactionFee?: string | null;
  gst?: string | null;
  comments?: string | null;
  note?: string | null;
}

/**
 * What LinkInvoiceModal actually reads off the transaction it is linking.
 *
 * Narrower than McaTransaction on purpose: the modal opens both from the
 * transactions table, which holds full OpenSearch records, and from
 * InvoiceActionCard, whose rows come from document-pending-list and carry only
 * these fields. McaTransaction satisfies this structurally, so the table's call
 * sites are unaffected. Narrowing is what avoids the alternative — inventing an
 * `externalStatus`/`frmStatus` for a record that never had one.
 */
export interface LinkableTransaction {
  gid: string;
  merchantId: string;
  amount: string;
  currency: string;
  partnerCustomerFullName?: string | null;
  formattedTransactionCreationDateTime: string;
}

export interface McaTransactionsResponse {
  status: string;
  message: string;
  data: {
    headers: string[];
    data: McaTransaction[];
    totalCount?: number;
  };
}

// ── Settlement timeline API ─────────────────────────────────────────────────
// Mirror of pg-dashboard/src/components/TransactionDetails/type.ts. The
// timeline endpoint drives every settlement step the details drawer renders,
// so these shapes must not be guessed at — see CLAUDE.md's migration rules.

export type TimelineStatus = "PENDING" | "SUCCESS" | "ERROR" | "IN_PROGRESS" | "REVERSAL_DONE";

interface StatusWithDate {
  FORMATTED_DATE_TIME: string;
  STATUS: TimelineStatus;
}

interface TxnWithSymbol {
  TXN_SYMBOL: string;
}

export interface InvoiceUploadEvent {
  FILE_NAME: string | null;
  FORMATTED_DATE_TIME: string;
  STATUS: TimelineStatus;
}

export interface InvoiceApprovalEvent {
  FORMATTED_DATE_TIME: string;
  STATUS: TimelineStatus;
  REMARK: string | null;
}

/** Every upload/review round-trip for this transaction, oldest first. Older
 *  transactions predate this field and carry a single pair on the
 *  PaymentTimelineData root instead — see buildSettlementTimeline. */
export interface MultipleTimelineEvents {
  INVOICE?: Array<{
    INVOICE_UPLOAD: InvoiceUploadEvent;
    INVOICE_APPROVED: InvoiceApprovalEvent;
  }>;
}

/** Shared shape of the FX_BOOKED and SETTLED events — the settlement money
 *  breakdown. SETTLED additionally names the destination bank account. */
export interface FxSettlementEvent extends TxnWithSymbol {
  payoutAmount: string;
  payoutCurrency: string;
  REFERRAL_DISCOUNT: string | null;
  OFFER_DISCOUNT: string | null;
  convertedAmount: string;
  transactionFee: string;
  settlementAmount: string;
  gst: string;
  conversionRate: string;
  CONVERTED_TXN_CURRENCY_SYMBOL: string;
  FORMATTED_DATE_TIME: string;
  STATUS?: TimelineStatus;
}

export interface PaymentTimelineData {
  FUND_RECEIVED?: TxnWithSymbol & {
    TXN_AMOUNT: string;
    TXN_CURRENCY: string;
    STATUS?: TimelineStatus;
    FORMATTED_DATE_TIME?: string;
  };
  INVOICE_UPLOAD?: StatusWithDate & { FILE_NAME?: string | null };
  COMPLIANCE_QUERY_RAISED?: {
    FORMATTED_DATE_TIME?: string;
    REMARK?: string;
    STATUS?: TimelineStatus;
  };
  INVOICE_APPROVED?: StatusWithDate & { REMARK?: string | null };
  COMPLIANCE_ACCEPTED?: StatusWithDate;
  PG_HOUSE_FUND_RECEIVED?: StatusWithDate;
  SENT_FOR_SETTLEMENT?: StatusWithDate;
  FX_BOOKED?: FxSettlementEvent;
  SETTLED?: FxSettlementEvent & {
    accountNumber: string;
    bankName: string;
  };
  PG_OPGSP_FUND_RECEIVED?: StatusWithDate;
  FIRC_RECEIVED?: StatusWithDate;
}

/** The virtual account the funds landed in. */
export interface TxnAccountDetails {
  accountHolderName?: string | null;
  bankName?: string | null;
  bankCountry?: string | null;
  currency?: string | null;
  accountNumber?: string | null;
  accountNumberType?: string | null;
  routingCode?: string | null;
}

export interface TimelineApiResponse {
  data: {
    timeLineEvents: PaymentTimelineData;
    multipleTimelineEvents?: MultipleTimelineEvents;
    isFundDelayed: boolean;
    isAmzTxn: boolean;
    settlementDate: string;
    isSameBankSettlement: boolean;
    accountDetails?: TxnAccountDetails | null;
  };
}

export interface TxnDocumentsResponse {
  data: {
    customerFullName: string;
    other: string | null;
    txnStatus: string;
    shippingDetails: string | null;
    rejectedReason: string | null;
    invoiceNumber: string | null;
    documentsPresent: string[];
  };
}

// ── Compliance (FRM) and additional-document threads ────────────────────────

export type FrmStatus = "NO_FRM" | "REVIEW_IN_PROGRESS" | "PENDING_MERCHANT_UPLOAD" | "APPROVED";

export interface FrmAttachment {
  fileUUID: string;
  fileName: string;
}

export interface FrmConversationEntry {
  author: string;
  authorType: "GLOCAL" | "MERCHANT" | "OPS";
  creationTime: number | string;
  message: string;
  attachments: FrmAttachment[];
}

export interface FrmStatusResponse {
  data: {
    frmStatus: {
      status: FrmStatus;
      conversation: FrmConversationEntry[] | null;
    };
  };
}

/** "OPS" means ops is waiting on the merchant to supply something. */
export type AdditionalDocStatus = "OPS" | "MERCHANT" | null;

export interface AdditionalDocConversationResponse {
  data: {
    data: FrmConversationEntry[];
    status: AdditionalDocStatus;
  };
}

export interface PresignedUrlResponse {
  data: { presignedUrl: string };
}

/** Response to the attachment-upload PUT: where to put the file, and the id
 *  the finished upload is referred to by in a conversation message. */
export interface AttachmentPresignResponse {
  data: {
    fileUUID: string;
    presignedUrl: string;
    metaData: Record<string, string>;
  };
}

export interface ConversationSendPayload {
  message: string;
  attachments: FrmAttachment[];
}

/** An attachment picked in the composer. Carries a temporary id until its
 *  upload finishes and the server's real fileUUID replaces it. */
export interface PendingAttachment {
  fileUUID: string;
  fileName: string;
  uploading: boolean;
}

export interface FircDownloadResponse {
  data: { preSignedUrls: string[] };
}

// ── Purpose codes ────────────────────────────────────────────────────────────

export interface SuggestedPurposeCodesResponse {
  data: { suggestedPurposeCodes: string[] };
}

/** Merchant profile. Only `purposeCode` is consumed here; the endpoint returns
 *  considerably more, left undeclared rather than guessed at. */
export interface MerchantProfileResponse {
  purposeCode?: string;
}

// ── Invoice upload / matching ────────────────────────────────────────────────

export interface McaInvoiceScanUploadResponse {
  data: {
    upload_url: string;
    metaData: {
      invoiceId: string;
      maxSize: string;
      merchantId: string;
      fileExtension: string;
    };
  };
}

export interface FfmsInvoicePresignResponse {
  data: {
    presignedUrlsMap: {
      INVOICE: string;
    };
  };
}

/** One compared field. `isMatch` is the string "1" when it matched — not a
 *  boolean, and not a number. */
export interface InvoiceMatchingField {
  ffmsValue: string;
  extractedValue: string;
  isMatch: string;
}

export interface InvoiceMatchingPayload {
  overallMatch: boolean;
  isCbaName?: boolean;
  customerAddress: {
    isAddressPresent: boolean;
    address: string;
  };
  isWhitelistedName: boolean;
  validationStatus: {
    amount?: InvoiceMatchingField;
    currency?: InvoiceMatchingField;
    remitterName?: InvoiceMatchingField;
    senderAddress?: InvoiceMatchingField;
    goodsOrService?: InvoiceMatchingField;
  };
}

export interface InvoiceMatchingResponse {
  gid: string | null;
  status: string;
  message: string;
  timestamp: string;
  reasonCode: string;
  data: InvoiceMatchingPayload | null;
  errors: unknown;
}

// ── MCA (PACB) business overview ────────────────────────────────────────────
// Mirror of pg-dashboard's PacbOverviewData. Every metric is optional and
// count/value arrive as either a number or a numeric string depending on the
// metric, so callers must coerce rather than assume.

export interface McaOverviewMetric {
  count?: number | string;
  value?: number | string;
}

export interface McaOverviewData {
  type?: string;
  mid?: string;
  isTodayHoliday?: boolean;
  nextSettlementDate?: string;
  previous_settlement_data?: {
    isTodayHoliday?: boolean;
    nextSettlementDate?: string;
    previousSettlementDate?: string;
    previousSettlementValue?: string;
    count?: string;
    value?: string;
    updatedTime?: string;
  };
  successfulPayments?: McaOverviewMetric;
  settlementsDue?: McaOverviewMetric;
  fundsOnHold?: McaOverviewMetric;
  amountSaved?: {
    overall?: McaOverviewMetric;
    last30?: McaOverviewMetric;
  };
}

export interface McaOverviewResponse {
  message?: string;
  errors?: unknown;
  data: McaOverviewData;
}

// ── Invoice origins (per-country analytics) ──────────────────────────────────
// Shape of /analytics/{merchantId}/merchant/mca/invoice-origins.

export interface InvoiceOriginRowApi {
  countryCode: string;
  amount: number;
  invoiceCount: number;
  sharePct: number;
}

export interface InvoiceOriginTotals {
  totalInvoiced: number;
  totalInvoicedTrendPct: number;
  avgPerCountry: number;
  avgPerCountryTrendPct: number;
  topCountry: { countryCode: string; sharePct: number; shareTrendPct: number };
  activeMarkets: number;
  activeMarketsTrendPct: number;
}

export interface InvoiceOriginsData {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
  totals: InvoiceOriginTotals;
  rows: InvoiceOriginRowApi[];
}

export interface InvoiceOriginsResponse {
  message?: string;
  errors?: unknown;
  data: InvoiceOriginsData;
}

// ── Currency split ───────────────────────────────────────────────────────────

export interface CurrencySplitSliceApi {
  currency: string;
  amount: number;
  amountPct: number;
  count: number;
  countPct: number;
}

export interface CurrencySplitData {
  reportingCurrency: string;
  totalAmount: number;
  totalCount: number;
  slices: CurrencySplitSliceApi[];
}

/** Envelope-tolerant: the sampled response was flat, but every other analytics
 *  endpoint wraps in `data`, so the hook reads whichever is present. */
export type CurrencySplitResponse = {
  data?: CurrencySplitData | null;
} & Partial<CurrencySplitData>;

// ── Settled by account ───────────────────────────────────────────────────────

export interface SettledAccountRow {
  currency: string;
  /** Settled amount converted to the merchant's reporting currency, which is
   *  what every row's bar and share are measured in. */
  amount: number;
  /** The same settlement in `currency`'s own units. Optional because the
   *  rest-of-world bucket is a fold of several currencies, whose native amounts
   *  cannot be summed into one figure — those rows carry no native total. */
  currencyAmount?: number;
  count: number;
}

export interface SettledByAccountData {
  timeframe: string;
  totalAmount: number;
  totalCount: number;
  accounts: SettledAccountRow[];
}

export interface SettledByAccountResponse {
  data: SettledByAccountData;
  message?: string;
  errors?: unknown;
}

// ── Saved amount ─────────────────────────────────────────────────────────────

export interface SavedAmountTimeframeRow {
  timeframe: string;
  amount: number;
  count: number;
}

export interface SavedAmountData {
  currency: string;
  overallAmount: number;
  overallCount: number;
  timeframes: SavedAmountTimeframeRow[];
}

export interface SavedAmountResponse {
  data: SavedAmountData;
  message?: string;
  errors?: unknown;
}

// ── Documents pending ────────────────────────────────────────────────────────

/** Amount + count of DOCUMENT_PENDING transactions for a timeframe. */
export interface DocumentPendingData {
  timeframe: string;
  reportingCurrency: string;
  amount: number;
  count: number;
}

export interface DocumentPendingResponse {
  data: DocumentPendingData;
  message?: string;
  errors?: unknown;
}

/** One currency's slice of the currently-pending snapshot. */
export interface DocumentPendingCurrencyRow {
  currency: string;
  amount: number;
  count: number;
}

export interface DocumentPendingByCurrencyData {
  totalAmount: number;
  totalCount: number;
  currencies: DocumentPendingCurrencyRow[];
}

export interface DocumentPendingByCurrencyResponse {
  data: DocumentPendingByCurrencyData;
  message?: string;
  errors?: unknown;
}

// ── Document pending list ────────────────────────────────────────────────────

/** Both descending. Anything else the server treats as AMOUNT. */
export type DocumentPendingSortBy = "AMOUNT" | "CREATED_TIME";

/**
 * document-pending-list's window vocabulary. Deliberately NOT the
 * today/week/month/ytd set `document-pending` takes — the two endpoints name
 * their windows differently, and sending one's values to the other silently
 * falls back to that endpoint's default rather than erroring.
 */
export type DocumentPendingTimeframe =
  | "all_time"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days";

/**
 * One transaction awaiting documents, as document-pending-list returns it.
 *
 * Deliberately not an McaTransaction: this endpoint carries only what a "raise
 * this one" row needs, and two fields differ in shape from the OpenSearch
 * record — `amount` is a number here rather than a string, and `createdTime` is
 * raw ISO 8601 rather than a pre-formatted display string.
 */
export interface DocumentPendingListRow {
  gid: string;
  merchantId: string;
  amount: number;
  currency: string;
  createdTime: string;
  customerName: string | null;
  invoiceNumber: string | null;
}

/**
 * `amount` and `count` are the same aggregate document-pending reports, for the
 * window `timeframe` names — returned here so one call answers both a card's
 * headline and its rows. `totalCount` is how many rows match in all; it tracks
 * `count`, and both are kept because the endpoint sends both.
 */
export interface DocumentPendingListData {
  timeframe: string;
  reportingCurrency: string;
  amount: number;
  count: number;
  transactions: DocumentPendingListRow[];
  totalCount: number;
}

export interface DocumentPendingListResponse {
  data: DocumentPendingListData;
  message?: string;
  errors?: unknown;
}

// ── Settled currency trend ───────────────────────────────────────────────────
// Per-account (currency) settled totals + a monthly series. `amount` is in the
// account's own currency; `inrAmount` is that figure converted to INR, which is
// what the ₹ bars/totals read from since a mix of currencies only sums in one.

export interface SettledCurrencyPoint {
  month: string;
  periodStart: string;
  amount: number;
  inrAmount: number;
  count: number;
}

export interface SettledCurrencyTrendRow {
  currency: string;
  totalAmount: number;
  totalInrAmount: number;
  totalCount: number;
  /** null when there's no prior period to compare against. */
  changePercentage: number | null;
  comparisonLabel: string;
  points: SettledCurrencyPoint[];
}

export interface SettledCurrencyTrendData {
  currencies: SettledCurrencyTrendRow[];
}

export interface SettledCurrencyTrendResponse {
  data: SettledCurrencyTrendData;
  message?: string;
  errors?: unknown;
}
