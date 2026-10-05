import { parseApiDateTime } from "@/lib/utils/format";
import {
  MCA_TRANSACTIONS,
  PG_TRANSACTIONS,
} from "@/features/dashboard/transaction-overview/mock-data";
import type { PartnerTransaction } from "@/features/dashboard/transaction-overview/types";
import { MOCK_PORTFOLIO_MERCHANTS } from "@/features/dashboard/merchant-portfolio/mock-data";
import type {
  PeriodFigures,
  PortfolioMerchant,
  PortfolioPeriod,
  PortfolioTransaction,
  SettlementState,
} from "@/features/dashboard/merchant-portfolio/types";

/**
 * Everything the Merchant Portfolio screens show, derived in one place:
 * figures for a period, comparisons (only where a full previous period
 * exists), the portfolio summary, a volume trend, and each merchant's
 * transactions with settlement state and commission. MOCK throughout: see
 * mock-data.ts.
 */

/** The mock's "today": figures and series are fixed to it. Relative labels
 *  ("2 hrs ago") use the real clock, captured by the caller. */
const MOCK_TODAY = new Date("2026-10-05T12:00:00+05:30");

export const PERIOD_OPTIONS = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
] as const satisfies readonly { value: PortfolioPeriod; label: string }[];

const PERIOD_MONTHS: Record<Exclude<PortfolioPeriod, "custom">, number> = {
  month: 1,
  quarter: 3,
  year: 12,
};

/** How much bigger a longer period runs than a month, per figure (from the
 *  Partner Home's own month/quarter/year totals). */
const SCALE: Record<"quarter" | "year", PeriodFigures> = {
  quarter: { grossVolume: 2.64, transactions: 2.73, commission: 2.57 },
  year: { grossVolume: 8.26, transactions: 8.4, commission: 8.26 },
};

export interface DateRange {
  /** YYYY-MM-DD */
  from: string;
  to: string;
}

function monthsLive(m: PortfolioMerchant): number {
  const end = m.deactivatedOn ? new Date(m.deactivatedOn) : MOCK_TODAY;
  return Math.max(0, (end.getTime() - new Date(m.liveSince).getTime()) / (30.44 * 86_400_000));
}

