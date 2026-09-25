// ─────────────────────────────────────────────────────────────────────────────
// eBRC — API contracts and view models.
//
// Every type under "API contracts" is copied field-for-field from pg-dashboard
// (src/features/ebrc-generation/types.ts), which is production and the only
// source of truth for these payloads. The view models below them are v2's own,
// and the mappers in `helpers.ts` are the single place the two meet.
// ─────────────────────────────────────────────────────────────────────────────

// ── Statuses ─────────────────────────────────────────────────────────────────

/**
 * Whether an IRM has been mapped to a shipping bill yet — independent of
 * `ProcessStatus`, which tracks the eBRC request itself once mapping is under
 * way.
 *
 * All four values the domain uses, because the two sources disagree and both
 * are real: `irm/search` on UAT returns UNMAPPED and UNDER_CONSIDERATION, while
 * pg-dashboard's own filter config offers UNMAPPED, PARTIALLY_MAPPED and
 * FULLY_MAPPED. Narrowing to either set alone mislabels live records — an
 * UNDER_CONSIDERATION row rendered as "Unmapped" is worse than an unused enum
 * member.
 */
export type MappingStatus =
  "UNMAPPED" | "UNDER_CONSIDERATION" | "PARTIALLY_MAPPED" | "FULLY_MAPPED";

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  UNMAPPED: "Unmapped",
  UNDER_CONSIDERATION: "Under consideration",
  PARTIALLY_MAPPED: "Partially mapped",
  FULLY_MAPPED: "Fully mapped",
};

/** Where the eBRC request itself stands, once an IRM has entered the flow. */
export type ProcessStatus = "NOT_STARTED" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  NOT_STARTED: "Not started",
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

/** Shipping-bill PDF extraction, polled after an upload (fetch_extraction_status). */
export type ExtractionStatus = "STARTED" | "COMPLETED" | "FAILED";

/** Extraction states that end the poll — anything else means keep polling. */
export const EXTRACTION_STATUS_DONE: ReadonlySet<string> = new Set(["COMPLETED", "FAILED"]);

// ── API contracts ────────────────────────────────────────────────────────────

/** DynamoDB pagination cursor, echoed back verbatim. Opaque to this app. */
export type ExclusiveStartKey = Record<string, DynamoDBAttributeValue>;

export interface DynamoDBAttributeValue {
  s?: string | null;
  n?: string | null;
  b?: unknown;
  m?: unknown;
  l?: unknown;
  null?: boolean;
  bs?: unknown;
  ns?: unknown;
  ss?: unknown;
  bool?: boolean | null;
}

/** One Inward Remittance Message, exactly as `irm/search` and
 *  `fetch_irm_by_number` return it. */
export interface IrmDetails {
  merchantId?: string;
  irmNumber?: string | null;
  /** `DDMMYYYY`, e.g. "01092026" — not ISO. Normalise with `toIsoDate`. */
  irmIssueDate?: string | null;
  irmStatus?: string | null;

  ifscCode?: string | null;
  remittanceAdCode?: string | null;
  /** `DDMMYYYY`, same as `irmIssueDate`. */
  remittanceDate?: string | null;
  /** Remittance currency. "FCC" is foreign currency code. */
  remittanceFCC?: string;

  /**
   * Money on the IRM record arrives as a *string* ("206164.59"), unlike the
   * numbers inside `shippingBillData`. Typed honestly so nothing adds them
   * without coercing first — `0 + "206164.59"` is "0206164.59", which is how a
   * selection total silently turns into nonsense. Use `toAmount` in helpers.ts.
   */
  remittanceFCCAmount?: string | number | null;
  ormAmountFCC?: string | number | null;
  irmAvailableAmt?: string | number | null;
  irmUtilizedAmt?: string | number | null;

  iecCode?: string | null;
  panNumber?: string | null;
  purposeOfRemittance?: string | null;

  remitterName?: string | null;
  remitterCountry?: string | null;

  subjectType?: string | null;

  userId?: string | null;
  platformCustomerId?: string | null;

  irmCreatedAt?: string | null;
  irmUpdatedAt?: string | null;

  creationTime?: string | null;
  updationTime?: string | null;

  irmProcessStatus?: ProcessStatus | null;
  irmMappingStatus?: MappingStatus | null;

  shippingBillData?: ShippingBillData | null;
  shippingBillExtractionStatus?: ExtractionStatus | null;
}

