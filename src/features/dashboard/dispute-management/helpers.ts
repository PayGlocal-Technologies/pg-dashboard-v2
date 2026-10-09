import type { ReportWindow } from "@/components/common/ReportDownloadDrawer";
import {
  OUTSIDE_STANDARD_REASON,
  PAGE_LIMIT,
  PAYMENT_INSTRUMENT_BY_METHOD,
  PRE_ARB_SCREEN_LEVELS,
} from "@/features/dashboard/dispute-management/constants";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";
import type {
  CbDetailsPayload,
  CbLevel,
  CbSortKey,
  CbStaticData,
  DisputeBucket,
  DisputeCase,
  DisputeRecord,
  DisputeScreenStage,
  DisputeSearchBody,
  Fee,
} from "@/features/dashboard/dispute-management/types";

// ── List request body ────────────────────────────────────────────────────────

export type DisputeFilters = {
  /** Status (fieldSearch.displayStatus). */
  displayStatus?: string[];
  /** Reason (fieldSearch.cbReasonCode): v2's own filter; pg-dashboard offers it to internal users only. */
  cbReasonCode?: string[];
  /** Disputed date, epoch millis: v2's own filter. */
  startTime?: number;
  endTime?: number;
};

export type DisputeSort = { key: CbSortKey | null; isAscOrder: boolean | undefined };

/** pg-dashboard's `isValidEmail`: an email in the search box becomes an exact-match search. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * pg-dashboard's `buildRequestBody(filters, "CHARGEBACK", props)` for a
 * merchant, reduced to what this list can produce.
 *
 * - `merchantMids` is the `fieldSearch.merchantId` scope; aggregator,
 *   reseller, portfolio and custom users pass `null` and send none.
 * - An email runs as an exact match (the `EXACT_MATCH_*` types); any other
 *   text goes to `queryString`.
 * - The Disputed date filter is a time range. The API applies a range to the
 *   time `cbSearchTimeRange` names, so while the filter is set the request
 *   names CREATION_TIME whatever the column sort is.
 */
export function buildDisputeSearchBody({
  filters,
  query,
  tab,
  sort,
  from,
  pageLimit,
  merchantMids,
}: {
  filters: DisputeFilters;
  query: string;
  tab: DisputeBucket;
  sort: DisputeSort;
  from: number;
  pageLimit: number;
  merchantMids: string[] | null;
}): DisputeSearchBody {
  const fieldSearch: Record<string, string[]> = {};
  if (merchantMids && merchantMids.length > 0) fieldSearch.merchantId = merchantMids;
  if (filters.displayStatus?.length) fieldSearch.displayStatus = filters.displayStatus;
  if (filters.cbReasonCode?.length) fieldSearch.cbReasonCode = filters.cbReasonCode;
  const hasFilters = Object.keys(fieldSearch).length > 0;
  const hasTimeRange = !!filters.startTime && !!filters.endTime;
  const text = query.trim();
  const isEmail = !!text && EMAIL_PATTERN.test(text);

  let type: string;
  if (isEmail) type = hasFilters ? "EXACT_MATCH_SEARCH_FILTER_TYPE" : "EXACT_MATCH_SEARCH";
  else if (text && hasFilters) type = "QUERY_FILTER_TYPE";
  else if (text) type = "QUERY";
  else if (hasFilters) type = "FILTER_TYPE";
  else type = "DEFAULT";
  if (hasTimeRange) type = `${type}_TIME_RANGE`;

  return {
    pageLimit,
    from,
    ...(text ? { queryString: text } : {}),
    ...(hasFilters ? { fieldSearch } : {}),
    ...(hasTimeRange ? { startTime: filters.startTime, endTime: filters.endTime } : {}),
    fieldOrSearch: {},
    chargebackSearchType: type,
    // getCbBucketName: the "all" tab is a null bucket.
    bucketName: tab === "ALL_CHARGEBACKS" ? null : tab,
    cbSearchTimeRange: hasTimeRange ? "CREATION_TIME" : sort.key,
    isAscOrder: sort.isAscOrder,
    mid: null,
  };
}

/**
 * ReportDownload's CHARGEBACK body: the list's current body (filters, search,
 * tab, sort) with the report window as its range and `_TIME_RANGE` on the
 * search type. Always from the first row: pg-dashboard carried the list's
 * page offset into the report, so a report run from page 2 missed rows.
 */
