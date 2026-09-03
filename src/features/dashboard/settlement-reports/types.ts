import type { NonWorkingDayReason } from "@/features/dashboard/settlement-reports/calendarUtils";

/**
 * Payments (PA) settlements move through "processing" -> "settled" (funds
 * have arrived, UTR issued). Multi-Currency Accounts (PACB) settlements have
 * an extra step because of the forex conversion: money is first
 * "sent_for_settlement" (conversion in progress), then "mca_settled"
 * (converted and sent to the bank in INR, UTR not issued yet), and only
 * reaches its terminal state at "firc" (funds have reached the merchant's
 * account, UTR issued), see isSettlementComplete() in columns.tsx for the
 * per-product "is this actually done" check. There is no "failed" state,
 * every settlement in this mock dataset eventually completes.
 */
export type SettlementStatus =
  "settled" | "processing" | "sent_for_settlement" | "mca_settled" | "firc";

export type BankTransferStatus = "pending" | "completed";

/**
 * Explicit settlement state, deliberately not collapsed into `status` alone.
 * A report can exist mid-processing, a UTR can't, and a bank transfer can be
 * pending even once a report is ready, these need to vary independently so
 * the UI never has to infer "why" from a single enum (see the settlement
 * detail page and table's UTR column for where this pays off).
 */
export interface SettlementRow {
  id: string;
  amount: number;
  currency: string;
  status: SettlementStatus;
  bankAccount: string;
  transactionCount: number;
  /** Assigned by the bank once the transfer is actually processed, unset until then. */
  utrNumber?: string;
  /** ISO date string, the settlement's actual (settled) or expected (processing) date. */
  date: string;
  /** ISO date string, when the underlying payments were captured, T+1's "Day 0". */
  paymentReceivedAt: string;
  /** A breakdown/report can be generated while still processing, independent of the transfer's own progress. */
  reportAvailable: boolean;
  bankTransferStatus: BankTransferStatus;
  /** True when `date` above got pushed out by a weekend or bank holiday rather than landing on a plain T+1. */
  affectedByNonWorkingDay: boolean;
  nonWorkingDayReason?: NonWorkingDayReason;
  /** ISO date string of the specific non-working day being called out, e.g. the holiday itself. */
  nonWorkingDayDate?: string;
  /** Holiday name, only set when nonWorkingDayReason === "holiday". */
  nonWorkingDayName?: string;
  /** Which merchant this settlement belongs to, used to scope its report
   *  download. Optional because the summary endpoint does not return it yet —
   *  see FfmsSettlementSummaryRow.merchantId. */
  merchantId?: string;
}

export interface SparklinePoint {
  x: string;
  y: number;
}

export interface SettlementPayment {
  id: string;
  /** ISO date string */
  createdOn: string;
  paymentMethod: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  /** Set when this payment was previously flagged and placed on hold, then
   * cleared and included in this settlement once the review resolved. */
  releasedFromHold?: {
    reason: string;
  };
}

/**
 * Per-payment review state for an individual cross-border remittance,
 * distinct from the settlement-level SettlementStatus above:
 * "invoice_pending" (the merchant needs to upload an invoice for this
 * transaction) -> "under_review" (invoice submitted, PayGlocal is reviewing
 * it) -> "processing" (cleared review, currency conversion done, sent to the
 * bank) -> "settled" (its FIRC has been generated).
 *
 * A transaction only gets bundled into a settlement, and therefore only
 * appears in that settlement's payment list, once it has cleared review, so
 * "invoice_pending"/"under_review" transactions never appear inside an
 * existing settlement's payment table, they're not part of a settlement yet.
 * They're surfaced separately, on the "Upcoming settlement" card's Upload
 * Invoice CTA, see mcaSettlementSummary.pendingInvoiceCount in mock-data.ts.
 */
export type McaPaymentStatus = "invoice_pending" | "under_review" | "processing" | "settled";

export interface McaSettlementPayment {
  id: string;
  amount: number;
  currency: string;
  status: McaPaymentStatus;
  /** ISO date string */
  createdOn: string;
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  countryName: string;
  remitterName: string;
}

export interface HeldTransaction {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  holdReason: string;
  /** Short label for the table's "Action Required" column, e.g. "Wait". */
  actionShortLabel: string;
}

export interface HeldFundsSummary {
  transactions: HeldTransaction[];
  /** One-line reason shown on the card, e.g. "Documents are required before these funds can be released." */
  reasonSummary: string;
}

export interface SettlementDetail {
  settlement: SettlementRow;
  grossAmount: number;
  gst: number;
  platformFee: number;
  /** ISO date string */
  initiatedAt: string;
  /** ISO date string */
  processingAt: string;
  /** ISO date string, only set when the settlement has held transactions to review */
  complianceReviewAt: string | null;
  /** ISO date string, null while still processing */
  depositedAt: string | null;
  /** ISO date string, SLA deadline for this settlement's deposit, same day as depositedAt when settled on schedule */
  expectedAt: string;
  payments: SettlementPayment[];
  /** Only present for MCA (PACB) settlements, see McaSettlementPayment. */
  mcaPayments?: McaSettlementPayment[];
  /** Only present when one or more transactions in this settlement are on hold. */
  heldFunds: HeldFundsSummary | null;
}

// ── Real API contracts (ported verbatim from pg-dashboard reports/types.ts) ──
// These are the ONLY settlement shapes the backend actually returns. Both the
// PA and FFMS summaries are intentionally thin: a settlement date, an amount,
// a transaction count and the UTR(s). Everything richer on SettlementRow above
// (bankAccount, bankTransferStatus, non-working-day info, the summary StatCards
// and the per-settlement SettlementDetail) has NO backing endpoint yet and is
// flagged // BACKEND GAP where it is consumed.

/** PA (Payments) settlement summary row. Amount/count are strings, nullable. */
export interface PaSettlementView {
  settlementDate: string | null;
  settlementAmount: string | null;
  numberOfTransactions: string | null;
  utrNumbers: string[];
}

export interface PaSettlementResponse {
  data: {
    views: PaSettlementView[];
  };
}

/** FFMS (PACB) settlement summary row. Note: `totalSettlementAmount`, not `settlementAmount`. */
export interface FfmsSettlementSummaryRow {
  settlementDate: string | null;
  totalSettlementAmount: string | null;
  numberOfTransactions: string | null;
  utrNumbers: string[];
  /**
   * BACKEND GAP: not returned today. The summary is called at UCIC scope for a
   * multi-MID account with no MID selected, so its rows can span merchants and
   * each row has to name its own before that row's report can be downloaded.
   * Until it arrives the download falls back to the scope the summary was
   * fetched at, which is correct only for a single-merchant response.
   */
  merchantId?: string | null;
}

export interface FfmsSettlementResponse {
  data: {
    summary: FfmsSettlementSummaryRow[];
  };
}

export interface PaSettlementDownloadResponse {
  data: {
    downloadUrl: string;
  };
  message?: string;
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
