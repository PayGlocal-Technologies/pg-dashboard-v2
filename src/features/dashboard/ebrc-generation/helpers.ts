import {
  DEDUCTION_FIELDS,
  emptyDeductions,
  normalizePortCode,
  type DeductionsByType,
  type EBRCBulkDetails,
  type EbrcRequestRow,
  type IrmDetails,
  type IrmMapping,
  type IrmSelectionRow,
  type MappingStatus,
  type ProcessStatus,
  type ShippingBillData,
} from "@/features/dashboard/ebrc-generation/types";

/**
 * API record → view model. Every screen reads the view models, so an API field
 * rename lands here rather than in a dozen components.
 */

const MAPPING_STATUSES: MappingStatus[] = [
  "UNMAPPED",
  "UNDER_CONSIDERATION",
  "PARTIALLY_MAPPED",
  "FULLY_MAPPED",
];
const PROCESS_STATUSES: ProcessStatus[] = ["NOT_STARTED", "PENDING", "IN_PROGRESS", "COMPLETED"];

/** Unknown/absent statuses fall back rather than rendering an empty chip — the
 *  backend can add a state before this app knows about it. */
function toMappingStatus(value: string | null | undefined): MappingStatus {
  return MAPPING_STATUSES.includes(value as MappingStatus) ? (value as MappingStatus) : "UNMAPPED";
}

function toProcessStatus(value: string | null | undefined): ProcessStatus {
  return PROCESS_STATUSES.includes(value as ProcessStatus)
    ? (value as ProcessStatus)
    : "NOT_STARTED";
}

/**
 * IRM dates → ISO `YYYY-MM-DD`, so every component can keep calling the app's
 * own `formatDate`.
 *
 * The API mixes formats: `irmIssueDate` and `remittanceDate` are `DDMMYYYY`
 * ("01092026"), while `shippingBillData.sbCumInvoiceDate` is already
 * `YYYY-MM-DD`. `new Date("01092026")` is Invalid Date, which is what rendered
 * "NaN undefined NaN" down the Issue date column.
 *
 * Mirrors production's `formatMonthDateYear`, which tries the same three
 * shapes in the same order (DDMMYYYY, YYYY-MM-DD, DD/MM/YYYY) and gives up
 * rather than guessing. Returns "" for anything it cannot place, so the column
 * shows an empty cell instead of a broken one.
 */