export function buildDisputeReportBody(
  listBody: DisputeSearchBody,
  window: ReportWindow
): DisputeSearchBody {
  const type = listBody.chargebackSearchType.replace(/_TIME_RANGE$/, "");
  return {
    ...listBody,
    pageLimit: PAGE_LIMIT,
    from: 0,
    startTime: window.startTime,
    endTime: window.endTime,
    chargebackSearchType: `${type}_TIME_RANGE`,
  };
}

// ── Countdown ────────────────────────────────────────────────────────────────

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * getRespondByText + getDaysBadgeType, with the clock passed in (render must
 * stay pure). `days <= 2` is urgent, `<= 5` a warning.
 */
export function respondBy(
  dueDate: string | undefined | null,
  nowMs: number
): { text: string; days: number; isOverdue: boolean; tone: "danger" | "warning" | "muted" } {
  const diffMs = Number(dueDate) - nowMs;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const isOverdue = !Number.isFinite(diffMs) || diffMs < 0;
  let text: string;
  if (isOverdue) text = "Past due";
  else if (days >= 1) text = `${plural(days, "day")} to respond`;
  else if (hours >= 1) text = `${plural(hours, "hour")} to respond`;
  else text = `${plural(Math.max(minutes, 0), "minute")} to respond`;
  const tone = days <= 2 ? "danger" : days <= 5 ? "warning" : "muted";
  return { text, days, isOverdue, tone };
}

const RESPOND_BY_DISPLAY = ["ACTION_REQUIRED", "UPLOAD_DOC", "INSUFFICIENT_DOC"];
const RESPOND_BY_CASE = ["CB_INITIATED", "CB_NOTIFIED", "CB_PARTIAL_ACCEPTANCE", "CB_CONTESTED"];

/** The list's Respond by cell shows a deadline only for these rows (columns.tsx:81-181). */
export function showsRespondBy(row: DisputeRecord): boolean {
  return (
    RESPOND_BY_DISPLAY.includes(row.displayStatus) || RESPOND_BY_CASE.includes(row.cbCaseStatus)
  );
}

// ── Amounts ──────────────────────────────────────────────────────────────────

type AmountsByLevel = {
  cbLevel?: CbLevel | null;
  cbAmount?: string | null;
  preArbCompAmount?: string | null;
  preArbCbAmount?: string | null;
  arbCompAmount?: string | null;
  arbCbAmount?: string | null;
};

/** CB_AMOUNT_MAPPER: the amount for the dispute's current level. */
export function levelAmount(record: AmountsByLevel | undefined): string | null | undefined {
  const level = record?.cbLevel || "CHARGEBACK";
  if (level === "PRE_ARBITRATION_COMPLIANCE") return record?.preArbCompAmount;
  if (level === "PRE_ARBITRATION") return record?.preArbCbAmount;
  if (level === "ARBITRATION_COMPLIANCE") return record?.arbCompAmount;
  if (level === "ARBITRATION") return record?.arbCbAmount;
  return record?.cbAmount;
}

/** checkIsAmountUpdated in the list's Amount column. */
export function isAmountUpdated(row: DisputeRecord): boolean {
  if (row.cbLevel === "ARBITRATION")
    return row.arbCbAmount !== row.preArbCbAmount || row.arbCbAmount !== row.cbAmount;
  if (row.cbLevel === "ARBITRATION_COMPLIANCE")
    return row.arbCompAmount !== row.preArbCbAmount || row.arbCompAmount !== row.cbAmount;
  if (row.cbLevel === "PRE_ARBITRATION") return row.preArbCbAmount !== row.cbAmount;
  if (row.cbLevel === "PRE_ARBITRATION_COMPLIANCE") return row.preArbCompAmount !== row.cbAmount;
  return false;
}

/** Each level's amount, for the "Amount Updated" tooltip (getAmountChangedTooltipContent). */
export function amountHistory(row: DisputeRecord): { label: string; value: string }[] {
  return [
    { label: "Dispute amount", value: row.cbAmount },
    { label: "Pre-Compliance (Pre-Arb) amount", value: row.preArbCompAmount },
    { label: "Pre-Arbitration amount", value: row.preArbCbAmount },
    { label: "Pre-Compliance (Arb) amount", value: row.arbCompAmount },
    { label: "Arbitration amount", value: row.arbCbAmount },
  ].filter((item): item is { label: string; value: string } => item.value != null);
}

