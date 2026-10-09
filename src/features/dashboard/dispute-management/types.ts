import type { DisputeReviewPhase } from "@/features/dashboard/pa-transactions/financial/types";

// ── Metrics (mock) ────────────────────────────────────────────────────────────
//
// MOCK: the Metrics section (stat cards, overview, top reasons, amount
// recovered) has no backend yet. The only dispute aggregate the backend
// returns is Home's `openDisputes` count/value
// (`/v3/analytics/{mid}/merchant/getPaOverview`), with no timeframe, no
// won/lost split, no recovery trend and no reasons. Until a metrics endpoint
// exists the section reads MOCK_DISPUTE_ROWS (mockRows.ts) in this shape.
// Nothing else on the page uses these types.

export type DisputeRawStatus =
  | "NEEDS_RESPONSE"
  | "UNDER_REVIEW"
  | "MORE_EVIDENCE_NEEDED"
  | "REOPENED"
  | "CLEARED"
  | "CHARGED_BACK"
  | "ACCEPTED"
  | "EXPIRED";

export type DisputeResolution =
  | "NO_RESPONSE"
  | "CONTESTED"
  | "CUSTOMER_DROPPED"
  | "ACCEPTED"
  | "WITHDRAWN";

/** A mock dispute, for the Metrics section only (see above). */
export interface DisputeRow {
  disputeId: string;
  txnGid: string;
  status: DisputeRawStatus;
  amount: number;
  currency: string;
  reason: string;
  customerName: string;
  email: string;
  cardBrand?: string;
  maskedCardNumber?: string;
  paymentInstrument?: string;
  /** "DD/MM/YYYY, HH:MM:SS". */
  disputedOn: string;
  respondBy?: string;
  disputePhase?: "DISPUTE" | "PRE_ARBITRATION" | "ARBITRATION";
  stage?: string;
  documents?: string[];
  resolution?: DisputeResolution;
  reviewPhase?: DisputeReviewPhase;
  withdrawalFeeApplies?: boolean;
  appliedFee?: { kind: "ARBITRATION" | "WITHDRAWAL"; amount: number; currency: string };
}

// ── API contracts ─────────────────────────────────────────────────────────────
//
// Ported from pg-dashboard (uat) `src/features/chargebacks/types.ts`. Only the
// fields the merchant flow reads are typed; pg-dashboard's CbTxnDetailsRecord
// (full card and PAN fields) is deliberately not ported.

/** The gcc envelope. */
export type CbEnvelope<T> = {
  status?: string;
  message?: string;
  data: T;
  errors?: { detailedMessage?: string } | null;
};

/** The two compliance levels sit before pre-arbitration and arbitration. */
export type CbLevel =
  | "CHARGEBACK"
  | "PRE_ARBITRATION_COMPLIANCE"
  | "PRE_ARBITRATION"
  | "ARBITRATION_COMPLIANCE"
  | "ARBITRATION";

export type CbCaseStatus =
  | "CB_INITIATED"
  | "CB_NOTIFIED"
  | "CB_ACCEPTED"
  | "CB_PARTIAL_ACCEPTANCE"
  | "CB_CONTESTED"
  | "CB_REPRESENTED"
  | "CB_DEBIT_REQUESTED"
  | "CB_DEBIT_REJECTED"
  | "CB_DEBITED"
  | "CB_CLOSED"
  | "REFUNDED";

/** The merchant-facing status: the list's Status column and filter, and the detail's badge. */
export type DisplayStatus =
  | "ACTION_REQUIRED"
  | "UPLOAD_DOC"
  | "UNDER_REVIEW"
  | "INSUFFICIENT_DOC"
  | "MERCHANT"
  | "CUSTOMER"
  | "WITHDRAWN"
  | "CLOSED"
  | "REFUNDED";

