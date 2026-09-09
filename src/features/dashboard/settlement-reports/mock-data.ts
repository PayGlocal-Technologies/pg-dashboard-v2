import {
  addDays,
  computeSettlementSchedule,
  type HolidayInfo,
} from "@/features/dashboard/settlement-reports/calendarUtils";
import {
  mapDetailPaymentToMcaPayment,
  mapSettlementListItemToRow,
} from "@/features/dashboard/settlement-reports/helper";
import type {
  SettlementDetail,
  SettlementAccount,
  SettlementDetailPayment,
  SettlementDetailResponse,
  SettlementListResponse,
  SettlementRow,
  SettlementSupplement,
  SparklinePoint,
} from "@/features/dashboard/settlement-reports/types";

// TODO(integration): every export in this file is mock. Section A below is
// shaped exactly like the two proposed endpoints and is deleted wholesale when
// they deploy; Section B is the list of fields those endpoints do NOT carry and
// has to be resolved with the backend before it can go the same way. All
// merchant ids, bank accounts, gids and UTRs here are fake demo values.

/**
 * Bank holidays, used ONLY to keep the mock settlement dates and their capture
 * windows internally consistent with the real T+1 rules.
 *
 * This is not what the screen renders. The settlement calendar, the holiday
 * banner and the next-settlement date all read the live /gcc/v1/calendar
 * endpoint (see useSettlementCalendar in hooks.ts), so this list is never
 * exported — a real holiday must not come from this file again.
 */
const bankHolidays: HolidayInfo[] = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-13", name: "Bank Holiday" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-12-25", name: "Christmas" },
];

