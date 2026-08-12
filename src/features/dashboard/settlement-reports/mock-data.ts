import {
  computeNextSettlement,
  computeSettlementSchedule,
  isHolidayWithinDays,
  type HolidayInfo,
} from "@/features/dashboard/settlement-reports/calendarUtils";
import { isSettlementComplete } from "@/features/dashboard/settlement-reports/columns";
import type {
  HeldFundsSummary,
  McaSettlementPayment,
  SettlementDetail,
  SettlementPayment,
  SettlementRow,
  SettlementStatus,
  SparklinePoint,
} from "@/features/dashboard/settlement-reports/types";

// TODO(integration): replace every export in this file with data from the
// real settlement endpoints (see pg-dashboard/src/features/settlement-report
// for the exact contract) once engineering wires this screen up. All bank
// account numbers and settlement/UTR identifiers below are fake demo values.

/** Fixed "today" reference for the settlement calendar and the "Upcoming
 * settlement" card below. Not real-time; this is a mock-only screen (see
 * TODO(integration) above). */
export const SETTLEMENT_CALENDAR_TODAY = "2026-03-12";

export const bankHolidays: HolidayInfo[] = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-13", name: "Bank Holiday" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-12-25", name: "Christmas" },
];

export const nextSettlementInfo = computeNextSettlement(SETTLEMENT_CALENDAR_TODAY, bankHolidays);
export const hasUpcomingHoliday = isHolidayWithinDays(SETTLEMENT_CALENDAR_TODAY, bankHolidays, 7);

// Today's captured payments haven't formed their own settlement batch yet,
// so this is computed straight from "today" rather than read off a row, T+1
// from 2026-03-12 lands on the 2026-03-13 bank holiday (see bankHolidays
// above), which is exactly what pushes it to Monday below, not a hardcoded
// date.
const upcomingSettlementSchedule = computeSettlementSchedule(SETTLEMENT_CALENDAR_TODAY, bankHolidays);

export const settlementSummary = {
  totalSettled: 507000,
  totalSettledTrendPct: 12.3,
  // amount === grossAmount - tax - fee. Mirrors stl_e5f6g7h8 in
  // settlementRows below (same amount, date, and transaction count).
  previousSettled: {
    amount: 98420,
    dateLabel: "11 Mar 26",
    timeLabel: "11:59 PM",
    transactionCount: 36,
    utrNumber: "UTR2603110002",
    grossAmount: 100000,
    tax: 380,
    fee: 1200,
  },
  upcomingSettlement: {
    amount: 124890.5,
    expectedDate: upcomingSettlementSchedule.settlementDate,
    affectedByNonWorkingDay: upcomingSettlementSchedule.affectedByNonWorkingDay,
    nonWorkingDayDate: upcomingSettlementSchedule.nonWorkingDayDate,
    nonWorkingDayReason: upcomingSettlementSchedule.nonWorkingDayReason,
    nonWorkingDayName: upcomingSettlementSchedule.nonWorkingDayName,
  },
  bankAccount: "HDFC ****4521",
  cycle: { value: "T+1", frequency: "Daily" },
  bankAccountStatus: "Active",
};

// Same shape as settlementSummary above, scoped to the Multi-Currency
// Accounts product (PACB) instead of Payments (PA), see useProductContext.ts.
// Mirrors mca_x9y0z1a2 / mca_p1q2r3s4 in mcaSettlementRows below (same
// amounts, date and transaction count), same T+1 calendar as Payments, MCA
// settlements just move through a different bank account.
export const mcaSettlementSummary = {
  totalSettled: 164800,
  totalSettledTrendPct: 9.4,
  previousSettled: {
    amount: 32450,
    dateLabel: "11 Mar 26",
    timeLabel: "11:59 PM",
    transactionCount: 41,
    utrNumber: "UTRMCA2603110007",
    grossAmount: 33075,
    tax: 125,
    fee: 500,
  },
  upcomingSettlement: {
    amount: 8420,
    expectedDate: upcomingSettlementSchedule.settlementDate,
    affectedByNonWorkingDay: upcomingSettlementSchedule.affectedByNonWorkingDay,
    nonWorkingDayDate: upcomingSettlementSchedule.nonWorkingDayDate,
    nonWorkingDayReason: upcomingSettlementSchedule.nonWorkingDayReason,
    nonWorkingDayName: upcomingSettlementSchedule.nonWorkingDayName,
  },
  // Transactions still sitting at "invoice_pending" (see McaPaymentStatus in
  // types.ts), not yet bundled into any settlement, they're what the
  // "Upcoming settlement" card's Upload Invoice CTA counts.
  pendingInvoiceCount: 5,
  bankAccount: "Citibank N.A. ****9081",
  cycle: { value: "T+1", frequency: "Daily" },
  bankAccountStatus: "Active",
};