/** Which screen the merchant sees. With the level it picks the status card and what can be done. */
export type CbExternalDrawerViewStatus =
  | "ACTION_REQUIRED"
  | "UPLOAD_DOC"
  | "UNDER_REVIEW"
  | "INSUFFICIENT_DOC"
  | "READY_TO_REPRESENT"
  | "BANK_REVIEW"
  | "DISPUTE_CLOSED"
  | "DISPUTE_CLOSED_MERCHANT_FAV"
  | "DISPUTE_CLOSED_CUSTOMER_FAV"
  | "DISPUTE_RESOLVED_BY_REFUND"
  | "NO_RESPONSE";

/** pg-dashboard's MerchantChargebackTabs, sent as `bucketName` (ALL_CHARGEBACKS as null). */
export type DisputeBucket = "ACTION_REQUIRED" | "UNDER_REVIEW" | "ALL_CHARGEBACKS" | "WON" | "LOST";

export type CbSortKey = "DUE_DATE" | "CREATION_TIME" | "COMPLETION_TIME";

/** One row of `POST /v1/search/cb`. */
export type DisputeRecord = {
  cbId: string;
  cbAmount: string;
  cbLevel: CbLevel;
  cbCaseStatus: CbCaseStatus;
  cbReasonCode: string;
  cbReasonShortDescription: string | null;
  preArbCompAmount: string | null;
  preArbCbAmount: string | null;
  arbCompAmount: string | null;
  arbCbAmount: string | null;
  dueDate: string;
  formattedDueDate: string;
  formattedCreationTime: string;
  formattedCbCompletionTime: string | null;
  merchantBucket: string;
  glocalBucket: string;
  merchantId: string;
  txnGid: string;
  orderId: string;
  displayStatus: DisplayStatus;
  paymentMethod: string;
  subPaymentMethod: string | null;
  maskedCardNo: string | null;
};

export type DisputeSearchResponse = CbEnvelope<{ data: DisputeRecord[]; totalCount: number }>;

/** The body `buildRequestBody(…, "CHARGEBACK", …)` produces for a merchant. */
export type DisputeSearchBody = {
  pageLimit: number;
  from: number;
  queryString?: string;
  fieldSearch?: Record<string, string[]>;
  startTime?: number;
  endTime?: number;
  fieldOrSearch: Record<string, string[]>;
  chargebackSearchType: string;
  bucketName: string | null;
  cbSearchTimeRange: CbSortKey | null;
  isAscOrder: boolean | undefined;
  mid: null;
};

export type CbStaticData = {
  cbReasonMap: Record<string, string>;
  cbCaseStatus: string[];
  cbDocumentMap: Record<string, string[]>;
  cbDocInfo: Record<string, { shortDesc: string; desc: string }>;
};

export type CbStaticDataResponse = CbEnvelope<{ "static-data": CbStaticData }>;

export type CbFeeData = {
  penaltyFee: string | null;
  penaltyFeeCurrency: string | null;
  withdrawalFee: string | null;
  withdrawalFeeCurrency: string | null;
};

export type ChargebackDetails = {
  cbId: string;
  merchantId: string;
  txnGid: string;
  cbLevel: CbLevel;
  cbCaseInitiateTxnData: {
    txnGid: string;
    orderId: string;
    arn: string | null;
    rrn: string | null;
    merchantTxnId: string | null;
    merchantUniqueId: string | null;
    merchantTxnDate: string | null;
    txnAmount: string | null;
    txnCurrency: string | null;
    paymentMethod: string;
    subPaymentMethod: string | null;
  };
  cbCaseMetaData: {
    cbReasonCode: string | null;
    maskedCardNo: string | null;
    cardBrand: string | null;
    cbReasonDescription: string | null;
    cbReasonShortDescription?: string | null;
    arbFeeData: CbFeeData | null;
  };
  formattedCreationTime: string;
  cbCaseStatus: CbCaseStatus;
  cbExternalDrawerViewStatus: CbExternalDrawerViewStatus;
  formattedDueDate: string;
  dueDate: string;
  cbClosureTime: string | null;
  cbAmount: string;
  cbCurrency: string | null;
  preArbCompAmount: string | null;
  preArbCbAmount: string | null;
  arbCompAmount: string | null;
  arbCbAmount: string | null;
  totalAcceptedAmount: string | null;
  totalContestedAmount: string | null;
  levelAcceptedAmount: string | null;
  levelContestedAmount: string | null;
  fulfillmentDataRequired: boolean;
  isDecisionMadeByInternalUser: boolean;
  caseId?: string | null;
};