export const settlementSummary = {
  totalSettled: 507000,
  totalSettledTrendPct: 12.3,
  // amount === grossAmount - tax - fee. Mirrors the 2026-03-11 PA settlement
  // below (same amount, date, and transaction count).
  previousSettled: {
    amount: 98420,
    dateLabel: "11 Mar 26",
    timeLabel: "11:59 PM",
    transactionCount: 36,
    grossAmount: 100000,
    tax: 380,
    fee: 1200,
  },
  // Amount only. The date, and whether a weekend or holiday pushed it out, come
  // from the live calendar (useSettlementCalendar) — see index.tsx.
  upcomingSettlement: {
    amount: 124890.5,
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
    grossAmount: 33075,
    tax: 125,
    fee: 500,
  },
  // Amount only, as above.
  upcomingSettlement: {
    amount: 8420,
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

// ════════════════════════════════════════════════════════════════════════════
// SECTION A — the proposed contract, mocked verbatim
// ════════════════════════════════════════════════════════════════════════════
//
// Everything below Section A's divider is shaped exactly like the two new
// endpoints, so when they deploy the response builders here are deleted and the
// mappers in helper.ts keep working unchanged:
//
//   GET /gcc/v3/analytics/{merchantId}/merchant/settlement-list
//         ?startDate=&endDate=&page=&limit=
//   GET /gcc/v3/analytics/{merchantId}/merchant/settlement-detail
//         ?settlementDate=
//
// There is no settlement id any more. An account settles at most once a day, so
// the primary key is (merchantId, settlementDate) — the merchant half matters
// because a UCIC-scoped list spans MIDs and two of them settle on 2026-03-16 in
// this dataset precisely to prove the date alone is not unique.

/** The MID the mock list is scoped to, matching the sample payloads. */
export const MOCK_MCA_MERCHANT_ID = "zoukansa16346391";
/** A second PACB MID under the same UCIC, so the list spans merchants and the
 *  Merchant ID column has something to show. */
export const MOCK_SECOND_MCA_MERCHANT_ID = "ptplsecondmca0042";
/** The PA equivalent. Payments is single-MID in this dataset. */
export const MOCK_PA_MERCHANT_ID = "zoukansapa1634639";

interface SettlementSeed {
  merchantId: string;
  /** YYYY-MM-DD. Unique per merchant — that is the whole point of the new key. */
  settlementDate: string;
  /** Net amount, i.e. grossAmount - gstDeduction - deductionAmount. */
  amount: number;
  transactionCount: number;
  /** PayGlocal's discounts on the platform fee. Both default to 0 so the "no
   *  discount" case renders too. They add BACK onto the charged fee to give the
   *  fee before discount — see SettlementDetailData in types.ts. */
  discountAmount?: number;
  offerDiscountAmount?: number;

  /** Off-contract, and the only one left: marks the settlement whose payments
   *  do NOT all share a status, so the table renders more than one badge. */
  hasMixedPaymentStatus?: boolean;
}

// Scenarios, unchanged in intent from the id-keyed dataset they replace:
//  - 2026-03-16 is the sample payload, to the rupee: 12 txns, net 8420.00,
//    gross 8555.17, GST 32.51, fee 102.66, discounts 15.00 / 5.00. It is also
//    the holiday pushout (2026-03-13) AND the two-MID collision.
//  - 2026-03-09 / 2026-03-02 are weekend roll-ups: ONE settlement covering
//    three capture days, which is what makes paymentReceivedAt a range rather
//    than a date (gap 9 in Section B).
//  - 2026-03-04 is the singular-copy / sub-100 row, 2026-03-03 the 137-payment
//    row that exercises pagination on the detail page.
const MCA_SETTLEMENT_SEEDS: SettlementSeed[] = [
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-16",
    amount: 8420.0,
    transactionCount: 12,
    discountAmount: 15.0,
    offerDiscountAmount: 5.0,
    hasMixedPaymentStatus: true,
  },
  {
    merchantId: MOCK_SECOND_MCA_MERCHANT_ID,
    settlementDate: "2026-03-16",
    amount: 2150.4,
    transactionCount: 4,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-12",
    amount: 15600.0,
    transactionCount: 21,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-11",
    amount: 32450.0,
    transactionCount: 41,
  },
  {
    merchantId: MOCK_SECOND_MCA_MERCHANT_ID,
    settlementDate: "2026-03-10",
    amount: 9875.15,
    transactionCount: 14,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-09",
    amount: 51200.5,
    transactionCount: 58,
    discountAmount: 120.0,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-06",
    amount: 12300.0,
    transactionCount: 9,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-05",
    amount: 27680.25,
    transactionCount: 33,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-04",
    amount: 84.6,
    transactionCount: 1,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-03",
    amount: 14273905.4,
    transactionCount: 137,
    offerDiscountAmount: 2500.0,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-03-02",
    amount: 63420.9,
    transactionCount: 47,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-02-27",
    amount: 21105.0,
    transactionCount: 19,
  },
  {
    merchantId: MOCK_MCA_MERCHANT_ID,
    settlementDate: "2026-02-26",
    amount: 19430.8,
    transactionCount: 26,
  },
];

// Payments (PA) settles into the same date key. Single MID, so its Merchant ID
// column stays hidden — see shouldShowMerchantColumn() in index.tsx.
const PA_SETTLEMENT_SEEDS: SettlementSeed[] = [
  {
    merchantId: MOCK_PA_MERCHANT_ID,
    settlementDate: "2026-03-16",
    amount: 124890.5,
    transactionCount: 48,
  },
  {
    merchantId: MOCK_PA_MERCHANT_ID,
    settlementDate: "2026-03-12",
    amount: 56340,
    transactionCount: 22,
  },
  {
    // Net 98420 reproduces the reference breakup exactly through the rates
    // below: gross 100000, GST 380, fee 1200.
    merchantId: MOCK_PA_MERCHANT_ID,
    settlementDate: "2026-03-11",
    amount: 98420,
    transactionCount: 36,
  },
  {
    merchantId: MOCK_PA_MERCHANT_ID,
    settlementDate: "2026-03-10",
    amount: 142650.75,
    transactionCount: 62,
  },
  {
    // The weekend roll-up: three capture days in one settlement.
    merchantId: MOCK_PA_MERCHANT_ID,
    settlementDate: "2026-03-09",
    amount: 119410.75,
    transactionCount: 46,
  },
  {
    merchantId: MOCK_PA_MERCHANT_ID,
    settlementDate: "2026-03-06",
    amount: 189340.25,
    transactionCount: 74,
  },
];

/** The account each MID settles into. Per merchant, not per profile: that is
 *  the whole reason settlementAccount belongs on the settlement response. */
const SETTLEMENT_ACCOUNTS: Record<string, SettlementAccount> = {
  [MOCK_MCA_MERCHANT_ID]: {
    bankName: "Citibank N.A.",
    maskedAccountNumber: "****9081",
    ifscCode: "CITI0000004",
  },
  // A different bank on the second MID, which is what makes the "one account
  // per profile" assumption visibly wrong on a multi-MID list.
  [MOCK_SECOND_MCA_MERCHANT_ID]: {
    bankName: "Kotak Mahindra Bank",
    maskedAccountNumber: "****3312",
    ifscCode: "KKBK0000958",
  },
  [MOCK_PA_MERCHANT_ID]: {
    bankName: "HDFC Bank",
    maskedAccountNumber: "****4521",
    ifscCode: "HDFC0000123",
  },
};

function seedsFor(isMca: boolean): SettlementSeed[] {
  return isMca ? MCA_SETTLEMENT_SEEDS : PA_SETTLEMENT_SEEDS;
}

function findSeed(merchantId: string, settlementDate: string): SettlementSeed | undefined {
  return [...MCA_SETTLEMENT_SEEDS, ...PA_SETTLEMENT_SEEDS].find(
    (s) => s.merchantId === merchantId && s.settlementDate === settlementDate
  );
}

// ── The amount breakup ──────────────────────────────────────────────────────
// Back-derived from the one settlement whose breakup is already published (net
// 98420 → gross 100000, GST 380, fee 1200) and applied to every other row, so
// the numbers stay internally consistent. These same two rates reproduce the
// sample payload's 8420 → 8555.17 / 32.51 / 102.66 to the paisa, which is what
// confirms `deductionAmount` is the platform fee with GST EXCLUDED.
const PLATFORM_FEE_RATE_OF_NET = 1200 / 98420;
const GST_RATE_OF_FEE = 380 / 1200;

function deriveAmountBreakdown(netAmount: number): {
  grossAmount: number;
  gstDeduction: number;
  deductionAmount: number;
} {
  const deductionAmount = Math.round(netAmount * PLATFORM_FEE_RATE_OF_NET * 100) / 100;
  const gstDeduction = Math.round(deductionAmount * GST_RATE_OF_FEE * 100) / 100;
  const grossAmount = Math.round((netAmount + gstDeduction + deductionAmount) * 100) / 100;
  return { grossAmount, gstDeduction, deductionAmount };
}

/** `11:35` + `offsetMinutes` → `"HH:MM:00"`, wrapping past midnight. Plain
 * arithmetic (no Date object) so every payment list stays deterministic across
 * server and client renders. */
function timeAtOffset(baseHour: number, baseMinute: number, offsetMinutes: number): string {
  const totalMinutes = baseHour * 60 + baseMinute + offsetMinutes;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

// Every remitter the mock cycles through, covering the corridors an MCA
// merchant actually collects from: a zero-decimal currency (JPY), sub-rupee
// amounts, and a long name that has to truncate rather than widen the column.
// The first two entries reproduce the sample payload's two payments exactly.
const MCA_REMITTERS: { name: string; country: string; currency: string; amount: number }[] = [
  { name: "frm2", country: "CA", currency: "CAD", amount: 0.5 },
  { name: "frm", country: "US", currency: "USD", amount: 1 },
  { name: "puneethv", country: "CA", currency: "CAD", amount: 20 },
  { name: "puneethv", country: "US", currency: "USD", amount: 20 },
  { name: "apple", country: "US", currency: "USD", amount: 10000 },
  { name: "test", country: "US", currency: "USD", amount: 10 },
  { name: "EEFC", country: "US", currency: "USD", amount: 50 },
  { name: "puneethv", country: "US", currency: "USD", amount: 12 },
  { name: "puneethv", country: "US", currency: "USD", amount: 11 },
  { name: "test", country: "CA", currency: "CAD", amount: 11 },
  { name: "test", country: "CA", currency: "CAD", amount: 150 },
  { name: "Northwind Trading GmbH", country: "DE", currency: "EUR", amount: 2450.75 },
  { name: "Halcyon Studios Ltd", country: "GB", currency: "GBP", amount: 890 },
  { name: "Meridian FZ-LLC", country: "AE", currency: "AED", amount: 15750 },
  { name: "Sakura Godo Kaisha", country: "JP", currency: "JPY", amount: 320000 },
  { name: "Lion City Ventures Pte Ltd", country: "SG", currency: "SGD", amount: 4120.4 },
  { name: "Kangaroo Digital Pty", country: "AU", currency: "AUD", amount: 640.25 },
];

/** How many of a mixed settlement's payments are still short of their FIRC. */
const MIXED_PAYMENTS_AWAITING_FIRC = 1;

/** Obviously-fake but stable gid, e.g. "gl_p20260316001". */
function mockGid(settlementDate: string, index: number): string {
  return `gl_p${settlementDate.replaceAll("-", "")}${String(index + 1).padStart(3, "0")}`;
}

function buildDetailPayments(seed: SettlementSeed): SettlementDetailPayment[] {
  return Array.from({ length: seed.transactionCount }, (_, i) => {
    const remitter = MCA_REMITTERS[i % MCA_REMITTERS.length]!;
    // FIRC_SETTLED is the terminal state; SETTLED means the funds moved but the
    // FIRC is still outstanding. One seeded settlement mixes the two so the
    // table renders both badges at once.
    const status: SettlementDetailPayment["status"] =
      seed.hasMixedPaymentStatus && i < MIXED_PAYMENTS_AWAITING_FIRC ? "SETTLED" : "FIRC_SETTLED";
    return {
      gid: mockGid(seed.settlementDate, i),
      amount: remitter.amount,
      currency: remitter.currency,
      // The sample payload timestamps payments on the SETTLEMENT date rather
      // than their capture date, so the mock does too.
      createdTime: `${seed.settlementDate}T${timeAtOffset(9, 35, i * 7)}Z`,
      country: remitter.country,
      remitterName: remitter.name,
      status,
    };
  });
}

/**
 * `GET .../merchant/settlement-list`, mocked. `startDate`/`endDate` are
 * optional and inclusive; `page` is 1-based. `totalCount` counts the filtered
 * set across all pages, exactly as the real response must.
 */
export function mockSettlementListResponse(
  isMca: boolean,
  params: {
    merchantId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}
): SettlementListResponse {
  const { startDate, endDate, page = 1, limit } = params;
  const filtered = seedsFor(isMca)
    .filter((s) => !params.merchantId || s.merchantId === params.merchantId)
    .filter((s) => !startDate || s.settlementDate >= startDate)
    .filter((s) => !endDate || s.settlementDate <= endDate)
    .sort((a, b) => b.settlementDate.localeCompare(a.settlementDate));

  const start = limit ? (page - 1) * limit : 0;
  const pageRows = limit ? filtered.slice(start, start + limit) : filtered;

  return {
    data: {
      settlements: pageRows.map((s) => ({
        merchantId: s.merchantId,
        amount: s.amount,
        transactionCount: s.transactionCount,
        settlementDate: s.settlementDate,
      })),
      totalCount: filtered.length,
    },
    message: "Settlement list fetched successfully",
  };
}

/**
 * `GET .../merchant/settlement-detail?settlementDate=`, mocked. Returns null
 * where the real endpoint would 404 — which now happens when the merchant is
 * wrong as well as when the date is, since the key is the pair.
 */
export function mockSettlementDetailResponse(
  merchantId: string,
  settlementDate: string
): SettlementDetailResponse | null {
  const seed = findSeed(merchantId, settlementDate);
  if (!seed) return null;
  const { grossAmount, gstDeduction, deductionAmount } = deriveAmountBreakdown(seed.amount);
  return {
    data: {
      transactionCount: seed.transactionCount,
      settlementAccount: SETTLEMENT_ACCOUNTS[seed.merchantId]!,
      grossAmount,
      gstDeduction,
      deductionAmount,
      netAmount: seed.amount,
      discountAmount: seed.discountAmount ?? 0,
      offerDiscountAmount: seed.offerDiscountAmount ?? 0,
      payments: buildDetailPayments(seed),
    },
    message: "Settlement detail fetched successfully",
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION B — the one thing the page derives rather than reads
// ════════════════════════════════════════════════════════════════════════════
//
// This section used to be the gap list. It is now a single derivation, because
// everything else in it was either added to the contract (settlementAccount) or
// dropped from the product: there is no settlement status, no UTR, no held
// funds, no released-from-hold, and no lifecycle timeline.
//
// What remains is the capture window: which day's payments rolled into this
// settlement. Not a backend field and not asked for as one — it falls out of
// walking the T+1 holiday calendar BACKWARDS from the settlement date, which is
// the same derivation behind the non-working-day metadata. Note that it is a
// RANGE: a Friday, Saturday and Sunday capture all settle on the Monday, so
// 2026-03-09 covers three days and 2026-03-16 covers four.

/**
 * The capture days that roll into one settlement date: every day whose T+1
 * schedule lands on it.
 */
function captureWindowFor(settlementDate: string): string[] {
  const days: string[] = [];
  for (let back = 1; back <= 10; back++) {
    const candidate = addDays(settlementDate, -back);
    if (computeSettlementSchedule(candidate, bankHolidays).settlementDate === settlementDate) {
      days.unshift(candidate);
    }
  }
  return days.length > 0 ? days : [addDays(settlementDate, -1)];
}

export function mockSettlementSupplement(
  merchantId: string,
  settlementDate: string
): SettlementSupplement | null {
  const seed = findSeed(merchantId, settlementDate);
  if (!seed) return null;
  const captureWindow = captureWindowFor(seed.settlementDate);
  return { paymentReceivedAt: captureWindow[0]!, captureWindow };
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION C — what the screen actually renders
// ════════════════════════════════════════════════════════════════════════════
// Contract (A) plus supplement (B), mapped onto the view models. These are the
// only exports the feature imports; when the endpoints land, index.tsx and the
// detail page swap these for the live queries and the mappers stay put.

/**
 * A mock row goes through the SAME mapper the live list will, so the mapper is
 * exercised rather than bypassed: contract item in, SettlementRow out. The only
 * thing layered on afterwards is the non-working-day metadata, which the mapper
 * leaves false because it is not a contract field — it is derived from the
 * settlement's capture day against the holiday calendar, and on the live path
 * that derivation happens in the component with the real calendar.
 */
function buildRow(seed: SettlementSeed): SettlementRow {
  const supplement = mockSettlementSupplement(seed.merchantId, seed.settlementDate)!;
  const row = mapSettlementListItemToRow(
    {
      merchantId: seed.merchantId,
      amount: seed.amount,
      transactionCount: seed.transactionCount,
      settlementDate: seed.settlementDate,
    },
    supplement
  );
  const schedule = computeSettlementSchedule(supplement.paymentReceivedAt, bankHolidays);
  return {
    ...row,
    affectedByNonWorkingDay: schedule.affectedByNonWorkingDay,
    nonWorkingDayReason: schedule.nonWorkingDayReason ?? undefined,
    nonWorkingDayDate: schedule.nonWorkingDayDate ?? undefined,
    nonWorkingDayName: schedule.nonWorkingDayName ?? undefined,
  };
}

/** PA settlement rows, newest first. */
export const settlementRows: SettlementRow[] = PA_SETTLEMENT_SEEDS.map(buildRow).sort((a, b) =>
  b.id.localeCompare(a.id)
);

/** PACB settlement rows, newest first. */
export const mcaSettlementRows: SettlementRow[] = MCA_SETTLEMENT_SEEDS.map(buildRow).sort((a, b) =>
  b.id.localeCompare(a.id)
);

/** The mock list for a product — see SHOW_MOCK_SETTLEMENTS in index.tsx. */
export function mockSettlementRowsFor(isMca: boolean): SettlementRow[] {
  return isMca ? mcaSettlementRows : settlementRows;
}

/**
 * One settlement in full, for the detail page. Keyed by the pair, so a URL
 * carrying a date the merchant does not own resolves to nothing. Returns null
 * exactly where the real endpoint would 404.
 */
export function mockSettlementDetail(
  merchantId: string,
  settlementDate: string
): SettlementDetail | null {
  const seed = findSeed(merchantId, settlementDate);
  const response = mockSettlementDetailResponse(merchantId, settlementDate);
  if (!seed || !response) return null;

  const {
    settlementAccount,
    grossAmount,
    gstDeduction,
    deductionAmount,
    discountAmount,
    offerDiscountAmount,
    payments,
  } = response.data;

  return {
    settlement: buildRow(seed),
    account: settlementAccount,
    grossAmount,
    gst: gstDeduction,
    platformFee: deductionAmount,
    discountAmount,
    offerDiscountAmount,
    payments: payments.map(mapDetailPaymentToMcaPayment),
  };
}
