import type { PartnerTransaction } from "@/features/dashboard/transaction-overview/types";

/**
 * DESIGN MOCK rows for the partner Transaction Overview. Fictional merchants,
 * customers and IDs throughout: merchant IDs are DEMO- placeholders, emails
 * use example.com, card numbers are last-4 only. Built deterministically (no
 * Math.random / Date.now) so every render and reload shows the same rows.
 *
 * TODO(integration): replace with the partner transaction search once its
 * endpoint and payload are confirmed against pg-dashboard.
 */

const MERCHANTS = ["DEMO-MID-1001", "DEMO-MID-1002", "DEMO-MID-1003", "DEMO-MID-1004"];

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

function emailFor(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
}

/** Latest row's time; each older row steps back ~21 hours. */
const LATEST = new Date(2026, 8, 27, 18, 42, 10);
const STEP_MS = 21 * 60 * 60 * 1000 + 7 * 60 * 1000;

function timestampAt(index: number) {
  const d = new Date(LATEST.getTime() - index * STEP_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function idFor(prefix: string, index: number) {
  return `${prefix}${((index + 1) * 7919 + 104729).toString(16)}demo`;
}

// ── Payment Gateway ──────────────────────────────────────────────────────────

const PG_METHODS: Pick<
  PartnerTransaction,
  "paymentMethod" | "paymentInstrument" | "cardBrand" | "maskedCardNumber"
>[] = [
  {
    paymentMethod: "CARD",
    paymentInstrument: "CARDS",
    cardBrand: "VISA",
    maskedCardNumber: "XXXXXXXXXXXX4242",
  },
  { paymentMethod: "UPI", paymentInstrument: "ALTPAY_UPI_INTENT" },
  {
    paymentMethod: "CARD",
    paymentInstrument: "CARDS",
    cardBrand: "MASTERCARD",
    maskedCardNumber: "XXXXXXXXXXXX1881",
  },
  { paymentMethod: "GOOGLE_PAY", paymentInstrument: "PAYMENT_ACCOUNT_GOOGLE_PAY" },
  {
    paymentMethod: "CARD",
    paymentInstrument: "CARDS",
    cardBrand: "AMEX",
    maskedCardNumber: "XXXXXXXXXXX0005",
  },
  { paymentMethod: "APPLE_PAY", paymentInstrument: "PAYMENT_ACCOUNT_APPLE_PAY" },
];

const PG_STATUSES = [
  "SUCCESS",
  "SUCCESS",
  "INPROGRESS",
  "SUCCESS",
  "ISSUER_DECLINE",
  "SENT_FOR_REFUND",
  "SUCCESS",
  "AUTHORIZED",
];

/** Domestic payments in INR; every fourth is an international card in its own currency. */
const PG_MARKETS = [
  { currency: "INR", country: "IN" },
  { currency: "INR", country: "IN" },
  { currency: "INR", country: "IN" },
  { currency: "USD", country: "US" },
  { currency: "INR", country: "IN" },
  { currency: "GBP", country: "GB" },
  { currency: "INR", country: "IN" },
  { currency: "AED", country: "AE" },
];

const PG_AMOUNTS = [
  14330, 2499, 86500, 129.99, 7240, 845.5, 3100, 1520, 49999, 612.25, 18750, 5400,
];

export const PG_TRANSACTIONS: PartnerTransaction[] = Array.from({ length: 28 }, (_, i) => {
  const market = PG_MARKETS[i % PG_MARKETS.length];
  const customer = CUSTOMERS[i % CUSTOMERS.length];
  return {
    id: idFor("gl_o-", i),
    rail: "PG",
    merchantId: MERCHANTS[i % MERCHANTS.length],
    amount: PG_AMOUNTS[i % PG_AMOUNTS.length],
    currency: market.currency,
    status: PG_STATUSES[i % PG_STATUSES.length],
    ...PG_METHODS[i % PG_METHODS.length],
    customerName: customer,
    email: emailFor(customer),
    country: market.country,
    createdAt: timestampAt(i),
  };
});

// ── Multi-Currency Accounts ──────────────────────────────────────────────────

const MCA_STATUSES = [
  "DOCUMENT_PENDING",
  "SETTLED",
  "SENT_FOR_REVIEW",
  "FIRC_SETTLED",
  "SENT_FOR_SETTLEMENT",
  "SETTLED",
  "FUNDS_ON_HOLD",
  "FIRC_SETTLED",
];

/** Each rail's method follows from where the money came from. Currencies
 *  cover the MCA Currency filter's five plus one "Others" (SGD). */
const MCA_MARKETS = [
  { currency: "USD", country: "US", paymentMethod: "ACH" },
  { currency: "EUR", country: "DE", paymentMethod: "SEPA" },
  { currency: "GBP", country: "GB", paymentMethod: "FPS" },
  { currency: "CAD", country: "CA", paymentMethod: "SWIFT" },
  { currency: "AUD", country: "AU", paymentMethod: "SWIFT" },
  { currency: "USD", country: "US", paymentMethod: "SWIFT" },
  { currency: "SGD", country: "SG", paymentMethod: "SWIFT" },
];

const MCA_AMOUNTS = [4200, 1250.75, 18900, 640, 9875.4, 2310, 27500, 815.2, 5600];

export const MCA_TRANSACTIONS: PartnerTransaction[] = Array.from({ length: 22 }, (_, i) => {
  const market = MCA_MARKETS[i % MCA_MARKETS.length];
  const customer = CUSTOMERS[(i + 3) % CUSTOMERS.length];
  return {
    id: idFor("gl_mca-", i),
    rail: "MCA",
    merchantId: MERCHANTS[(i + 1) % MERCHANTS.length],
    amount: MCA_AMOUNTS[i % MCA_AMOUNTS.length],
    currency: market.currency,
    status: MCA_STATUSES[i % MCA_STATUSES.length],
    paymentMethod: market.paymentMethod,
    customerName: customer,
    email: emailFor(customer),
    country: market.country,
    createdAt: timestampAt(i + 1),
    // Expected (or actual) settlement, a couple of days after the payment.
    settlementDate: timestampAt(i - 2),
  };
});
