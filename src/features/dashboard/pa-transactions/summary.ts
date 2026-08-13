// TODO(integration): this metrics section is mock data only. Every metric
// below needs a real aggregation endpoint across ALL matching transactions
// for the selected period (not just the current page returned by
// paTxnSearchApi) before this ships, see TransactionsFeature and the
// CLAUDE.md migration checklist. Do not derive these from the paginated
// table response; it only reflects the current page. RAW_METRICS_BY_TIMEFRAME
// below is the thing to replace with a real API response, deriveMetrics()
// is the reusable business logic that would then run against it unchanged.

export interface TransactionsSparklinePoint {
  x: string;
  y: number;
  /** Satisfies DashboardAreaChartTemplate's generic point shape. */
  [key: string]: string | number;
}

export type TotalVolumeTimeframe = "today" | "week" | "month" | "ytd";

export const totalVolumeTimeframes: { id: TotalVolumeTimeframe; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "ytd", label: "Year to date" },
];

/** Chart behind the "Total volume" metric card, one series per timeframe tab. */
export const totalVolumeChartsByTimeframe: Record<TotalVolumeTimeframe, TransactionsSparklinePoint[]> = {
  today: [
    { x: "12 AM", y: 4200 },
    { x: "4 AM", y: 2100 },
    { x: "8 AM", y: 9800 },
    { x: "12 PM", y: 16400 },
    { x: "4 PM", y: 21500 },
    { x: "8 PM", y: 18650 },
  ],
  week: [
    { x: "Mon", y: 98000 },
    { x: "Tue", y: 112000 },
    { x: "Wed", y: 105500 },
    { x: "Thu", y: 121000 },
    { x: "Fri", y: 138000 },
    { x: "Sat", y: 142500 },
    { x: "Sun", y: 152640 },
  ],
  month: [
    { x: "Week 1", y: 245000 },
    { x: "Week 2", y: 268000 },
    { x: "Week 3", y: 259500 },
    { x: "Week 4", y: 152640 },
  ],
  ytd: [
    { x: "Jan", y: 512000 },
    { x: "Feb", y: 498000 },
    { x: "Mar", y: 560000 },
    { x: "Apr", y: 545000 },
    { x: "May", y: 610000 },
    { x: "Jun", y: 705000 },
    { x: "Jul", y: 842650 },
  ],
};

const TIMEFRAME_LABELS: Record<TotalVolumeTimeframe, string[]> = {
  today: totalVolumeChartsByTimeframe.today.map((p) => p.x),
  week: totalVolumeChartsByTimeframe.week.map((p) => p.x),
  month: totalVolumeChartsByTimeframe.month.map((p) => p.x),
  ytd: totalVolumeChartsByTimeframe.ytd.map((p) => p.x),
};

interface PaymentMethodVolume {
  key: string;
  label: string;
  volume: number;
  /** Existing app-wide payment-method palette, see home dashboard's paymentMethodSplit. */
  color: string;
}

/**
 * Raw inputs only, every derived figure (net volume, success rate, average
 * ticket size, payment method %) is computed in deriveMetrics() below rather
 * than hand-typed, so the formulas stay correct even as these numbers change.
 * "Prev" fields are independent historical facts for the equivalent prior
 * period (previous day/week/month/year-to-date), not re-derived from the
 * current period's own components.
 */
interface RawPeriodMetrics {
  totalVolume: number;
  totalVolumePrev: number;
  /** Successful/captured transactions only. */
  transactionCount: number;
  transactionCountPrev: number;
  /** Failed payment attempts, used as the success-rate denominator alongside transactionCount. */
  failedCount: number;
  failedCountPrev: number;
  refundAmount: number;
  refundCount: number;
  refundAmountPrev: number;
  /** Previous period's own net volume, an independent historical fact (not re-derived). */
  netVolumePrev: number;
  /** Previous period's own average ticket size, ditto. */
  averageTicketSizePrev: number;
  /** Raw volume per payment method, should sum to totalVolume. */
  paymentMethodSplit: PaymentMethodVolume[];
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cards: "#0061E3",
  upi: "#60a5fa",
  netBanking: "#0891b2",
  wallets: "#94a3b8",
};

