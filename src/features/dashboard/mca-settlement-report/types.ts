import type { NonWorkingDayReason } from "@/features/dashboard/mca-settlement-report/calendarUtils";

/**
 * One row of the settlement list.
 *
 * There is no `status` and no UTR. A settlement only appears here once it has
 * happened, so there is no state to distinguish, and the settlement APIs do not
 * carry a UTR at all. `utrNumbers` survives for the CLASSIC view alone, which
 * still reads the old FFMS/PA summary endpoints that do return them.
 *
 * `id` is the settlement DATE. Settlements have no id of their own: an account
 * settles at most once a day. It is not unique on its own across a UCIC-scoped
 * response, so anything keying or routing on a row pairs it with `merchantId`.
 */
export interface SettlementRow {
  id: string;
  amount: number;
  currency: string;
  transactionCount: number;
  /** ISO date string, the settlement date. */
  date: string;
  /** ISO date string, when the underlying payments were captured, T+1's "Day 0".
   *  Derived client-side by walking the holiday calendar back from `date`, not
   *  returned by any endpoint. One settlement can cover several capture days —
   *  a Friday, Saturday and Sunday all settle on the Monday — and this is the
   *  first of them. Read only by the non-working-day explanation. */
  paymentReceivedAt: string;
  /** True when `date` above got pushed out by a weekend or bank holiday rather than landing on a plain T+1. */
  affectedByNonWorkingDay: boolean;
  nonWorkingDayReason?: NonWorkingDayReason;
  /** ISO date string of the specific non-working day being called out, e.g. the holiday itself. */
  nonWorkingDayDate?: string;
  /** Holiday name, only set when nonWorkingDayReason === "holiday". */
  nonWorkingDayName?: string;
  /** Which merchant this settlement belongs to. The other half of the row's
   *  primary key, and what scopes its report download — a UCIC-scoped list
   *  spans merchants. */
  merchantId?: string;
}

export interface SparklinePoint {
  x: string;
  y: number;
}

/**
 * One cross-border remittance inside a settlement.
 *
 * `status` is the RAW uppercase value the API returns, rendered through
 * mca-transactions' `getStatusMeta` so the badge is identical to the one on the
 * transactions table and the two can never drift. In practice only SETTLED and
 * FIRC_SETTLED appear here: a transaction is not bundled into a settlement
 * until it has cleared invoice review.
 */
export interface McaSettlementPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  /** ISO date string */
  createdOn: string;
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  countryName: string;
  remitterName: string;
}

export interface SettlementDetail {
  settlement: SettlementRow;
  /** The account this settlement landed in — see SettlementAccount below. */
  account: SettlementAccount;
  grossAmount: number;
  gst: number;
  /** The fee actually charged, already net of the two discounts below. */
  platformFee: number;
  /** Negotiated rate discount on the fee, 0 when none applied. */
  discountAmount: number;
  /** Promotional offer discount on the fee, 0 when none applied. */
  offerDiscountAmount: number;
  payments: McaSettlementPayment[];
}

export interface FfmsSettlementDownloadResponse {
  data: {
    presignedUrl: string;
  };
  message?: string;
}

// ── Bank holiday calendar (real contract, from pg-dashboard) ─────────────────
// pg-dashboard/src/features/BankHolidayCalendar/types.ts. This one IS backed by
// a live endpoint, unlike the summary and detail shapes above.

/** One holiday. `currency` is the settlement rail it closes, not the country's
 *  own currency in general: production filters on it and defaults to INR (BASE
 *  in its constants.ts), which is the only rail INR settlements care about. */
export interface CalendarHoliday {
  date: string;
  name: string;
  currency: string;
  countryCode: string;
}

/** Bucketed by country code, so the same holiday can appear under several
 *  countries when they share a currency. Callers flatten and dedupe by date. */
export interface HolidayCalendarResponse {
  data: {
    holidays: Record<string, CalendarHoliday[]>;
  };
  message?: string;
}

/**
 * The one thing the settlement screens render that neither endpoint returns.
 *
 * Not a backend gap: the capture window is derived client-side by walking the
 * holiday calendar back from the settlement date, which is also how the
 * non-working-day metadata is worked out. It stays a separate argument to the
 * mappers so the derivation has one home rather than being inlined at each
 * call site.
 */
export interface SettlementSupplement {
  /** First capture day. `captureWindow` is the full range it stands in for —
   *  a weekend or holiday rolls several capture days into one settlement. */
  paymentReceivedAt: string;
  captureWindow: string[];
}

// ── Settlement list (new contract) ─────────────────────────────────
// GET /gcc/v3/analytics/{merchantId}/merchant/settlement-list
//        ?startDate=&endDate=&page=&limit=      (startDate/endDate optional)
//
// Replaces the PA `views` and FFMS `summary` shapes above. There is no
// settlement id: an account settles at most once a day, so the primary key is
// (merchantId, settlementDate). `merchantId` is per row because the list is
// fetched at UCIC scope for a multi-MID account and its rows span merchants —
// which is also why settlementDate ALONE is not unique in a response.

/**
 * Every field is typed as the live endpoint actually answers, not as the agreed
 * contract reads: UAT returns `settlementDate: null` on some rows, and the
 * numerics follow the same house style as the older settlement endpoints, which
 * send amounts as nullable strings. The mapper coerces rather than trusting any
 * of it — see mapSettlementListItemToRow.
 */