export function toIsoDate(value: string | null | undefined): string {
  if (!value) return "";
  const raw = String(value).trim();

  // DDMMYYYY — eight digits, no separators.
  const ddmmyyyy = /^(\d{2})(\d{2})(\d{4})$/.exec(raw);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Already ISO.
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;

  // DD/MM/YYYY.
  const slashed = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (slashed) {
    const [, dd, mm, yyyy] = slashed;
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

/**
 * Money off an IRM record → a real number.
 *
 * The IRM's own amounts are strings on the wire while the ones inside
 * `shippingBillData` are numbers, so anything summing across the two has to
 * coerce first or it string-concatenates. Non-numeric and absent values become
 * 0 rather than NaN, which would poison a whole total.
 */
export function toAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * IRM number is the identity of a record everywhere in this flow — it is what
 * `fetch_irm_by_number` takes, what the mapping step keys by, and what the
 * selection carries between wizard steps. The row `id` is therefore the IRM
 * number, not a separate surrogate.
 */
export function toIrmSelectionRow(irm: IrmDetails): IrmSelectionRow {
  return {
    id: irm.irmNumber ?? "",
    irmDate: toIsoDate(irm.irmIssueDate),
    purposeCode: irm.purposeOfRemittance ?? "",
    irmNumber: irm.irmNumber ?? "",
    remitterName: irm.remitterName ?? "",
    country: irm.remitterCountry ?? "",
    currencyCode: irm.remittanceFCC ?? "",
    remittanceAmount: toAmount(irm.remittanceFCCAmount),
    availableAmount: toAmount(irm.irmAvailableAmt),
    mappingStatus: toMappingStatus(irm.irmMappingStatus),
    processStatus: toProcessStatus(irm.irmProcessStatus),
    adCode: irm.remittanceAdCode ?? "",
    merchantId: irm.merchantId ?? "",
    ifscCode: irm.ifscCode ?? "",
  };
}

/** The IRM Repository's row. Same record, one extra column (utilised) and no
 *  selection semantics. */
export interface IrmRepositoryRow {
  id: string;
  issueDate: string;
  irmNumber: string;
  remittanceAmount: number;
  currencyCode: string;
  availableAmount: number;
  utilisedAmount: number;
  mappingStatus: MappingStatus;
  processStatus: ProcessStatus;
  remitterName: string;
  remitterCountry: string;
  remitterDate: string;
  purposeOfRemittance: string;
  panNumber: string;
  iecCode: string;
  adCode: string;
  ifscCode: string;
}

export function toIrmRepositoryRow(irm: IrmDetails): IrmRepositoryRow {
  return {
    id: irm.irmNumber ?? "",
    issueDate: toIsoDate(irm.irmIssueDate),
    irmNumber: irm.irmNumber ?? "",
    remittanceAmount: toAmount(irm.remittanceFCCAmount),
    currencyCode: irm.remittanceFCC ?? "",
    availableAmount: toAmount(irm.irmAvailableAmt),
    utilisedAmount: toAmount(irm.irmUtilizedAmt),
    mappingStatus: toMappingStatus(irm.irmMappingStatus),
    processStatus: toProcessStatus(irm.irmProcessStatus),
    remitterName: irm.remitterName ?? "",
    remitterCountry: irm.remitterCountry ?? "",
    remitterDate: toIsoDate(irm.remittanceDate),
    purposeOfRemittance: irm.purposeOfRemittance ?? "",
    panNumber: irm.panNumber ?? "",
    iecCode: irm.iecCode ?? "",
    adCode: irm.remittanceAdCode ?? "",
    ifscCode: irm.ifscCode ?? "",
  };
}

/** eBRC request row. `totalIrms` follows pg-dashboard's own fallback chain:
 *  the returned DTO array first, then the count the backend reports. */
export function toEbrcRequestRow(record: EBRCBulkDetails): EbrcRequestRow {
  const dtos = record.ebrcBulkGenDtos ?? [];
  return {
    id: record.requestId ?? record.dgftAckId ?? "",
    requestId: record.requestId ?? "",
    dgftAckId: record.dgftAckId ?? "",
    iecNumber: record.iecNumber ?? "",
    status: record.status ?? "",
    totalIrms: dtos.length || (record.recordResCount ?? 0),
    createdAt: record.ebrcCreatedAt ?? record.creationTime ?? "",
    merchantId: record.merchantId ?? "",
    irms: dtos.map((dto) => ({
      irmNumber: dto.irmNumber ?? "",
      serialNo: Number(dto.serialNo ?? 0),
      iecNumber: record.iecNumber ?? "",
      portCode: dto.portCode ?? "",
      billNumber: dto.billNo ?? "",
      shippingBillNumber: dto.sbCumInvoiceNumber ?? "",
      ebrcNumber: dto.ebrcNumber ?? null,
      fobValue: Number(dto.sbCumInvoiceValueinFCC ?? 0),
      currencyCode: dto.sbCumInvoiceFCC ?? dto.irmFCC ?? "",
    })),
  };
}

// ── View model → API ─────────────────────────────────────────────────────────

/** Blank → `undefined`, so the key is dropped from the JSON body entirely.
 *
 *  Production clears a field with `form.setFieldsValue({ [key]: undefined })`
 *  and spreads the form's values onto the saved record; `JSON.stringify` then
 *  omits it. Sending `null` or `""` instead would be a different payload —
 *  an explicit "set this to nothing" rather than "leave it alone" — so this
 *  matches production rather than normalising to null. */
function orUndefined(value: string | null | undefined): string | undefined {
  return value && value.trim() ? value.trim() : undefined;
}

/**
 * One mapping → the `shippingBillData` `save_shipping_data` persists.
 *
 * Built the way production builds it (`buildSavePayload` in
 * ShippingBillMapping/index.tsx): the record the server already holds, with
 * the form's own values layered over it, and `irmNumber` always set. Anything
 * the merchant has not filled in keeps whatever the server had — a blank field
 * does not wipe a value the PDF extraction wrote.
 *
 * Every value is passed through as the raw string the field holds. Production's
 * shipping-bill and deduction forms are all `type: "text"` and write straight
 * into `shippingBillData`, so coercing to a number here would send a different
 * payload for the same input.
 *
 * `sbCumInvoiceFCC` defaults to the IRM's own remittance currency, which is
 * what production seeds that (disabled) field with.
 */
export function toShippingBillData(mapping: IrmMapping, irm: IrmDetails): ShippingBillData {
  const data: ShippingBillData = {
    ...(irm.shippingBillData ?? {}),

    irmNumber: irm.irmNumber ?? mapping.irmId,

    // The four text fields the merchant types into go through as-is, empty
    // string included — that is literally what production's Antd form puts in
    // `allValues` for a field that has been cleared, and these are `type:
    // "text"` on its side too. Only the deduction heads below use `undefined`,
    // because production clears those explicitly rather than by emptying them.
    sbCumInvoiceNumber: mapping.shippingBillNumber,
    sbCumInvoiceFCC: mapping.shippingBillCurrency || (irm.remittanceFCC ?? ""),
    sbCumInvoiceDate: mapping.shippingBillDate,
    portCode: normalizePortCode(mapping.portCode),
    billNo: mapping.billInvoiceNumber,
  };

  // Numeric on the wire like `mappedIRMAmountFCC`, so parsed rather than passed
  // through; a blank leaves whatever the server had.
  const billValue = orUndefined(mapping.shippingBillValue);
  if (billValue !== undefined) {
    const parsed = Number(billValue);
    data.sbCumInvoiceValueinFCC = Number.isFinite(parsed) ? parsed : null;
  }

  // `mappedIRMAmountFCC` is typed as a number on the wire even though
  // production's field is text, so it is the one value parsed here. A blank
  // leaves whatever the server had rather than zeroing it.
  const mapped = orUndefined(mapping.irmAmountToMap);
  if (mapped !== undefined) {
    const parsed = Number(mapped);
    data.mappedIRMAmountFCC = Number.isFinite(parsed) ? parsed : null;
  }

  if (mapping.fileName) data.fileName = mapping.fileName;

  // All five heads are written every save. A row the merchant switched off is
  // set to `undefined`, which drops it from the body — production's own
  // "Delete All Deductions" and per-row toggle do exactly this.
  for (const { type, amountKey, infoKey } of DEDUCTION_FIELDS) {
    const entry = mapping.deductions[type];
    (data as Record<string, unknown>)[amountKey] = orUndefined(entry?.amount);
    (data as Record<string, unknown>)[infoKey] = orUndefined(entry?.additionalInfo);
  }

  return data;
}

/** Server-held shipping data → the step's editable state, so reopening a
 *  half-finished mapping shows what was saved rather than a blank form. */
export function toIrmMapping(
  irmNumber: string,
  data: ShippingBillData | null | undefined,
  /** The IRM's remittance currency, which seeds the (read-only) currency
   *  field when the server has none of its own yet. */
  currency?: string
): IrmMapping {
  const deductions: DeductionsByType = emptyDeductions();

  if (data) {
    for (const { type, amountKey, infoKey } of DEDUCTION_FIELDS) {
      const amount = data[amountKey];
      const info = data[infoKey];
      deductions[type] = {
        amount: amount === null || amount === undefined ? "" : String(amount),
        additionalInfo: info === null || info === undefined ? "" : String(info),
      };
    }
  }

  return {
    irmId: irmNumber,
    fileName: data?.fileName ?? null,
    shippingBillNumber: data?.sbCumInvoiceNumber ?? "",
    shippingBillCurrency: data?.sbCumInvoiceFCC ?? currency ?? "",
    shippingBillValue:
      data?.sbCumInvoiceValueinFCC === null || data?.sbCumInvoiceValueinFCC === undefined
        ? ""
        : String(data.sbCumInvoiceValueinFCC),
    // `YYYY-MM-DD` already on this field, unlike the IRM's own DDMMYYYY dates.
    shippingBillDate: toIsoDate(data?.sbCumInvoiceDate),
    portCode: data?.portCode ?? "",
    billInvoiceNumber: data?.billNo ?? "",
    irmAmountToMap:
      data?.mappedIRMAmountFCC === null || data?.mappedIRMAmountFCC === undefined
        ? ""
        : String(data.mappedIRMAmountFCC),
    deductions,
  };
}

/**
 * Headers for the presigned S3 PUT. Verbatim from pg-dashboard's
 * `buildS3Headers` (src/features/ebrc-generation/helpers.ts) — S3 rejects the
 * upload if the `x-amz-meta-*` set does not match what the presigned URL was
 * signed with, so every key is sent even when empty.
 */
export function buildS3Headers(metadata?: {
  irmNumber?: string | null;
  merchantId?: string | number;
  fileExtension?: string | number;
  maxSizeMb?: string | number;
}): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "x-amz-meta-irmnumber": String(metadata?.irmNumber ?? ""),
    "x-amz-meta-merchantid": String(metadata?.merchantId ?? ""),
    "x-amz-meta-fileextension": String(metadata?.fileExtension ?? ""),
    "x-amz-meta-maxsizemb": String(metadata?.maxSizeMb ?? ""),
  };
}