/**
 * The shipping-bill record attached to one IRM — what `save_shipping_data`
 * persists and what `push_irm` submits to DGFT.
 *
 * The five deduction pairs are fixed by DGFT's own schema: each is a
 * `*Deduct` amount plus a `*Info` free-text note, and all five travel on every
 * submission whether or not the merchant filled them in.
 */
export interface ShippingBillData {
  serialNo?: number | string | null;
  uploadType?: number | string | null;
  branchSlNo?: number | string | null;

  irmIfscCode?: string | null;
  irmAdCode?: string | null;
  irmNumber?: string | null;
  irmDt?: string | null;
  irmFCC?: string | null;
  irmPurposeCode?: string | null;
  irmRemitAmtFCC?: number | string | null;

  sbCumInvoiceNumber?: string | null;
  sbCumInvoiceDate?: string | null;
  portCode?: string | null;
  billNo?: string | null;

  sbCumInvoiceFCC?: string | null;
  sbCumInvoiceValueinFCC?: number | string | null;
  mappedIRMAmountFCC?: number | null;

  isVostro?: string | null;
  vostroType?: string | null;
  mappedORMAmountFCC?: number | string | null;

  isThirdPartyExport?: string | null;

  commissionValDeduct?: number | string | null;
  commissionValInfo?: number | string | null;

  discountValDeduct?: number | string | null;
  discountValInfo?: number | string | null;

  insuranceValDeduct?: number | string | null;
  insuranceValInfo?: number | string | null;

  otherDeductionDeduct?: number | string | null;
  otherdeductionsInfo?: number | string | null;

  freightValDeduct?: number | string | null;
  freightValInfo?: number | string | null;

  sacCode1?: string | null;
  sacCode2?: string | null;

  serviceTypeModesValue?: string | null;
  preSignedUrl?: string | null;
  fileName?: string | null;
}

/** `push_irm`'s per-IRM payload. Structurally the same as ShippingBillData with
 *  the eBRC number the backend assigns. */
export interface EBRCBulkGenDto extends ShippingBillData {
  ebrcNumber?: string | null;
}

/** One eBRC request, as `ebrc/search` returns it. */
export interface EBRCBulkDetails {
  merchantId?: string | null;
  userId?: string | null;
  platformCustomerId?: string | null;
  requestId?: string | null;
  iecNumber?: string | null;
  recordResCount?: number | null;
  uploadType?: string | null;
  decalarationFlag?: string | null;
  dgftAckId?: string | null;
  /** Free-form on the wire — pg-dashboard renders it raw, with no enum. */
  status?: string | null;
  processedAt?: string | null;
  ebrcCreatedAt?: string | null;
  ebrcUpdatedAt?: string | null;
  creationTime?: string | null;
  updationTime?: string | null;
  ebrcBulkGenDtos?: EBRCBulkGenDto[] | null;
}

// ── Request bodies ───────────────────────────────────────────────────────────

/** `refresh_irm` / `refresh_genebrc`: pulls fresh records from DGFT into the
 *  merchant's own store before the search endpoint is read. */
export interface RefreshRecordsRequestBody {
  operationType: string;
  limit: string;
  nextToken: ExclusiveStartKey | null;
  merchantIds?: string[] | null;
}

/**
 * The search body both eBRC tables post. It is v2's own `TableReqBody` plus the
 * two fields only these endpoints take — pg-dashboard spreads them onto
 * `buildRequestBody`'s result the same way.
 */
export interface EbrcSearchReqBody {
  pageLimit: number;
  from: number;
  searchFilterType?: string;
  queryString?: string;
  fieldSearch?: Record<string, string | string[]>;
  /** Always "creationTime" for both eBRC searches. */
  sortKey?: string;
  /** Excludes finished IRMs from the wizard's pick list. Absent on the IRM
   *  Repository, which lists everything including completed ones. */
  mustNotFilters?: Record<string, string>;
}

// ── Response envelopes ───────────────────────────────────────────────────────

export interface IrmSearchResponse {
  data: { totalCount: number; data: IrmDetails[] };
}

export interface EbrcSearchResponse {
  data: { totalCount: number; data: EBRCBulkDetails[] };
}