export interface SettlementListItem {
  merchantId?: string | null;
  amount?: number | string | null;
  transactionCount?: number | string | null;
  /** YYYY-MM-DD. Half of this row's primary key, the other half is merchantId.
   *  A row without one cannot be keyed, routed to, or downloaded, so the list
   *  hook drops it rather than rendering a broken row. */
  settlementDate?: string | null;
}

export interface SettlementListResponse {
  data: {
    settlements: SettlementListItem[];
    /** Rows matching the filter across all pages, for server-side pagination. */
    totalCount: number;
  };
  message?: string;
  errors?: unknown;
}

// ── Settlement detail (new contract) ───────────────────────────────
// GET /gcc/v3/analytics/{merchantId}/merchant/settlement-detail?settlementDate=

/**
 * Per-payment state, as the raw uppercase value the API returns. Rendered
 * through mca-transactions' MCA_STATUS_META rather than remapped here, so a
 * payment inside a settlement badges exactly as the same payment does on the
 * transactions table: SETTLED is "Settled", FIRC_SETTLED is "FIRC Settled",
 * both green with a check.
 *
 * Typed loosely on purpose. Only these two can appear inside a settlement, but
 * the shared badge map covers the full transaction status set and falls back
 * gracefully, so a new value from the server degrades rather than crashes.
 */
export type SettlementDetailPaymentStatus = "SETTLED" | "FIRC_SETTLED" | (string & {});

export interface SettlementDetailPayment {
  gid: string;
  amount: number;
  currency: string;
  /** ISO 8601 (UTC). */
  createdTime: string;
  /** Amounts are in the remittance's own currency; the settlement itself is
   *  always INR, which is a contract decision rather than a returned field. */
  /** ISO 3166-1 alpha-2. The display name is resolved client-side from COUNTRIES. */
  country: string;
  remitterName: string;
  status: SettlementDetailPaymentStatus;
}

/**
 * The account this settlement landed in, as the detail endpoint will return it.
 *
 * Confirmed as coming, shape proposed here. `bankName` matters: the profile
 * endpoint this row was briefly read from (GET /merchants/profile/{onbId}/
 * settlement) returns an IFSC and a masked number but no name, and the row
 * reads badly as a bare number. It also belongs on the settlement rather than
 * the profile because a multi-MID account can settle to more than one bank, and
 * a profile-level read cannot say which one a given settlement used.
 */
export interface SettlementAccount {
  bankName: string;
  /** Masked, e.g. "****9081". Never the full number on this endpoint. */
  maskedAccountNumber: string;
  ifscCode?: string;
}

export interface SettlementDetailData {
  transactionCount: number;
  settlementAccount: SettlementAccount;
  grossAmount: number;
  /** GST charged on the platform fee. */
  gstDeduction: number;
  /**
   * Platform fee actually CHARGED: GST excluded, and already net of the two
   * discounts below. The identity the Amount Breakdown card renders is
   * `netAmount === grossAmount - gstDeduction - deductionAmount`; it holds
   * exactly for the sample payload and the card shows all four, so a backend
   * that folds GST into this field would make the card visibly disagree.
   */
  deductionAmount: number;
  netAmount: number;
  /**
   * PayGlocal's own discounts on the platform fee: a negotiated rate discount
   * and a promotional offer. Both are ALREADY absorbed into `deductionAmount`,
   * so neither participates in the net identity above — the fee before either
   * was applied is `deductionAmount + discountAmount + offerDiscountAmount`,
   * and GST is charged on the post-discount fee (32.51 is 31.67% of 102.66,
   * not of 122.66).
   *
   * The Amount Breakdown card shows them as a nested explanation under the fee
   * line rather than as deductions of their own, precisely so the column the
   * merchant reads downward still foots. Zero when no discount applied, in
   * which case the nested block is not rendered at all.
   */
  discountAmount: number;
  offerDiscountAmount: number;
  /** The full list. Not paginated, by decision: a settlement's payment list is
   *  returned inline however long it is. */
  payments: SettlementDetailPayment[];
}

export interface SettlementDetailResponse {
  data: SettlementDetailData;
  message?: string;
  errors?: unknown;
}

// ── Settlement overview analytics ────────────────────────────────────────────
// Backs the Total settled card. Per-timeframe (week | month | ytd).

export interface SettlementOverviewSeriesPoint {
  label: string;
  periodStart: string;
  value: number;
  count: number;
}

export interface SettlementOverviewPreviousSettlement {
  settlementDate: string;
  amount: number;
  transactionCount: number;
}

export interface SettlementOverviewData {
  timeframe: string;
  currency: string;
  totalSettled: number;
  previousTotalSettled: number;
  totalSettledTrendPct: number;
  comparisonLabel: string;
  transactionCount: number;
  series: SettlementOverviewSeriesPoint[];
  previousSettlement: SettlementOverviewPreviousSettlement | null;
}

export interface SettlementOverviewResponse {
  data: SettlementOverviewData;
  message?: string;
  errors?: unknown;
}

// ── Upcoming settlement ──────────────────────────────────────────────────────

export interface SettlementUpcomingData {
  amount: number;
  currency: string;
  transactionCount: number;
  pendingInvoiceCount: number;
  pendingInvoiceAmount: number;
}

export interface SettlementUpcomingResponse {
  data: SettlementUpcomingData;
  message?: string;
  errors?: unknown;
}