export type TotalSettledTimeframe = "week" | "month" | "ytd";

export const totalSettledTimeframes: { value: TotalSettledTimeframe; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "ytd", label: "Year to date" },
];

/** Chart behind the "Total settled" metric card, one series per timeframe tab. */
export const totalSettledChartsByTimeframe: Record<TotalSettledTimeframe, SparklinePoint[]> = {
  week: [
    { x: "Mon", y: 62000 },
    { x: "Tue", y: 58000 },
    { x: "Wed", y: 71000 },
    { x: "Thu", y: 69500 },
    { x: "Fri", y: 84000 },
    { x: "Sat", y: 91000 },
    { x: "Sun", y: 98420 },
  ],
  month: [
    { x: "Week 1", y: 152000 },
    { x: "Week 2", y: 178000 },
    { x: "Week 3", y: 165000 },
    { x: "Week 4", y: 98420 },
  ],
  ytd: [
    { x: "Jan", y: 210000 },
    { x: "Feb", y: 195000 },
    { x: "Mar", y: 235000 },
    { x: "Apr", y: 215000 },
    { x: "May", y: 260000 },
    { x: "Jun", y: 285000 },
    { x: "Jul", y: 507000 },
  ],
};

/** Same chart, scoped to the MCA product, see mcaSettlementSummary above. */
export const mcaTotalSettledChartsByTimeframe: Record<TotalSettledTimeframe, SparklinePoint[]> = {
  week: [
    { x: "Mon", y: 18500 },
    { x: "Tue", y: 21200 },
    { x: "Wed", y: 19800 },
    { x: "Thu", y: 24600 },
    { x: "Fri", y: 27300 },
    { x: "Sat", y: 29100 },
    { x: "Sun", y: 32450 },
  ],
  month: [
    { x: "Week 1", y: 48000 },
    { x: "Week 2", y: 55500 },
    { x: "Week 3", y: 51200 },
    { x: "Week 4", y: 32450 },
  ],
  ytd: [
    { x: "Jan", y: 68000 },
    { x: "Feb", y: 61500 },
    { x: "Mar", y: 74000 },
    { x: "Apr", y: 69500 },
    { x: "May", y: 82000 },
    { x: "Jun", y: 95500 },
    { x: "Jul", y: 164800 },
  ],
};

interface SettlementSeed {
  id: string;
  amount: number;
  transactionCount: number;
  /** YYYY-MM-DD, when the underlying payments were captured (T+1's "Day 0"). */
  paymentReceivedDateKey: string;
  status: SettlementStatus;
  /** Required once a settlement reaches its terminal state, see isSettlementComplete(). */
  utrNumber?: string;
}

/**
 * Builds a full SettlementRow from a minimal seed, deriving the settlement
 * date and non-working-day metadata via computeSettlementSchedule() rather
 * than hardcoding both the payment and settlement dates separately, that's
 * what keeps every scenario below internally consistent with the real T+1 +
 * weekend/holiday rules instead of two dates that could silently drift apart.
 */