export interface IRMRecordsData {
  records: (IrmDetails | null)[];
  /** Per-IRM presigned GET for the uploaded shipping-bill PDF, keyed by IRM
   *  number. Only present once extraction has COMPLETED. */
  presignedUrls?: Record<string, string>;
  lastEvaluatedKey: ExclusiveStartKey | null;
  isLastPage: boolean;
}

export interface IRMRecordsApiResponse {
  data: IRMRecordsData;
}

export interface CustomerStatusResponse {
  /** "True" (capital T, a string) when the DGFT session is live. Compared
   *  exactly, as pg-dashboard does — any other value means not connected. */
  data?: { customerValidated?: string };
}

export interface ExtractionStatusApiResponse {
  data?: { shippingBillExtractionStatus?: ExtractionStatus | null };
}

/** Presigned S3 PUT target, for both the shipping-bill PDF and the bulk
 *  workbook. `metadata` becomes `x-amz-meta-*` headers on the PUT. */
export interface PresignedUploadResponse {
  data?: {
    upload_url?: string;
    metadata?: Record<string, string | number | undefined>;
  };
}

export interface ExtractShippingDataResponse {
  data?: { shippingBillData?: ShippingBillData };
}

/** Base64 file payloads — the template workbook and the generated eBRC PDF
 *  both come back inline rather than as a blob. */
export interface Base64FileResponse {
  data?: { fileName?: string; contentType?: string; fileContent?: string };
}

export interface BulkUploadIrm {
  serialNo: number;
  irmNumber: string;
  irmDt: string;
  irmAdCode: string;
  irmIfscCode: string;
  sbCumInvoiceNumber: string;
}

export interface BulkUploadExcelResponse {
  data?: {
    result?: {
      dgftAckId?: string;
      requestId?: string;
      ackStatus?: string;
      recordResCount?: number;
      parsedRowCount?: number;
      irmNumbers?: string[];
      irms?: BulkUploadIrm[];
      errorDetails?: string[];
    };
  };
}

// ── View models ──────────────────────────────────────────────────────────────

/** One IRM available to map into an eBRC request — the Select IRMs step's row. */
export interface IrmSelectionRow {
  id: string;
  irmDate: string;
  purposeCode: string;
  irmNumber: string;
  remitterName: string;
  country: string;
  currencyCode: string;
  remittanceAmount: number;
  availableAmount: number;
  mappingStatus: MappingStatus;
  processStatus: ProcessStatus;
  adCode: string;
  /** Carried through so a per-row action can address the MID that owns it,
   *  rather than assuming the currently selected one. */
  merchantId: string;
  ifscCode: string;
}

/**
 * The five deduction rows DGFT's schema fixes. `apiAmountKey` / `apiInfoKey`
 * are the exact ShippingBillData fields each one writes — note
 * `otherdeductionsInfo`'s lower-case "d", which is the wire spelling and not a
 * typo to fix here.
 */
export type DeductionType = "COMMISSION" | "DISCOUNT" | "INSURANCE" | "FREIGHT" | "OTHER";

export const DEDUCTION_FIELDS: {
  type: DeductionType;
  /** Production's own heading and one-line description (DEDUCTION_DATA). */
  heading: string;
  subHeading: string;
  amountKey: keyof ShippingBillData;
  infoKey: keyof ShippingBillData;
}[] = [
  {
    type: "COMMISSION",
    heading: "Commission",
    subHeading: "Commission charges and fee",
    amountKey: "commissionValDeduct",
    infoKey: "commissionValInfo",
  },
  {
    type: "DISCOUNT",
    heading: "Discount",
    subHeading: "Trade and volume discounts",
    amountKey: "discountValDeduct",
    infoKey: "discountValInfo",
  },
  {
    type: "INSURANCE",
    heading: "Insurance",
    subHeading: "Insurance charges and fee",
    amountKey: "insuranceValDeduct",
    infoKey: "insuranceValInfo",
  },
  {
    type: "FREIGHT",
    heading: "Freight",
    subHeading: "Freight and shipping charges",
    amountKey: "freightValDeduct",
    infoKey: "freightValInfo",
  },
  {
    type: "OTHER",
    heading: "Other Deductions",
    subHeading: "Any other applicable deductions",
    amountKey: "otherDeductionDeduct",
    infoKey: "otherdeductionsInfo",
  },
];