export type CbCustomerDetails = {
  firstName: string | null;
  lastName: string | null;
  emailId: string | null;
};

export type CbDocRecommendation = {
  serviceType: string;
  docs: { docType: string; shortDesc: string; desc: string }[];
};

export type CbDetailsPayload = {
  cbDetails: ChargebackDetails | undefined;
  cbCustomerDetails: CbCustomerDetails | undefined;
  displayStatus: DisplayStatus;
  cbSubmitEvidenceFormattedTime: string | null;
  cbRepresentedFormattedTime: string | null;
  cbDocRecommendation?: CbDocRecommendation | null;
};

export type CbDetailsResponse = CbEnvelope<{ "chargeback-details": CbDetailsPayload | undefined }>;

export type CbDoc = {
  docType: string | null;
  fileId: string | null;
  fileName: string | null;
  originalFileName: string | null;
  url: string | null;
  shortDesc?: string | null;
};

export type CbDocsResponse = CbEnvelope<{ cbDocs: CbDoc[] | null }>;

export type CbTimelineRecord = {
  actionId: string;
  actionType: string;
  actionDescription: string | null;
  formattedCreationTime: string | null;
};

export type CbTimelineResponse = CbEnvelope<{ chargebackTimeline: CbTimelineRecord[] | null }>;

export type CbConversationItem = {
  messageId: string | null;
  creationTime: string | null;
  username: string | null;
  message: string | null;
};

export type CbMessagesResponse = CbEnvelope<{ conversation: CbConversationItem[] | null }>;

// ── View model ────────────────────────────────────────────────────────────────

/**
 * The three decision screens production has. Both compliance levels use the
 * pre-arbitration screen, as pg-dashboard's PRE_ARB_SCREEN_LEVELS does.
 */
export type DisputeScreenStage = "CHARGEBACK" | "PRE_ARBITRATION" | "ARBITRATION";

export type Fee = { amount: number; currency: string };

/**
 * One dispute as the detail drawer and page read it, built from
 * `GET /v2/cb/details/{mid}/{cbId}` by toDisputeCase. Amounts are numbers;
 * dates are left as the API sends them (formatTimestamp reads every shape).
 */
export interface DisputeCase {
  cbId: string;
  merchantId: string;
  txnGid: string;
  orderId: string;
  caseId: string | null;
  level: CbLevel;
  screenStage: DisputeScreenStage;
  status: CbExternalDrawerViewStatus;
  displayStatus: DisplayStatus;
  currency: string;
  /** The amount for the current level (CB_AMOUNT_MAPPER). */
  amount: number;
  levelAcceptedAmount: number | null;
  levelContestedAmount: number | null;
  /** Raw amounts, sent back in request bodies exactly as received. */
  raw: {
    levelAmount: string;
    cbAmount: string;
    levelContested: string | null;
    totalContested: string | null;
  };
  reasonCode: string;
  reasonShort: string;
  /** The network's description, or pg-dashboard's "outside standard categories" fallback. */
  reasonDescription: string;
  raisedOn: string;
  /** Epoch ms, as a string. */
  dueDate: string;
  closedOn: string | null;
  submittedOn: string | null;
  representedOn: string | null;
  penaltyFee: Fee | null;
  withdrawalFee: Fee | null;
  /** "We've accepted this dispute on your behalf" instead of "You've accepted". */
  decidedByPayGlocal: boolean;
  fulfillmentRequired: boolean;
  payment: { method: string; brand: string | null; maskedCardNo: string | null };
  customer: { name: string; email: string | null };
  transaction: {
    amount: number | null;
    currency: string | null;
    merchantTxnId: string | null;
    merchantUniqueId: string | null;
    arn: string | null;
    rrn: string | null;
    date: string | null;
  };
  docRecommendation: CbDocRecommendation["docs"];
}