function buildSettlementRow(seed: SettlementSeed, bankAccount = "HDFC ****4521"): SettlementRow {
  const schedule = computeSettlementSchedule(seed.paymentReceivedDateKey, bankHolidays);
  const isComplete = isSettlementComplete(seed.status);

  return {
    id: seed.id,
    amount: seed.amount,
    currency: "INR",
    status: seed.status,
    bankAccount,
    transactionCount: seed.transactionCount,
    utrNumber: isComplete ? seed.utrNumber : undefined,
    date: `${schedule.settlementDate}T00:00:00+05:30`,
    paymentReceivedAt: `${seed.paymentReceivedDateKey}T00:00:00+05:30`,
    // Every scenario here has a report ready, a breakdown can be generated
    // mid-processing since it only depends on the underlying payments, not
    // on the bank transfer's own progress.
    reportAvailable: true,
    bankTransferStatus: isComplete ? "completed" : "pending",
    affectedByNonWorkingDay: schedule.affectedByNonWorkingDay,
    nonWorkingDayReason: schedule.nonWorkingDayReason ?? undefined,
    nonWorkingDayDate: schedule.nonWorkingDayDate ?? undefined,
    nonWorkingDayName: schedule.nonWorkingDayName ?? undefined,
  };
}

// Test scenarios (see the settlement workflow spec this file backs):
// A: stl_n0p1q2r3, normal processing, no non-working day involved.
// B/F: stl_e5f6g7h8, normal settled, UTR available.
// C: stl_s4t5u6v7, weekend-affected, now settled (its schedule still shows
//    the Sunday it skipped, this proves the non-working-day math even for a
//    completed cycle, see the timeline dialog).
// D: stl_a1b2c3d4, "today"'s payments walking straight into the 2026-03-13
//    bank holiday, still processing, this is also what powers the "Upcoming
//    settlement" card above.
// E: bank-transfer-pending is just an attribute of any processing row here
//    (A and D both show it), not a separate scenario.
// G: stl_m3n4o5p6, settled, oldest cycle in this dataset (there is no
//    "failed" settlement state, every settlement here eventually completes).
export const settlementRows: SettlementRow[] = [
  buildSettlementRow({
    id: "stl_a1b2c3d4",
    amount: 124890.5,
    transactionCount: 48,
    paymentReceivedDateKey: "2026-03-12",
    status: "processing",
  }),
  buildSettlementRow({
    id: "stl_n0p1q2r3",
    amount: 56340,
    transactionCount: 22,
    paymentReceivedDateKey: "2026-03-11",
    status: "processing",
  }),
  buildSettlementRow({
    id: "stl_e5f6g7h8",
    amount: 98420,
    transactionCount: 36,
    paymentReceivedDateKey: "2026-03-10",
    status: "settled",
    utrNumber: "UTR2603110002",
  }),
  buildSettlementRow({
    id: "stl_i9j0k1l2",
    amount: 142650.75,
    transactionCount: 62,
    paymentReceivedDateKey: "2026-03-09",
    status: "settled",
    utrNumber: "UTR2603100003",
  }),
  buildSettlementRow({
    id: "stl_m3n4o5p6",
    amount: 76200,
    transactionCount: 29,
    paymentReceivedDateKey: "2026-03-08",
    status: "settled",
    utrNumber: "UTR2603090008",
  }),
  buildSettlementRow({
    id: "stl_s4t5u6v7",
    amount: 43210.75,
    transactionCount: 17,
    paymentReceivedDateKey: "2026-03-07",
    status: "settled",
    utrNumber: "UTR2603090006",
  }),
  buildSettlementRow({
    id: "stl_q7r8s9t0",
    amount: 189340.25,
    transactionCount: 74,
    paymentReceivedDateKey: "2026-03-05",
    status: "settled",
    utrNumber: "UTR2603060005",
  }),
];

const MCA_BANK_ACCOUNT = "Citibank N.A. ****9081";