const RAW_METRICS_BY_TIMEFRAME: Record<TotalVolumeTimeframe, RawPeriodMetrics> = {
  today: {
    totalVolume: 24850,
    totalVolumePrev: 23610,
    transactionCount: 72,
    transactionCountPrev: 66,
    failedCount: 5,
    failedCountPrev: 6,
    refundAmount: 620,
    refundCount: 2,
    refundAmountPrev: 980,
    netVolumePrev: 25100,
    averageTicketSizePrev: 340,
    paymentMethodSplit: [
      { key: "cards", label: "Cards", volume: 11928, color: PAYMENT_METHOD_COLORS.cards! },
      { key: "upi", label: "UPI", volume: 7704, color: PAYMENT_METHOD_COLORS.upi! },
      { key: "netBanking", label: "Net Banking", volume: 2982, color: PAYMENT_METHOD_COLORS.netBanking! },
      { key: "wallets", label: "Wallets", volume: 2236, color: PAYMENT_METHOD_COLORS.wallets! },
    ],
  },
  week: {
    totalVolume: 152640,
    totalVolumePrev: 145200,
    transactionCount: 452,
    transactionCountPrev: 410,
    failedCount: 28,
    failedCountPrev: 34,
    refundAmount: 5840,
    refundCount: 9,
    refundAmountPrev: 6100,
    netVolumePrev: 150200,
    averageTicketSizePrev: 354.15,
    paymentMethodSplit: [
      { key: "cards", label: "Cards", volume: 73267, color: PAYMENT_METHOD_COLORS.cards! },
      { key: "upi", label: "UPI", volume: 47318, color: PAYMENT_METHOD_COLORS.upi! },
      { key: "netBanking", label: "Net Banking", volume: 18317, color: PAYMENT_METHOD_COLORS.netBanking! },
      { key: "wallets", label: "Wallets", volume: 13738, color: PAYMENT_METHOD_COLORS.wallets! },
    ],
  },
  month: {
    totalVolume: 610000,
    totalVolumePrev: 572000,
    transactionCount: 1840,
    transactionCountPrev: 1695,
    failedCount: 98,
    failedCountPrev: 121,
    refundAmount: 21400,
    refundCount: 31,
    refundAmountPrev: 19800,
    netVolumePrev: 598000,
    averageTicketSizePrev: 337.46,
    paymentMethodSplit: [
      { key: "cards", label: "Cards", volume: 292800, color: PAYMENT_METHOD_COLORS.cards! },
      { key: "upi", label: "UPI", volume: 189100, color: PAYMENT_METHOD_COLORS.upi! },
      { key: "netBanking", label: "Net Banking", volume: 73200, color: PAYMENT_METHOD_COLORS.netBanking! },
      { key: "wallets", label: "Wallets", volume: 54900, color: PAYMENT_METHOD_COLORS.wallets! },
    ],
  },
  ytd: {
    totalVolume: 842650,
    totalVolumePrev: 776000,
    transactionCount: 246,
    transactionCountPrev: 219,
    failedCount: 15,
    failedCountPrev: 18,
    refundAmount: 31240,
    refundCount: 42,
    refundAmountPrev: 32612,
    netVolumePrev: 842586,
    averageTicketSizePrev: 3287.34,
    paymentMethodSplit: [
      { key: "cards", label: "Cards", volume: 404472, color: PAYMENT_METHOD_COLORS.cards! },
      { key: "upi", label: "UPI", volume: 261222, color: PAYMENT_METHOD_COLORS.upi! },
      { key: "netBanking", label: "Net Banking", volume: 101118, color: PAYMENT_METHOD_COLORS.netBanking! },
      { key: "wallets", label: "Wallets", volume: 75838, color: PAYMENT_METHOD_COLORS.wallets! },
    ],
  },
};

export interface PaymentMethodShare {
  key: string;
  label: string;
  pct: number;
  color: string;
}

export interface TransactionsMetrics {
  totalVolume: number;
  totalVolumeTrendPct: number;
  /** Total successful volume minus refunds. */
  netVolume: number;
  netVolumeTrendPct: number;
  transactionCount: number;
  transactionCountTrendPct: number;
  /** Successful attempts / (successful + failed attempts) * 100. */
  successRate: number;
  /** Percentage-point difference vs the prior period, not a relative % change. */
  successRateTrendPct: number;
  refundAmount: number;
  refundCount: number;
  refundAmountTrendPct: number;
  /** Total successful volume / number of successful transactions. */
  averageTicketSize: number;
  averageTicketSizeTrendPct: number;
  paymentMethodSplit: PaymentMethodShare[];
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return round(((current - previous) / previous) * 100, 1);
}