/**
 * One deduction row's editable state.
 *
 * Both values stay raw strings: every field in production's deduction form is
 * `type: "text"` and its value is written through to `shippingBillData`
 * untouched, so coercing to a number here would send a different payload than
 * production does for the same keystrokes.
 *
 * A row the merchant never enabled, or turned off again, is omitted from the
 * save entirely rather than sent as null or "" — production clears both fields
 * to `undefined`, which `JSON.stringify` drops. See `toShippingBillData`.
 */
export interface DeductionEntry {
  amount: string;
  additionalInfo: string;
}

export type DeductionsByType = Record<DeductionType, DeductionEntry>;

export function emptyDeductions(): DeductionsByType {
  return {
    COMMISSION: { amount: "", additionalInfo: "" },
    DISCOUNT: { amount: "", additionalInfo: "" },
    INSURANCE: { amount: "", additionalInfo: "" },
    FREIGHT: { amount: "", additionalInfo: "" },
    OTHER: { amount: "", additionalInfo: "" },
  };
}

/**
 * How one selected IRM gets mapped to a shipping bill — the "Map Shipping Bill
 * & Deduction" step's own per-IRM state.
 *
 * One field per entry in production's SHIPPING_BILL_DETAILS_FORM_FIELDS, all
 * of which it marks required. Uploading a shipping bill does not replace this
 * form: the backend extracts the PDF and the extracted values come back on the
 * IRM record, which prefills these same fields for the merchant to check and
 * correct before saving.
 */
export interface IrmMapping {
  irmId: string;
  /** The uploaded PDF's name, when one was attached. Optional — a merchant can
   *  fill the form in by hand instead. */
  fileName: string | null;
  shippingBillNumber: string;
  /** Always the IRM's own remittance currency; production renders this field
   *  disabled and seeds it from `remittanceFCC`. */
  shippingBillCurrency: string;
  shippingBillValue: string;
  shippingBillDate: string;
  portCode: string;
  billInvoiceNumber: string;
  irmAmountToMap: string;
  deductions: DeductionsByType;
}

export function emptyMapping(irmId: string, currency = ""): IrmMapping {
  return {
    irmId,
    fileName: null,
    shippingBillNumber: "",
    shippingBillCurrency: currency,
    shippingBillValue: "",
    shippingBillDate: "",
    portCode: "",
    billInvoiceNumber: "",
    irmAmountToMap: "",
    deductions: emptyDeductions(),
  };
}

/** Field keys a validation error can be attached to. */
export type MappingFieldErrors = Partial<
  Record<
    | "shippingBillNumber"
    | "shippingBillValue"
    | "shippingBillDate"
    | "portCode"
    | "billInvoiceNumber"
    | "irmAmountToMap"
    | "deductions",
    string
  >
>;

/** Up to two decimal places, production's `amountValidator`. */
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

/**
 * The checks production runs before it will save a mapping — its Antd form
 * rules (SHIPPING_BILL_DETAILS_FORM_FIELDS) plus the deduction ceiling from
 * `handleNext`, in the same order the form presents them.
 *
 * This is what stops an IRM moving to IN_PROGRESS on incomplete data: the
 * status only changes when `save_shipping_data` succeeds, and the save only
 * runs once this returns nothing.
 *
 * `remittanceAmount` is the IRM's own remittance value, which bounds how much
 * of it can be mapped — production passes it into the validator as `max`.
 */
export function validateMapping(mapping: IrmMapping, remittanceAmount: number): MappingFieldErrors {
  const errors: MappingFieldErrors = {};

  if (!mapping.shippingBillNumber.trim()) {
    errors.shippingBillNumber = "Please enter shipping bill number";
  }
  if (!mapping.portCode.trim()) {
    errors.portCode = "Please enter port code";
  }
  if (!mapping.billInvoiceNumber.trim()) {
    errors.billInvoiceNumber = "Please enter bill/invoice number";
  }
  if (!mapping.shippingBillDate.trim()) {
    errors.shippingBillDate = "Please select shipping bill date";
  }

  const value = mapping.shippingBillValue.trim();
  if (!value) {
    errors.shippingBillValue = "Please enter shipping bill value";
  } else if (!AMOUNT_RE.test(value)) {
    errors.shippingBillValue = "Please enter a valid amount (up to 2 decimal places).";
  }

  const mapped = mapping.irmAmountToMap.trim();
  if (!mapped) {
    errors.irmAmountToMap = "Please enter amount to be mapped";
  } else if (!AMOUNT_RE.test(mapped)) {
    errors.irmAmountToMap = "The Amount to be Mapped must be a positive number";
  } else {
    const n = Number(mapped);
    if (n < 1 || (remittanceAmount > 0 && n > remittanceAmount)) {
      errors.irmAmountToMap = `The Amount to be Mapped must be between 1 and ${remittanceAmount}`;
    }
  }

  // Checked last, and only against a mapped amount that parsed — otherwise the
  // message would contradict the one already on that field.
  if (!errors.irmAmountToMap) {
    const deductions = totalDeductions(mapping);
    if (deductions > Number(mapped)) {
      errors.deductions = "Total deductions cannot be greater than the mapped IRM amount.";
    }
  }

  return errors;
}