// Same shape and same T+1 calendar as settlementRows above, scoped to the
// Multi-Currency Accounts product, mock-only per the TODO(integration) at
// the top of this file. previousSettled/upcomingSettlement in
// mcaSettlementSummary mirror mca_x9y0z1a2 and mca_p1q2r3s4 below.
//
// MCA moves through an extra step Payments doesn't have, forex conversion,
// so its statuses are "sent_for_settlement" (conversion in progress) ->
// "mca_settled" (converted, sent to the bank in INR, no UTR yet) -> "firc"
// (funds have reached the merchant, UTR issued), see the SettlementStatus
// doc comment in types.ts.
export const mcaSettlementRows: SettlementRow[] = [
  buildSettlementRow(
    {
      id: "mca_p1q2r3s4",
      amount: 8420,
      transactionCount: 12,
      paymentReceivedDateKey: "2026-03-12",
      status: "sent_for_settlement",
    },
    MCA_BANK_ACCOUNT
  ),
  buildSettlementRow(
    {
      id: "mca_t5u6v7w8",
      amount: 15600,
      transactionCount: 21,
      paymentReceivedDateKey: "2026-03-11",
      status: "mca_settled",
    },
    MCA_BANK_ACCOUNT
  ),
  buildSettlementRow(
    {
      id: "mca_x9y0z1a2",
      amount: 32450,
      transactionCount: 41,
      paymentReceivedDateKey: "2026-03-10",
      status: "firc",
      utrNumber: "UTRMCA2603110007",
    },
    MCA_BANK_ACCOUNT
  ),
  buildSettlementRow(
    {
      id: "mca_b3c4d5e6",
      amount: 51200.5,
      transactionCount: 58,
      paymentReceivedDateKey: "2026-03-09",
      status: "firc",
      utrNumber: "UTRMCA2603100008",
    },
    MCA_BANK_ACCOUNT
  ),
  buildSettlementRow(
    {
      id: "mca_f7g8h9i0",
      amount: 12300,
      transactionCount: 9,
      paymentReceivedDateKey: "2026-03-08",
      status: "firc",
      utrNumber: "UTRMCA2603090009",
    },
    MCA_BANK_ACCOUNT
  ),
];

// Ratios back-derived from the one settlement whose breakdown is already
// shown elsewhere (the "Settlement breakup" tooltip on the list page, for
// stl_e5f6g7h8: gross 100000, GST 380, platform fee 1200, net 98420), reused
// exactly for that row below, and applied proportionally to the rest so every
// settlement's numbers stay internally consistent across the app.
const PLATFORM_FEE_RATE_OF_NET = 1200 / 98420;
const GST_RATE_OF_FEE = 380 / 1200;

function deriveAmountBreakdown(netAmount: number): { grossAmount: number; gst: number; platformFee: number } {
  const platformFee = Math.round(netAmount * PLATFORM_FEE_RATE_OF_NET * 100) / 100;
  const gst = Math.round(platformFee * GST_RATE_OF_FEE * 100) / 100;
  const grossAmount = Math.round((netAmount + gst + platformFee) * 100) / 100;
  return { grossAmount, gst, platformFee };
}

const PAYMENT_METHOD_CYCLE = ["UPI", "Card", "Net Banking"];

/** stl_e5f6g7h8's first 3 payments were previously flagged and held, then
 * cleared in time to be included in this settlement, see the "Released from
 * hold" chip on the detail page's Payments table. */
const RELEASED_HOLD_SETTLEMENT_ID = "stl_e5f6g7h8";
const RELEASED_HOLD_REASONS = ["Compliance Review", "Business Verification Pending", "High Risk Transaction"];

/** `11:35` + `offsetMinutes` → `"HH:MM:00"`, wrapping past midnight. Plain
 * arithmetic (no Date object) so every settlement's payment list stays
 * deterministic across server and client renders. */