const toNumber = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function toFee(amount: string | null | undefined, currency: string | null | undefined): Fee | null {
  const n = toNumber(amount);
  return n === null ? null : { amount: n, currency: currency || "INR" };
}

/** sortCBReasonCodes: dotted numeric order (10.4 before 10.10). */
export function sortReasonCodes(codes: string[]): string[] {
  return [...codes].sort((a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
      if (pa[i]! < pb[i]!) return -1;
      if (pa[i]! > pb[i]!) return 1;
    }
    return pa.length - pb.length;
  });
}

// ── Payment method ───────────────────────────────────────────────────────────

/**
 * The fields v2's own payment-method cells (PaymentMethodLogo /
 * TransactionPaymentMethod) read, from pg-dashboard's method codes, so the
 * dispute screens draw a method exactly as the Transactions page does.
 * Only the last four card digits ever reach them.
 */
export function paymentRow(
  method: string | null | undefined,
  brand: string | null | undefined,
  maskedCardNo: string | null | undefined
): PaTransaction {
  const instrument = method ? (PAYMENT_INSTRUMENT_BY_METHOD[method] ?? method) : undefined;
  return {
    paymentInstrument: instrument,
    cardBrand: brand ?? undefined,
    maskedCardNumber: method === "CARD" ? (maskedCardNo ?? undefined) : undefined,
  } as PaTransaction;
}

// ── Details ──────────────────────────────────────────────────────────────────

export function screenStageOf(level: CbLevel | null | undefined): DisputeScreenStage {
  if (level === "ARBITRATION") return "ARBITRATION";
  if (level && PRE_ARB_SCREEN_LEVELS.includes(level)) return "PRE_ARBITRATION";
  return "CHARGEBACK";
}