/** Headers for the bulk workbook's presigned PUT. A different content type and
 *  metadata set from the PDF one above — see BulkUploadModal in pg-dashboard. */
export function buildBulkUploadS3Headers(metadata?: {
  fileName?: string | number;
  maxSizeMb?: string | number;
  merchantId?: string | number;
}): Record<string, string> {
  return {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "x-amz-meta-filename": String(metadata?.fileName ?? ""),
    "x-amz-meta-maxsizemb": String(metadata?.maxSizeMb ?? "10"),
    "x-amz-meta-merchantid": String(metadata?.merchantId ?? ""),
  };
}

/**
 * Saves a base64 payload to disk. Both the bulk template and the generated
 * eBRC PDF arrive as `fileContent` strings rather than blobs, so the download
 * is assembled client-side exactly as production does it.
 */
export function downloadBase64File(
  fileContent: string,
  fileName: string,
  contentType: string
): void {
  const byteCharacters = atob(fileContent);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteNumbers], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Sum of the five deduction amounts on a saved shipping-bill record.
 *
 * Ported from pg-dashboard's `calculateDeductions`, which reads the same five
 * `*Deduct` fields off DEDUCTION_DATA. Non-numeric and absent values count as
 * zero rather than poisoning the total with NaN.
 */
export function calculateDeductions(data: ShippingBillData | null | undefined): number {
  if (!data) return 0;
  return DEDUCTION_FIELDS.reduce((sum, { amountKey }) => {
    const value = data[amountKey];
    const amount = typeof value === "number" ? value : Number(value);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}