function timeAtOffset(baseHour: number, baseMinute: number, offsetMinutes: number): string {
  const totalMinutes = baseHour * 60 + baseMinute + offsetMinutes;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

/** Splits a settlement's totals across `transactionCount` individual payment
 * rows so the Payments table always matches the Amount Breakdown card, the
 * per-row amounts sum back exactly to gross/deductions/net. */
function buildPayments(
  settlement: SettlementRow,
  grossAmount: number,
  gst: number,
  platformFee: number,
  dateOnly: string
): SettlementPayment[] {
  const count = settlement.transactionCount;
  const totalDeductions = Math.round((gst + platformFee) * 100) / 100;
  const baseGross = Math.round((grossAmount / count) * 100) / 100;
  const baseDeductions = Math.round((totalDeductions / count) * 100) / 100;
  const baseNet = Math.round((settlement.amount / count) * 100) / 100;

  let grossRemaining = grossAmount;
  let deductionsRemaining = totalDeductions;
  let netRemaining = settlement.amount;

  return Array.from({ length: count }, (_, i) => {
    const isLast = i === count - 1;
    const rowGross = isLast ? Math.round(grossRemaining * 100) / 100 : baseGross;
    const rowDeductions = isLast ? Math.round(deductionsRemaining * 100) / 100 : baseDeductions;
    const rowNet = isLast ? Math.round(netRemaining * 100) / 100 : baseNet;
    grossRemaining -= rowGross;
    deductionsRemaining -= rowDeductions;
    netRemaining -= rowNet;

    const releasedFromHold =
      settlement.id === RELEASED_HOLD_SETTLEMENT_ID && i < RELEASED_HOLD_REASONS.length
        ? { reason: RELEASED_HOLD_REASONS[i]! }
        : undefined;

    return {
      id: `pay_${settlement.id.replace("stl_", "")}_${String(i + 1).padStart(2, "0")}`,
      createdOn: `${dateOnly}T${timeAtOffset(11, 35, i * 7)}+05:30`,
      paymentMethod: PAYMENT_METHOD_CYCLE[i % PAYMENT_METHOD_CYCLE.length],
      grossAmount: rowGross,
      deductions: rowDeductions,
      netAmount: rowNet,
      releasedFromHold,
    };
  });
}

// Each cross-border remittance clears its own invoice/compliance review
// before it can be bundled into an MCA settlement, so unlike buildPayments
// above (which always sums back to the settlement's own gross/net), these
// don't need to reconcile to the settlement total, see McaSettlementPayment.
const MCA_REMITTERS: { name: string; countryCode: string; countryName: string; currency: string; amount: number }[] = [
  { name: "frm2", countryCode: "CA", countryName: "Canada", currency: "CAD", amount: 0.5 },
  { name: "frm", countryCode: "US", countryName: "United States", currency: "USD", amount: 1 },
  { name: "puneethv", countryCode: "CA", countryName: "Canada", currency: "CAD", amount: 20 },
  { name: "puneethv", countryCode: "US", countryName: "United States", currency: "USD", amount: 20 },
  { name: "apple", countryCode: "US", countryName: "United States", currency: "USD", amount: 10000 },
  { name: "test", countryCode: "US", countryName: "United States", currency: "USD", amount: 10 },
  { name: "EEFC", countryCode: "US", countryName: "United States", currency: "USD", amount: 50 },
  { name: "puneethv", countryCode: "US", countryName: "United States", currency: "USD", amount: 12 },
  { name: "puneethv", countryCode: "US", countryName: "United States", currency: "USD", amount: 11 },
  { name: "test", countryCode: "CA", countryName: "Canada", currency: "CAD", amount: 11 },
  { name: "test", countryCode: "CA", countryName: "Canada", currency: "CAD", amount: 150 },
];
/**
 * A transaction only becomes part of a settlement, and therefore only shows
 * up in that settlement's payment list, once it has already cleared invoice
 * upload and PayGlocal's review (see McaPaymentStatus in types.ts), so every
 * payment inside an existing settlement is either still "processing"
 * (currency converted, sent to the bank) or "settled" (its own FIRC has been
 * generated), never "invoice_pending"/"under_review", those only exist for
 * transactions waiting to be picked up into the next settlement, counted by
 * mcaSettlementSummary.pendingInvoiceCount instead.
 */
function buildMcaPayments(settlement: SettlementRow, dateOnly: string): McaSettlementPayment[] {
  const status: McaSettlementPayment["status"] = isSettlementComplete(settlement.status) ? "settled" : "processing";

  return Array.from({ length: settlement.transactionCount }, (_, i) => {
    const remitter = MCA_REMITTERS[i % MCA_REMITTERS.length]!;
    return {
      id: `pay_${settlement.id}_${String(i + 1).padStart(2, "0")}`,
      amount: remitter.amount,
      currency: remitter.currency,
      status,
      createdOn: `${dateOnly}T${timeAtOffset(9, 35, i * 7)}+05:30`,
      countryCode: remitter.countryCode,
      countryName: remitter.countryName,
      remitterName: remitter.name,
    };
  });
}

/** Only the in-progress settlement carries held transactions in this mock
 * dataset, a settled settlement wouldn't still have funds on hold. */
const HELD_FUNDS_SETTLEMENT_ID = "stl_a1b2c3d4";

function buildHeldFunds(): HeldFundsSummary {
  return {
    transactions: [
      {
        id: "pay_7f3a91h4",
        amount: 2640.5,
        currency: "INR",
        paymentMethod: "Card",
        holdReason: "Compliance Review",
        actionShortLabel: "Wait",
      },
      {
        id: "pay_5c8e12j9",
        amount: 3800,
        currency: "INR",
        paymentMethod: "UPI",
        holdReason: "Business Verification Pending",
        actionShortLabel: "Upload Documents",
      },
      {
        id: "pay_9d2b47k3",
        amount: 6400,
        currency: "INR",
        paymentMethod: "Net Banking",
        holdReason: "High Risk Transaction",
        actionShortLabel: "Manual Review",
      },
    ],
    reasonSummary: "Documents are required before these funds can be released.",
  };
}

function buildSettlementDetail(settlement: SettlementRow): SettlementDetail {
  const isKnownBreakdown = settlement.id === "stl_e5f6g7h8";
  const { grossAmount, gst, platformFee } = isKnownBreakdown
    ? { grossAmount: 100000, gst: 380, platformFee: 1200 }
    : deriveAmountBreakdown(settlement.amount);

  // Payments are captured on Day 0 (paymentReceivedAt), the transfer itself
  // only moves on Day 1 (settlement.date), keeping these separate is what
  // lets "Initiated on" and "Expected settlement" read as two different days.
  const paymentDateOnly = settlement.paymentReceivedAt.slice(0, 10);
  const settlementDateOnly = settlement.date.slice(0, 10);
  const initiatedAt = `${paymentDateOnly}T11:35:00+05:30`;
  const processingAt = `${settlementDateOnly}T${timeAtOffset(9, 0, 0)}+05:30`;
  const expectedAt = `${settlementDateOnly}T23:59:00+05:30`;
  const depositedAt = isSettlementComplete(settlement.status) ? expectedAt : null;

  const heldFunds = settlement.id === HELD_FUNDS_SETTLEMENT_ID ? buildHeldFunds() : null;
  const complianceReviewAt = heldFunds ? `${settlementDateOnly}T${timeAtOffset(11, 35, 35)}+05:30` : null;
  const isMca = settlement.id.startsWith("mca_");

  return {
    settlement,
    grossAmount,
    gst,
    platformFee,
    initiatedAt,
    processingAt,
    complianceReviewAt,
    depositedAt,
    expectedAt,
    payments: buildPayments(settlement, grossAmount, gst, platformFee, paymentDateOnly),
    mcaPayments: isMca ? buildMcaPayments(settlement, paymentDateOnly) : undefined,
    heldFunds,
  };
}

// Keyed by every row from both products (ids never collide, "stl_" vs
// "mca_"), so the detail page at /reports/settlement-report/[settlementId]
// can look up either product's settlement without needing to know which
// product context it came from.
export const settlementDetailsById: Record<string, SettlementDetail> = Object.fromEntries(
  [...settlementRows, ...mcaSettlementRows].map((row) => [row.id, buildSettlementDetail(row)])
);
