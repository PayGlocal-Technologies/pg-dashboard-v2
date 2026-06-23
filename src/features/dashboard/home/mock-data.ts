// Dashboard mock data — ported verbatim from Nova (lib/mock-data) so the v2
// dashboard renders identically. Shapes are the source of truth for the
// dashboard feature components.

export const dashboardStats = {
  successfulPayments: { value: 847250.75, currency: "INR", count: 342, change: 12.4 },
  settlementsDue: { value: 124890.5, currency: "INR", count: 18, change: -3.2 },
  fundsOnHold: { value: 52340.0, currency: "INR", count: 7, change: 2.1 },
  openDisputes: { value: 14200.0, currency: "INR", count: 3, change: -1 },
};

/** Today's analytics hero — hourly series in lakhs (₹) or counts for payments tab */
export const todaysAnalytics = {
  grossVolume: { todayTotal: 9_42_800, yesterdayTotal: 8_26_000, changePct: 14.1 },
  netVolume: { todayTotal: 8_89_400, yesterdayTotal: 7_95_200, changePct: 11.8 },
  paymentCount: { todayTotal: 1362, yesterdayTotal: 1198, changePct: 13.7 },
  successRate: {
    pct: 94.2,
    succeeded: 1284,
    attempted: 1362,
    failed: 78,
    avgTicket: 6600,
  },
  attention: {
    fundsOnHold: { amount: 52_340, releaseLabel: "12 Transactions" },
    disputes: { openCount: 4, disputedAmount: 14_200 },
    settlementsDue: { amount: 1_24_890, expectedLabel: "Settles at 12:00AM IST" },
  },
  /**
   * payments* = successful + failed + disputed (per hour).
   * payMixToday / payMixYesterday = share of volume (or attempts) by payment mode for tooltips [UPI, Cards, Net banking, Wallets].
   */
  hourly: [
    { label: "00:00", grossL: 0.35, grossYesterdayL: 0.28, netL: 0.32, netYesterdayL: 0.26, payments: 48, paymentsYesterday: 41, payOk: 45, payFail: 2, payDisp: 1, payOkY: 38, payFailY: 2, payDispY: 1, payMixToday: [0.46, 0.28, 0.18, 0.08] as const, payMixYesterday: [0.44, 0.29, 0.19, 0.08] as const },
    { label: "02:00", grossL: 0.22, grossYesterdayL: 0.2, netL: 0.2, netYesterdayL: 0.18, payments: 32, paymentsYesterday: 29, payOk: 30, payFail: 1, payDisp: 1, payOkY: 27, payFailY: 1, payDispY: 1, payMixToday: [0.42, 0.3, 0.2, 0.08] as const, payMixYesterday: [0.45, 0.28, 0.19, 0.08] as const },
    { label: "04:00", grossL: 0.18, grossYesterdayL: 0.15, netL: 0.16, netYesterdayL: 0.14, payments: 26, paymentsYesterday: 22, payOk: 24, payFail: 2, payDisp: 0, payOkY: 20, payFailY: 2, payDispY: 0, payMixToday: [0.4, 0.32, 0.2, 0.08] as const, payMixYesterday: [0.43, 0.3, 0.19, 0.08] as const },
    { label: "06:00", grossL: 0.45, grossYesterdayL: 0.38, netL: 0.42, netYesterdayL: 0.35, payments: 58, paymentsYesterday: 51, payOk: 55, payFail: 2, payDisp: 1, payOkY: 48, payFailY: 2, payDispY: 1, payMixToday: [0.44, 0.29, 0.19, 0.08] as const, payMixYesterday: [0.46, 0.27, 0.19, 0.08] as const },
    { label: "08:00", grossL: 1.2, grossYesterdayL: 0.95, netL: 1.12, netYesterdayL: 0.88, payments: 142, paymentsYesterday: 118, payOk: 134, payFail: 6, payDisp: 2, payOkY: 112, payFailY: 4, payDispY: 2, payMixToday: [0.48, 0.27, 0.17, 0.08] as const, payMixYesterday: [0.45, 0.28, 0.19, 0.08] as const },
    { label: "10:00", grossL: 2.8, grossYesterdayL: 2.2, netL: 2.62, netYesterdayL: 2.05, payments: 268, paymentsYesterday: 221, payOk: 252, payFail: 13, payDisp: 3, payOkY: 208, payFailY: 10, payDispY: 3, payMixToday: [0.5, 0.26, 0.16, 0.08] as const, payMixYesterday: [0.47, 0.27, 0.18, 0.08] as const },
    { label: "12:00", grossL: 4.1, grossYesterdayL: 3.6, netL: 3.85, netYesterdayL: 3.38, payments: 312, paymentsYesterday: 285, payOk: 294, payFail: 14, payDisp: 4, payOkY: 268, payFailY: 13, payDispY: 4, payMixToday: [0.49, 0.26, 0.17, 0.08] as const, payMixYesterday: [0.46, 0.28, 0.18, 0.08] as const },
    { label: "14:00", grossL: 5.2, grossYesterdayL: 4.5, netL: 4.88, netYesterdayL: 4.22, payments: 356, paymentsYesterday: 318, payOk: 335, payFail: 17, payDisp: 4, payOkY: 299, payFailY: 15, payDispY: 4, payMixToday: [0.47, 0.27, 0.18, 0.08] as const, payMixYesterday: [0.45, 0.29, 0.18, 0.08] as const },
    { label: "16:00", grossL: 6.4, grossYesterdayL: 5.8, netL: 6.02, netYesterdayL: 5.45, payments: 398, paymentsYesterday: 362, payOk: 375, payFail: 19, payDisp: 4, payOkY: 340, payFailY: 18, payDispY: 4, payMixToday: [0.46, 0.28, 0.18, 0.08] as const, payMixYesterday: [0.44, 0.29, 0.19, 0.08] as const },
    { label: "18:00", grossL: 7.8, grossYesterdayL: 7.1, netL: 7.32, netYesterdayL: 6.65, payments: 442, paymentsYesterday: 401, payOk: 416, payFail: 22, payDisp: 4, payOkY: 377, payFailY: 20, payDispY: 4, payMixToday: [0.45, 0.28, 0.19, 0.08] as const, payMixYesterday: [0.43, 0.3, 0.19, 0.08] as const },
    { label: "20:00", grossL: 8.9, grossYesterdayL: 8.2, netL: 8.35, netYesterdayL: 7.68, payments: 498, paymentsYesterday: 455, payOk: 468, payFail: 25, payDisp: 5, payOkY: 428, payFailY: 22, payDispY: 5, payMixToday: [0.44, 0.29, 0.19, 0.08] as const, payMixYesterday: [0.42, 0.3, 0.2, 0.08] as const },
    { label: "22:00", grossL: 9.2, grossYesterdayL: 8.45, netL: 8.64, netYesterdayL: 7.92, payments: 512, paymentsYesterday: 468, payOk: 482, payFail: 25, payDisp: 5, payOkY: 440, payFailY: 23, payDispY: 5, payMixToday: [0.43, 0.29, 0.2, 0.08] as const, payMixYesterday: [0.41, 0.31, 0.2, 0.08] as const },
  ],
};