function deriveMetrics(raw: RawPeriodMetrics): TransactionsMetrics {
  const netVolume = raw.totalVolume - raw.refundAmount;

  const totalAttempts = raw.transactionCount + raw.failedCount;
  const successRate = totalAttempts === 0 ? 0 : round((raw.transactionCount / totalAttempts) * 100, 1);
  const totalAttemptsPrev = raw.transactionCountPrev + raw.failedCountPrev;
  const successRatePrev = totalAttemptsPrev === 0 ? 0 : (raw.transactionCountPrev / totalAttemptsPrev) * 100;

  const averageTicketSize = raw.transactionCount === 0 ? 0 : round(raw.totalVolume / raw.transactionCount, 2);

  const totalMethodVolume = raw.paymentMethodSplit.reduce((sum, m) => sum + m.volume, 0);

  return {
    totalVolume: raw.totalVolume,
    totalVolumeTrendPct: pctChange(raw.totalVolume, raw.totalVolumePrev),
    netVolume,
    netVolumeTrendPct: pctChange(netVolume, raw.netVolumePrev),
    transactionCount: raw.transactionCount,
    transactionCountTrendPct: pctChange(raw.transactionCount, raw.transactionCountPrev),
    successRate,
    successRateTrendPct: round(successRate - successRatePrev, 1),
    refundAmount: raw.refundAmount,
    refundCount: raw.refundCount,
    refundAmountTrendPct: pctChange(raw.refundAmount, raw.refundAmountPrev),
    averageTicketSize,
    averageTicketSizeTrendPct: pctChange(averageTicketSize, raw.averageTicketSizePrev),
    paymentMethodSplit: raw.paymentMethodSplit.map((m) => ({
      key: m.key,
      label: m.label,
      color: m.color,
      pct: totalMethodVolume === 0 ? 0 : round((m.volume / totalMethodVolume) * 100, 1),
    })),
  };
}

export const transactionsMetricsByTimeframe: Record<TotalVolumeTimeframe, TransactionsMetrics> = {
  today: deriveMetrics(RAW_METRICS_BY_TIMEFRAME.today),
  week: deriveMetrics(RAW_METRICS_BY_TIMEFRAME.week),
  month: deriveMetrics(RAW_METRICS_BY_TIMEFRAME.month),
  ytd: deriveMetrics(RAW_METRICS_BY_TIMEFRAME.ytd),
};

/** Deterministic small-sample sparkline ending at `endValue`, no Math.random
 * so server/client renders match exactly (see CLAUDE.md purity rules), used
 * for the secondary metric cards' mini trend charts. */
function seededTrendSeries(labels: string[], endValue: number, seedKey: string): TransactionsSparklinePoint[] {
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0;

  return labels.map((label, i) => {
    if (i === labels.length - 1) return { x: label, y: endValue };
    seed = (seed * 1103515245 + 12345) >>> 0;
    const wobble = 0.85 + (seed % 1000) / 1000 / 3.33; // ~0.85–1.15
    const ramp = 0.75 + (i / (labels.length - 1 || 1)) * 0.25;
    return { x: label, y: round(endValue * wobble * ramp, 2) };
  });
}

export interface TransactionsTrendCharts {
  netVolume: TransactionsSparklinePoint[];
  transactionCount: TransactionsSparklinePoint[];
  successRate: TransactionsSparklinePoint[];
  refundAmount: TransactionsSparklinePoint[];
  averageTicketSize: TransactionsSparklinePoint[];
}

function buildTrendCharts(timeframe: TotalVolumeTimeframe): TransactionsTrendCharts {
  const labels = TIMEFRAME_LABELS[timeframe];
  const metrics = transactionsMetricsByTimeframe[timeframe];
  return {
    netVolume: seededTrendSeries(labels, metrics.netVolume, `${timeframe}-net`),
    transactionCount: seededTrendSeries(labels, metrics.transactionCount, `${timeframe}-count`),
    successRate: seededTrendSeries(labels, metrics.successRate, `${timeframe}-success`),
    refundAmount: seededTrendSeries(labels, metrics.refundAmount, `${timeframe}-refund`),
    averageTicketSize: seededTrendSeries(labels, metrics.averageTicketSize, `${timeframe}-ticket`),
  };
}

export const transactionsTrendChartsByTimeframe: Record<TotalVolumeTimeframe, TransactionsTrendCharts> = {
  today: buildTrendCharts("today"),
  week: buildTrendCharts("week"),
  month: buildTrendCharts("month"),
  ytd: buildTrendCharts("ytd"),
};
