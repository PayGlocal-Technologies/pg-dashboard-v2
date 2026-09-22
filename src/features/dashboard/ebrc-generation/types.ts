// TODO(integration): eBRC generation has no backend yet — the DGFT connect
// flow, the IRM list, and the request/status list below are all mock, per
// CLAUDE.md's migration checklist (endpoint URL, request payload and
// response shape must be copied from a real spec, not guessed). Shaped to
// match the merchant-facing screens directly (columns, statuses, filters)
// so wiring up the real endpoints later is a source swap rather than a
// component rewrite.

/** Whether an IRM has been mapped to a shipping bill yet — independent of
 *  `ProcessStatus`, which tracks the eBRC request itself once mapping is
 *  under way. */
export type MappingStatus = "UNMAPPED" | "UNDER_CONSIDERATION" | "MAPPED";

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  UNMAPPED: "Unmapped",
  UNDER_CONSIDERATION: "Under consideration",
  MAPPED: "Mapped",
};

/** Where the eBRC request itself stands, once an IRM has entered the flow. */
export type ProcessStatus = "NOT_STARTED" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  NOT_STARTED: "Not started",
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

/** One Inward Remittance Message available to map into an eBRC request. */
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
}

export type DeductionType = "COMMISSION" | "DISCOUNT" | "INSURANCE" | "FREIGHT" | "OTHER";

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  COMMISSION: "Commission",
  DISCOUNT: "Discount",
  INSURANCE: "Insurance",
  FREIGHT: "Freight",
  OTHER: "Other",
};

export interface DeductionEntry {
  type: DeductionType;
  amount: string;
  additionalInfo: string;
}

/** How one selected IRM gets mapped to a shipping bill — the "Map Shipping
 *  Bill & Deduction" step's own per-IRM state. */
export interface IrmMapping {
  irmId: string;
  method: "upload" | "manual";
  fileName: string | null;
  shippingBillNumber: string;
  shippingBillCurrency: string;
  portCode: string;
  billInvoiceNumber: string;
  irmAmountToMap: string;
  deduction: DeductionEntry | null;
}

export function emptyMapping(irmId: string): IrmMapping {
  return {
    irmId,
    // "Upload document" is the default/recommended path, so it's the
    // tab a fresh mapping opens on rather than "Enter manually".
    method: "upload",
    fileName: null,
    shippingBillNumber: "",
    shippingBillCurrency: "INR",
    portCode: "",
    billInvoiceNumber: "",
    irmAmountToMap: "",
    deduction: null,
  };
}

/** Whether one IRM's shipping-bill mapping has everything Step 3's own
 *  review already required to count it as done — the single definition of
 *  "complete" shared by the Map Shipping Bill workspace (its left-panel
 *  status and progress count) and the Review & Confirm step, instead of
 *  each re-deriving it. Lenient by design, matching what Review & Confirm
 *  always checked: an uploaded file, or just a shipping bill number typed
 *  in manually — not every manual field. */
export function isMappingComplete(mapping: IrmMapping | undefined): boolean {
  if (!mapping) return false;
  return mapping.method === "upload" ? !!mapping.fileName : !!mapping.shippingBillNumber;
}

/** Rough progress signal for a mapping that isn't complete yet — anything
 *  typed or attached, even a single field, counts as "started" so the left
 *  panel can distinguish "In progress" from "Needs details" (untouched). */
export function isMappingStarted(mapping: IrmMapping | undefined): boolean {
  if (!mapping) return false;
  return !!(
    mapping.fileName ||
    mapping.shippingBillNumber ||
    mapping.portCode ||
    mapping.billInvoiceNumber ||
    mapping.irmAmountToMap
  );
}

export type EbrcRequestStatus = "PENDING" | "VALIDATED" | "FAILED";

export const EBRC_REQUEST_STATUS_LABELS: Record<EbrcRequestStatus, string> = {
  PENDING: "Pending",
  VALIDATED: "Validated",
  FAILED: "Failed",
};

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
  status: EbrcRequestStatus;
  totalIrms: number;
  createdAt: string;
  irms: EbrcRequestIrm[];
}