export const countryInsights = [
  { country: "United States", code: "US", amount: 410196, transactions: 142 },
  { country: "Ireland", code: "IE", amount: 183635, transactions: 68 },
  { country: "United Kingdom", code: "GB", amount: 97420, transactions: 44 },
  { country: "Canada", code: "CA", amount: 64800, transactions: 31 },
  { country: "Qatar", code: "QA", amount: 32100, transactions: 12 },
  { country: "Singapore", code: "SG", amount: 28900, transactions: 19 },
  { country: "Germany", code: "DE", amount: 17400, transactions: 9 },
];

export const monthlyVolume = [
  { month: "Sep", volume: 620000, settlements: 580000 },
  { month: "Oct", volume: 740000, settlements: 690000 },
  { month: "Nov", volume: 810000, settlements: 760000 },
  { month: "Dec", volume: 950000, settlements: 880000 },
  { month: "Jan", volume: 720000, settlements: 670000 },
  { month: "Feb", volume: 880000, settlements: 820000 },
  { month: "Mar", volume: 1020000, settlements: 960000 },
];

/** Dashboard widget zone — hourly line chart */
export const hourlyTraffic = [
  { t: "00", v: 8 }, { t: "04", v: 12 }, { t: "08", v: 42 }, { t: "12", v: 68 },
  { t: "16", v: 55 }, { t: "20", v: 38 }, { t: "23", v: 22 },
];