/** The details response as the drawer and page read it. Null until it has loaded. */
export function toDisputeCase(payload: CbDetailsPayload | undefined): DisputeCase | null {
  const d = payload?.cbDetails;
  if (!d) return null;
  const txn = d.cbCaseInitiateTxnData;
  const meta = d.cbCaseMetaData;
  const fees = meta?.arbFeeData;
  const customer = payload.cbCustomerDetails;
  const level = d.cbLevel || "CHARGEBACK";
  const levelRaw = levelAmount(d) ?? "0";
  return {
    cbId: d.cbId,
    merchantId: d.merchantId,
    txnGid: d.txnGid || txn?.txnGid || "",
    orderId: txn?.orderId || "",
    caseId: d.caseId ?? null,
    level,
    screenStage: screenStageOf(level),
    status: d.cbExternalDrawerViewStatus || "ACTION_REQUIRED",
    displayStatus: payload.displayStatus || "ACTION_REQUIRED",
    currency: d.cbCurrency || "INR",
    amount: toNumber(levelRaw) ?? 0,
    levelAcceptedAmount: toNumber(d.levelAcceptedAmount),
    levelContestedAmount: toNumber(d.levelContestedAmount),
    raw: {
      levelAmount: levelRaw,
      cbAmount: d.cbAmount ?? "0",
      levelContested: d.levelContestedAmount,
      totalContested: d.totalContestedAmount,
    },
    reasonCode: meta?.cbReasonCode ?? "",
    reasonShort: meta?.cbReasonShortDescription || meta?.cbReasonDescription || "Other reason",
    reasonDescription: meta?.cbReasonDescription || OUTSIDE_STANDARD_REASON,
    raisedOn: d.formattedCreationTime,
    dueDate: d.dueDate,
    closedOn: d.cbClosureTime,
    submittedOn: payload.cbSubmitEvidenceFormattedTime,
    representedOn: payload.cbRepresentedFormattedTime,
    penaltyFee: toFee(fees?.penaltyFee, fees?.penaltyFeeCurrency),
    withdrawalFee: toFee(fees?.withdrawalFee, fees?.withdrawalFeeCurrency),
    decidedByPayGlocal: !!d.isDecisionMadeByInternalUser,
    fulfillmentRequired: !!d.fulfillmentDataRequired,
    payment: {
      method: txn?.paymentMethod ?? "",
      brand: txn?.subPaymentMethod || meta?.cardBrand || null,
      maskedCardNo: meta?.maskedCardNo ?? null,
    },
    customer: {
      name: `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim(),
      email: customer?.emailId ?? null,
    },
    transaction: {
      amount: toNumber(txn?.txnAmount),
      currency: txn?.txnCurrency ?? null,
      merchantTxnId: txn?.merchantTxnId ?? null,
      merchantUniqueId: txn?.merchantUniqueId ?? null,
      arn: txn?.arn ?? null,
      rrn: txn?.rrn ?? null,
      date: txn?.merchantTxnDate ?? null,
    },
    docRecommendation: payload.cbDocRecommendation?.docs ?? [],
  };
}

/**
 * The `cbAmount` accept and contest send (AcceptContestDrawer.tsx:581-590):
 * the level's contested amount when it is set and non-zero, else the level
 * amount. A partial accept sends its own accepted amount instead.
 */
export function actionAmount(dispute: DisputeCase): string {
  const contested = dispute.raw.levelContested;
  return contested !== null && contested !== "0" && Number(contested) !== 0
    ? contested
    : dispute.raw.levelAmount;
}

/**
 * Withdrawing at arbitration (CbWithdrawDrawer.tsx:94-104): the total
 * contested amount when set and not "0", else the dispute's first amount.
 * Not the arbitration amount; kept as pg-dashboard sends it.
 */
export function withdrawAmount(dispute: DisputeCase): string {
  const total = dispute.raw.totalContested;
  return total !== null && total !== "0" ? total : dispute.raw.cbAmount;
}

// ── Documents ────────────────────────────────────────────────────────────────

export type CbDocOption = { docType: string; shortDesc: string; desc: string };

/** useCbRequiredDocs: the recommendation when there is one, else the reason code's list. */
export function requiredDocs(
  dispute: DisputeCase,
  staticData: CbStaticData | undefined
): CbDocOption[] {
  if (dispute.docRecommendation.length) {
    return dispute.docRecommendation.map((d) => ({
      docType: d.docType,
      shortDesc: d.shortDesc || d.docType,
      desc: d.desc || "",
    }));
  }
  const keys =
    (dispute.reasonCode ? staticData?.cbDocumentMap?.[dispute.reasonCode] : undefined) ??
    staticData?.cbDocumentMap?.DEFAULT ??
    [];
  return keys.map((key) => ({
    docType: key,
    shortDesc: staticData?.cbDocInfo?.[key]?.shortDesc ?? key,
    desc: staticData?.cbDocInfo?.[key]?.desc ?? "",
  }));
}

/** getUniqueFileName: `proof.pdf` beside an existing one becomes `proof (1).pdf`. */
export function uniqueFileName(fileName: string, existing: string[]): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot !== -1 ? fileName.slice(0, dot) : fileName;
  const ext = dot !== -1 ? fileName.slice(dot) : "";
  let maxIndex = 0;
  let exact = false;
  for (const name of existing) {
    if (!name.endsWith(ext)) continue;
    const existingBase = ext ? name.slice(0, -ext.length) : name;
    if (existingBase === base) {
      exact = true;
      continue;
    }
    if (existingBase.startsWith(`${base} (`) && existingBase.endsWith(")")) {
      const index = Number(existingBase.slice(base.length + 2, -1));
      if (!Number.isNaN(index)) maxIndex = Math.max(maxIndex, index);
    }
  }
  if (!exact && maxIndex === 0) return fileName;
  return `${base} (${maxIndex + 1})${ext}`;
}

// ── Misc ─────────────────────────────────────────────────────────────────────

/** Up to two initials from a username like `ops.demo` or `jane_doe`. */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : parts[0]!.slice(0, 2)).toUpperCase();
}

/** The backend's own message for a failed write, as pg-dashboard shows it, else `fallback`. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const detailed = (error as { errors?: { detailedMessage?: string } } | null)?.errors
    ?.detailedMessage;
  return detailed || fallback;
}

/** computeIsFirstTime: has this user dismissed the first-dispute notice? */
export function readFirstTime(storageKey: string, username: string | undefined): boolean {
  if (!username || typeof window === "undefined") return false;
  try {
    const list = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as {
      user: string;
      isFirstTime: boolean;
    }[];
    const entry = list.find((item) => item.user === username);
    return entry ? entry.isFirstTime !== false : true;
  } catch {
    return true;
  }
}

export function dismissFirstTime(storageKey: string, username: string | undefined): void {
  if (!username) return;
  try {
    const list = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as {
      user: string;
      isFirstTime: boolean;
    }[];
    window.localStorage.setItem(
      storageKey,
      JSON.stringify([
        ...list.filter((item) => item.user !== username),
        { user: username, isFirstTime: false },
      ])
    );
  } catch {
    // Storage unavailable (private mode): the notice simply shows again next time.
  }
}