/**
 * Whether a deduction row is switched on, matching production's
 * `isDeductionEnabled`: it holds a value, or the merchant toggled it on this
 * session and has not typed into it yet.
 */
export function isDeductionPopulated(entry: DeductionEntry | undefined): boolean {
  return !!(entry?.amount || entry?.additionalInfo);
}

/** Sum of every deduction row on one mapping. */
export function totalDeductions(mapping: IrmMapping | undefined): number {
  if (!mapping) return 0;
  return DEDUCTION_FIELDS.reduce((sum, { type }) => {
    const amount = Number(mapping.deductions[type]?.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

/**
 * Whether the server has accepted this IRM's mapping.
 *
 * Deliberately the server's own `irmProcessStatus`, not a guess from the form:
 * `save_shipping_data` is what moves an IRM to IN_PROGRESS, so anything else is
 * a mapping that has not been persisted — and production's progress count
 * ("N of M Completed") reads exactly this field. An earlier version called a
 * mapping complete as soon as a file was attached, which showed "Complete"
 * against IRMs the backend had never been told about.
 */
export function isMappingComplete(irm: IrmDetails | undefined): boolean {
  return irm?.irmProcessStatus === "IN_PROGRESS" || irm?.irmProcessStatus === "COMPLETED";
}

/** Rough progress signal for a mapping that isn't complete yet — anything
 *  typed or attached, even a single field, counts as "started" so the left
 *  panel can distinguish "In progress" from "Needs details" (untouched). */
export function isMappingStarted(mapping: IrmMapping | undefined): boolean {
  if (!mapping) return false;
  return !!(
    mapping.fileName ||
    mapping.shippingBillNumber ||
    mapping.shippingBillValue ||
    mapping.shippingBillDate ||
    mapping.portCode ||
    mapping.billInvoiceNumber ||
    mapping.irmAmountToMap ||
    totalDeductions(mapping) > 0
  );
}

/** One IRM inside a bulk eBRC request — a request can bundle several IRMs
 *  (see `EbrcRequestRow.totalIrms`), each surfaced as its own tab in the
 *  request details drawer. */
export interface EbrcRequestIrm {
  irmNumber: string;
  serialNo: number;
  iecNumber: string;
  portCode: string;
  billNumber: string;
  shippingBillNumber: string;
  ebrcNumber: string | null;
  fobValue: number;
  currencyCode: string;
}

export interface EbrcRequestRow {
  id: string;
  requestId: string;
  dgftAckId: string;
  iecNumber: string;
  /** Raw wire value — the API has no fixed enum here, so it is displayed as it
   *  arrives rather than mapped onto a v2 status set that could silently drop
   *  a state the backend later adds. */
  status: string;
  totalIrms: number;
  createdAt: string;
  merchantId: string;
  irms: EbrcRequestIrm[];
}

/** Currencies the shipping-bill form offers. Not mock data — the invoice
 *  currency is a merchant choice, and DGFT accepts any of these against an
 *  IRM. Lived in mock-data.ts before the endpoints landed. */
export const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED"];
/** Set by EbrcGenerationWizard right before it shows the "request received"
 *  overlay, read (and cleared) by EbrcStatusTable on its next mount — the
 *  "wait 4 hours" callout only means something the moment a request was
 *  actually just queued, not on every visit to this page. sessionStorage,
 *  not a store field: it only needs to survive the one navigation back from
 *  the wizard, the same lifetime the earlier "just logged in" flag used. */
export const EBRC_JUST_QUEUED_KEY = "ebrc_just_queued";