/** Donut / legend for payment method split widget (matches dashboard chart blues) */
export const paymentMethodSplit = [
  { key: "card", label: "Card", value: 52, color: "#0061E3" },
  { key: "upi", label: "UPI", value: 31, color: "#60a5fa" },
  { key: "netbanking", label: "Net banking", value: 12, color: "#0891b2" },
  { key: "other", label: "Other", value: 5, color: "#94a3b8" },
];

/** Weekly UPI vs card volume — SMB India rail mix */
export const weeklyUpiVsCard = [
  { week: "W1", upi: 420000, card: 280000 },
  { week: "W2", upi: 465000, card: 265000 },
  { week: "W3", upi: 510000, card: 248000 },
  { week: "W4", upi: 548000, card: 239000 },
];

/** Settlement speed buckets (T+N working days) — cash-flow planning */
export const settlementSpeedBuckets = [
  { bucket: "T+0", pct: 28 },
  { bucket: "T+1", pct: 54 },
  { bucket: "T+2", pct: 14 },
  { bucket: "T+3+", pct: 4 },
];

/** Top decline / failure reasons (issuer + customer behaviour) */
export const paymentFailureReasons = [
  { reason: "Insufficient funds", count: 38 },
  { reason: "OTP / 3DS timeout", count: 24 },
  { reason: "Issuer declined", count: 19 },
  { reason: "Incorrect CVV", count: 12 },
  { reason: "Limit exceeded", count: 9 },
];

/** India state-wise domestic volume (GST / regional view) */
export const indiaStateInsights = [
  { state: "Maharashtra", code: "MH", amount: 312000, transactions: 118 },
  { state: "Karnataka", code: "KA", amount: 241500, transactions: 96 },
  { state: "Delhi NCR", code: "DL", amount: 198200, transactions: 82 },
  { state: "Tamil Nadu", code: "TN", amount: 156400, transactions: 61 },
  { state: "Telangana", code: "TG", amount: 124800, transactions: 48 },
  { state: "Gujarat", code: "GJ", amount: 98200, transactions: 39 },
];

/** INR settlements vs cross-border FX — export / SaaS SMBs */
export const inrVsFxSplit = [
  { key: "inr", label: "INR settlements", value: 72, color: "#0061E3" },
  { key: "fx", label: "FX / multi-currency", value: 28, color: "#93c5fd" },
];

/** Gross captured vs net after fees (MDR + tax) */
export const netVsGrossWeekly = [
  { label: "W1", gross: 720000, net: 698400 },
  { label: "W2", gross: 758000, net: 735260 },
  { label: "W3", gross: 802000, net: 777940 },
  { label: "W4", gross: 834000, net: 808980 },
];

export const topCustomersBySpend = [
  { name: "Sarah Mitchell", email: "sarah.m@example.com", total: 284_500 },
  { name: "Rohan Sharma", email: "rohan.s@techcorp.io", total: 198_200 },
  { name: "Yajat Gupta", email: "yajat.g@payglocal.in", total: 142_800 },
  { name: "Priya Patel", email: "priya.p@startup.co", total: 96_400 },
  { name: "James O'Brien", email: "james.ob@gmail.com", total: 72_150 },
];