function daysIn(range: DateRange): number {
  const ms = new Date(range.to).getTime() - new Date(range.from).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

/** A merchant's figures for a period. Longer periods scale from the month,
 *  capped by how long the merchant has been live. Deactivated merchants read
 *  their recorded history. */
export function figuresFor(
  m: PortfolioMerchant,
  period: PortfolioPeriod,
  custom?: DateRange
): PeriodFigures {
  if (m.history && period !== "custom") return m.history[period];
  if (period === "month") return m.month;
  if (period === "custom") {
    if (!custom || m.status === "DEACTIVATED")
      return { grossVolume: 0, transactions: 0, commission: 0 };
    const f = daysIn(custom) / 30;
    return scale(m.month, { grossVolume: f, transactions: f, commission: f });
  }
  const live = monthsLive(m);
  const s = SCALE[period];
  return scale(m.month, {
    grossVolume: Math.min(s.grossVolume, live),
    transactions: Math.min(s.transactions, live),
    commission: Math.min(s.commission, live),
  });
}

function scale(f: PeriodFigures, k: PeriodFigures): PeriodFigures {
  return {
    grossVolume: Math.round(f.grossVolume * k.grossVolume),
    transactions: Math.round(f.transactions * k.transactions),
    commission: Math.round(f.commission * k.commission),
  };
}

/** The deactivated merchant's whole history, else undefined. */
export function lifetimeFigures(m: PortfolioMerchant): PeriodFigures | undefined {
  return m.history?.lifetime;
}

/** % change against the previous equal period, only when the merchant was
 *  live for all of it; otherwise there is nothing fair to compare. */
export function changePctFor(m: PortfolioMerchant, period: PortfolioPeriod): number | undefined {
  if (period === "custom" || m.status !== "LIVE" || m.monthChangePct === undefined)
    return undefined;
  if (monthsLive(m) < PERIOD_MONTHS[period] * 2) return undefined;
  const k = period === "month" ? 1 : period === "quarter" ? 1.15 : 2.2;
  return Math.round(m.monthChangePct * k * 10) / 10;
}

export const COMPARISON_LABEL: Record<Exclude<PortfolioPeriod, "custom">, string> = {
  month: "vs last month",
  quarter: "vs previous 3 months",
  year: "vs last year",
};

export const PERIOD_CAPTION: Record<Exclude<PortfolioPeriod, "custom">, string> = {
  month: "This month",
  quarter: "Last 3 months",
  year: "This year",
};

export interface PortfolioSummary {
  liveMerchants: number;
  /** Merchants that went live during the period. */
  newlyLive: number;
  totals: PeriodFigures;
  /** % change per figure across merchants that have a comparison, or
   *  undefined when none do. */
  changePct: Partial<Record<keyof PeriodFigures, number>>;
}

export function summarise(
  merchants: PortfolioMerchant[],
  period: PortfolioPeriod,
  custom?: DateRange
): PortfolioSummary {
  const totals: PeriodFigures = { grossVolume: 0, transactions: 0, commission: 0 };
  const compared = { cur: { ...totals }, prev: { ...totals } };
  let anyCompared = false;
  for (const m of merchants) {
    const f = figuresFor(m, period, custom);
    (Object.keys(totals) as (keyof PeriodFigures)[]).forEach((k) => (totals[k] += f[k]));
    const pct = changePctFor(m, period);
    if (pct !== undefined) {
      anyCompared = true;
      (Object.keys(totals) as (keyof PeriodFigures)[]).forEach((k) => {
        compared.cur[k] += f[k];
        compared.prev[k] += f[k] / (1 + pct / 100);
      });
    }
  }
  const start = periodStart(period, custom);
  const changePct: PortfolioSummary["changePct"] = {};
  if (anyCompared) {
    (Object.keys(totals) as (keyof PeriodFigures)[]).forEach((k) => {
      if (compared.prev[k] > 0) {
        changePct[k] =
          Math.round(((compared.cur[k] - compared.prev[k]) / compared.prev[k]) * 1000) / 10;
      }
    });
  }
  return {
    liveMerchants: merchants.filter((m) => m.status === "LIVE").length,
    newlyLive: merchants.filter((m) => m.status === "LIVE" && new Date(m.liveSince) >= start)
      .length,
    totals,
    changePct,
  };
}

function periodStart(period: PortfolioPeriod, custom?: DateRange): Date {
  if (period === "custom") return custom ? new Date(custom.from) : MOCK_TODAY;
  const d = new Date(MOCK_TODAY);
  if (period === "month") return new Date(d.getFullYear(), d.getMonth(), 1);
  if (period === "quarter") return new Date(d.getFullYear(), d.getMonth() - 2, 1);
  return new Date(d.getFullYear(), 0, 1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A merchant's gross volume over the period, as chart points. A smooth,
 *  deterministic shape that ends where the merchant's growth says it should;
 *  zero after a deactivated merchant's last day. */
export function volumeTrend(
  m: PortfolioMerchant,
  period: Exclude<PortfolioPeriod, "custom">
): { x: string; y: number }[] {
  const labels =
    period === "month"
      ? ["1", "5", "10", "15", "20", "25", "30"]
      : period === "quarter"
        ? [
            MONTHS[(MOCK_TODAY.getMonth() + 10) % 12]!,
            MONTHS[(MOCK_TODAY.getMonth() + 11) % 12]!,
            MONTHS[MOCK_TODAY.getMonth()]!,
          ]
        : MONTHS.slice(0, MOCK_TODAY.getMonth() + 1);
  const total = figuresFor(m, period).grossVolume;
  const growth = (m.monthChangePct ?? 8) / 100;
  const raw = labels.map((_, i) => {
    const t = labels.length === 1 ? 1 : i / (labels.length - 1);
    return 1 + growth * t + 0.06 * Math.sin(i * 1.7 + m.merchantId.length);
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  const cutoff = m.deactivatedOn ? new Date(m.deactivatedOn).getMonth() : undefined;
  return labels.map((x, i) => {
    const off = period !== "month" && cutoff !== undefined && MONTHS.indexOf(x) > cutoff;
    return { x, y: off ? 0 : Math.round((total * raw[i]!) / sum) };
  });
}

// ── Transactions ─────────────────────────────────────────────────────────────

const CUSTOMERS = [
  "Arjun Mehta",
  "Sara Collins",
  "Omar Haddad",
  "Mei Lin Tan",
  "Rhea Kapoor",
  "Daniel Weber",
  "Aisha Rahman",
  "Lucas Moreau",
  "Nikhil Rao",
  "Emma Brooks",
];

const PG_SHAPES: Pick<
  PartnerTransaction,
  "paymentMethod" | "paymentInstrument" | "cardBrand" | "maskedCardNumber" | "currency" | "country"
>[] = [
  {
    paymentMethod: "CARD",
    paymentInstrument: "CARDS",
    cardBrand: "VISA",
    maskedCardNumber: "XXXXXXXXXXXX4242",
    currency: "INR",
    country: "IN",
  },
  { paymentMethod: "UPI", paymentInstrument: "ALTPAY_UPI_INTENT", currency: "INR", country: "IN" },
  {
    paymentMethod: "CARD",
    paymentInstrument: "CARDS",
    cardBrand: "MASTERCARD",
    maskedCardNumber: "XXXXXXXXXXXX1881",
    currency: "USD",
    country: "US",
  },
  {
    paymentMethod: "GOOGLE_PAY",
    paymentInstrument: "PAYMENT_ACCOUNT_GOOGLE_PAY",
    currency: "INR",
    country: "IN",
  },
  {
    paymentMethod: "CARD",
    paymentInstrument: "CARDS",
    cardBrand: "AMEX",
    maskedCardNumber: "XXXXXXXXXXX0005",
    currency: "GBP",
    country: "GB",
  },
];
const PG_STATUSES = [
  "SUCCESS",
  "SUCCESS",
  "INPROGRESS",
  "SUCCESS",
  "ISSUER_DECLINE",
  "SUCCESS",
  "AUTHORIZED",
  "SENT_FOR_REFUND",
];
const PG_AMOUNTS = [14330, 2499, 86500, 7240, 3100, 18750, 5400, 49999, 1520];

const MCA_SHAPES = [
  { currency: "USD", country: "US", paymentMethod: "ACH" },
  { currency: "EUR", country: "DE", paymentMethod: "SEPA" },
  { currency: "GBP", country: "GB", paymentMethod: "FPS" },
  { currency: "USD", country: "US", paymentMethod: "SWIFT" },
];
const MCA_STATUSES = [
  "SETTLED",
  "SENT_FOR_SETTLEMENT",
  "FIRC_SETTLED",
  "DOCUMENT_PENDING",
  "SETTLED",
  "SENT_FOR_REVIEW",
];
const MCA_AMOUNTS = [4200, 1250.75, 18900, 9875.4, 2310, 5600];

/** "DD/MM/YYYY HH:mm:ss" in IST, the format the transactions API sends. */
function apiTimestamp(ms: number): string {
  const d = new Date(ms + 5.5 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

const FX_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.2,
  EUR: 90.1,
  GBP: 105.4,
  AED: 22.65,
  CAD: 61.3,
  AUD: 55.2,
  SGD: 61.9,
};

/** Partner commission rates: of a captured gateway payment, and of a
 *  settled MCA remittance. MOCK, standing in for the deal's pricing. */
const RATE = { PG: 0.00875, MCA: 0.0025 };

function generated(m: PortfolioMerchant): PartnerTransaction[] {
  if (m.status === "DEACTIVATED" && !m.history?.lifetime.transactions) return [];
  const seed = Number(m.merchantId.slice(-2));
  const latest = new Date(m.lastTransactionAt).getTime();
  return Array.from({ length: 16 }, (_, i) => {
    const rail =
      m.products.includes("PA") && (!m.products.includes("MCA") || i % 3 !== 2) ? "PG" : "MCA";
    const customer = CUSTOMERS[(i + seed) % CUSTOMERS.length]!;
    const at = latest - i * (9 + (seed % 5)) * 3_600_000 - i * 17 * 60_000;
    const base = {
      id: `${rail === "PG" ? "gl_o-" : "gl_mca-"}${((seed * 131 + i) * 7919 + 15485863).toString(16)}demo`,
      merchantId: m.merchantId,
      customerName: customer,
      email: `${customer.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      createdAt: apiTimestamp(at),
    };
    if (rail === "PG") {
      return {
        ...base,
        rail,
        ...PG_SHAPES[(i + seed) % PG_SHAPES.length]!,
        amount: PG_AMOUNTS[(i + seed) % PG_AMOUNTS.length]!,
        status: PG_STATUSES[(i + seed) % PG_STATUSES.length]!,
      };
    }
    return {
      ...base,
      rail,
      ...MCA_SHAPES[(i + seed) % MCA_SHAPES.length]!,
      amount: MCA_AMOUNTS[(i + seed) % MCA_AMOUNTS.length]!,
      status: MCA_STATUSES[(i + seed) % MCA_STATUSES.length]!,
      settlementDate: apiTimestamp(at + 2 * 86_400_000),
    };
  });
}

/** Payment status ≠ settlement status: a successful payment can still be on
 *  its way. Gateway payments settle T+1; MCA follows its own statuses. */
function settlementOf(t: PartnerTransaction, nowMs: number): SettlementState | undefined {
  if (t.rail === "MCA") {
    if (t.status === "SETTLED" || t.status === "FIRC_SETTLED") return "SETTLED";
    if (t.status === "SENT_FOR_SETTLEMENT") return "PROCESSING";
    return "PENDING";
  }
  if (t.status === "AUTHORIZED" || t.status === "INPROGRESS") return "PENDING";
  if (t.status !== "SUCCESS") return undefined;
  const at = parseApiDateTime(t.createdAt)?.getTime() ?? 0;
  return nowMs - at > 86_400_000 ? "SETTLED" : "PROCESSING";
}

function commissionOf(t: PartnerTransaction, settlement?: SettlementState): number | undefined {
  const earns = t.rail === "PG" ? t.status === "SUCCESS" : settlement === "SETTLED";
  if (!earns) return undefined;
  return Math.round(t.amount * (FX_TO_INR[t.currency] ?? 1) * RATE[t.rail] * 100) / 100;
}

/** A merchant's transactions, newest first: the Transaction Overview's own
 *  rows for this merchant (so the two pages agree), then more of the same. */
export function merchantTransactions(m: PortfolioMerchant, nowMs: number): PortfolioTransaction[] {
  const own = [...PG_TRANSACTIONS, ...MCA_TRANSACTIONS].filter(
    (t) => t.merchantId === m.merchantId
  );
  const rows = [...own, ...generated(m)].filter((t) =>
    t.rail === "PG" ? m.products.includes("PA") : m.products.includes("MCA")
  );
  return rows
    .map((t) => {
      const settlement = settlementOf(t, nowMs);
      return { ...t, settlement, commission: commissionOf(t, settlement) };
    })
    .sort(
      (a, b) =>
        (parseApiDateTime(b.createdAt)?.getTime() ?? 0) -
        (parseApiDateTime(a.createdAt)?.getTime() ?? 0)
    );
}

export const SETTLEMENT_META: Record<
  SettlementState,
  { label: string; variant: "success" | "info" | "warning"; trailIcon?: "check" | "clock" }
> = {
  SETTLED: { label: "Settled", variant: "success", trailIcon: "check" },
  PROCESSING: { label: "Processing", variant: "info", trailIcon: "clock" },
  PENDING: { label: "Pending", variant: "warning" },
};

// ── Lookups and formatting ───────────────────────────────────────────────────

export function portfolioMerchantById(merchantId: string): PortfolioMerchant | undefined {
  return MOCK_PORTFOLIO_MERCHANTS.find((m) => m.merchantId === merchantId);
}

export function portfolioMerchantByOnboardingId(
  onboardingId: string
): PortfolioMerchant | undefined {
  return MOCK_PORTFOLIO_MERCHANTS.find((m) => m.onboardingId === onboardingId);
}

export const portfolioPath = (merchantId: string, tab?: "overview" | "transactions") =>
  `/merchant-portfolio/${encodeURIComponent(merchantId)}${tab ? `?tab=${tab}` : ""}`;

export const PRODUCT_SHORT: Record<string, string> = { PA: "PA", MCA: "MCA" };
export const PRODUCT_LABEL: Record<string, string> = { PA: "Payment Gateway", MCA: "MCA" };

/** "2 hrs ago", "Today", "Yesterday", "3 days ago", else the date. */
export function formatAgo(iso: string, nowMs: number): string {
  const diff = nowMs - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (diff >= 0 && hours < 1) return "Just now";
  if (diff >= 0 && hours < 12) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const day = (ms: number) => Math.floor((ms + 5.5 * 3_600_000) / 86_400_000);
  const days = day(nowMs) - day(new Date(iso).getTime());
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

export function formatDate(isoOrKey: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(isoOrKey));
}