export const dashboardWidgetKpis = {
  paymentAttempts: { value: 364, change: 4.8 },
  successRate: { value: 94.2, change: 1.1 },
  avgTicket: { value: 2473, currency: "INR" as const },
  refunds: { value: 18_420, currency: "INR" as const, change: -2.3 },
  failedPayments: { value: 22, change: -8 },
  settledToday: { value: 412_300, currency: "INR" as const },
  nextSettlementLabel: "Mar 21, 2026 · 11:00 AM IST",
  activeCustomers: { value: 1284, change: 6.2 },
  newCustomers: { value: 42, change: 12 },
  repeatRate: { value: 38.5, change: 0.4 },
  disputeRate: { value: 0.82, change: -0.15 },
  blockedTx: { value: 7, change: 0 },
};

export const recentTransactions = [
  {
    id: "gl_o-9d...sj0l7X2",
    amount: 325.58,
    currency: "INR",
    status: "in_progress",
    method: "card",
    cardBrand: "visa",
    cardLast4: "9903",
    customerName: "Yajat Gupta",
    email: "yajat.gupta@payglocal.in",
    date: "2026-03-12T13:30:00",
  },
  {
    id: "gl_o-8c...pk3m9Y4",
    amount: 1250.0,
    currency: "USD",
    status: "sent_for_capture",
    method: "card",
    cardBrand: "mastercard",
    cardLast4: "5100",
    customerName: "Sarah Mitchell",
    email: "sarah.m@example.com",
    date: "2026-03-12T11:15:00",
  },
  {
    id: "gl_o-7b...qr2n8Z3",
    amount: 8900.0,
    currency: "INR",
    status: "sent_for_capture",
    method: "upi",
    cardBrand: null,
    cardLast4: null,
    customerName: "Rohan Sharma",
    email: "rohan.s@techcorp.io",
    date: "2026-03-12T10:42:00",
  },
  {
    id: "gl_o-6a...wt4p6A1",
    amount: 450.75,
    currency: "EUR",
    status: "failed",
    method: "card",
    cardBrand: "visa",
    cardLast4: "4242",
    customerName: "James O'Brien",
    email: "james.ob@gmail.com",
    date: "2026-03-12T09:20:00",
  },
  {
    id: "gl_o-5f...mn5q7B8",
    amount: 2800.0,
    currency: "INR",
    status: "sent_for_capture",
    method: "netbanking",
    cardBrand: null,
    cardLast4: null,
    customerName: "Priya Patel",
    email: "priya.p@startup.co",
    date: "2026-03-11T17:55:00",
  },
  {
    id: "gl_o-4e...lk8r5C6",
    amount: 3200.0,
    currency: "INR",
    status: "sent_for_capture",
    method: "card",
    cardBrand: "mastercard",
    cardLast4: "1859",
    customerName: "Karan Gopalan Krishnamurthy Ghaiii",
    email: "arjun.m@design.co",
    date: "2026-03-11T16:30:00",
  },
  {
    id: "gl_o-3d...ji9s4D5",
    amount: 580.25,
    currency: "GBP",
    status: "refunded",
    method: "card",
    cardBrand: "visa",
    cardLast4: "7118",
    customerName: "Emma Thompson",
    email: "emma.t@outlook.com",
    date: "2026-03-11T14:10:00",
  },
];

export const recentSettlements = [
  {
    id: "stl_a1b2c3d4",
    amount: 124890.5,
    currency: "INR",
    status: "processing",
    bankAccount: "HDFC ****4521",
    transactionCount: 48,
    date: "2026-03-12T00:00:00",
  },
  {
    id: "stl_e5f6g7h8",
    amount: 98420.0,
    currency: "INR",
    status: "settled",
    bankAccount: "HDFC ****4521",
    transactionCount: 36,
    date: "2026-03-11T00:00:00",
  },
  {
    id: "stl_i9j0k1l2",
    amount: 142650.75,
    currency: "INR",
    status: "settled",
    bankAccount: "HDFC ****4521",
    transactionCount: 62,
    date: "2026-03-10T00:00:00",
  },
];

export type RecentTransaction = (typeof recentTransactions)[number];
export type RecentSettlement = (typeof recentSettlements)[number];
