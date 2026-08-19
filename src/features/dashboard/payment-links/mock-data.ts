import type { PaymentLinkRow, SparklinePoint } from "@/features/dashboard/payment-links/types";
import type { MetricsPeriod } from "@/features/dashboard/payment-links/components/PaymentLinksMetricsPeriodFilter";

// TODO(integration): this screen is mock data only. Wire it up to the real
// payment links endpoints per the CLAUDE.md migration checklist before
// shipping — endpoint URL, request payload and response statuses must all be
// copied from pg-dashboard's payment-links feature, not guessed.

export const paymentLinkRows: PaymentLinkRow[] = [
  {
    id: "pl_9f2a1c",
    amount: 116119.0,
    currency: "USD",
    status: "PAID",
    customerName: "Ariana Cole",
    customerDetails: "ariana.cole@example.com",
    customerPhone: "+1 415 555 0142",
    billingAddress: "482 Market Street, Suite 300, San Francisco, CA 94105, USA",
    paymentLinkUrl: "pay.pgcl.com/9f2a1c",
    paymentFor: "Invoice #4471",
    createdAt: "2026-08-01T10:15:00+05:30",
    expiresAt: "2026-08-03T10:15:00+05:30",
    notifyVia: ["Email"],
  },
  {
    id: "pl_7b3d4e",
    amount: 8250.0,
    currency: "USD",
    status: "ACTIVE",
    customerName: "Marcus Lee",
    customerDetails: "marcus.lee@example.com",
    customerPhone: "+1 628 555 0198",
    billingAddress: "120 Bay Street, Apt 4B, Oakland, CA 94612, USA",
    paymentLinkUrl: "pay.pgcl.com/7b3d4e",
    paymentFor: "Subscription renewal",
    createdAt: "2026-08-02T09:40:00+05:30",
    expiresAt: "2026-08-09T09:40:00+05:30",
    notifyVia: ["SMS", "Email"],
  },
  {
    id: "pl_2c9f81",
    amount: 4500.0,
    currency: "USD",
    status: "ACTIVE",
    customerName: "Priya Nair",
    customerDetails: "priya.nair@example.com",
    customerPhone: "+91 98765 43210",
    billingAddress: "14 Residency Road, Bengaluru, Karnataka 560025, India",
    paymentLinkUrl: "pay.pgcl.com/2c9f81",
    paymentFor: "Order deposit",
    createdAt: "2026-08-02T14:05:00+05:30",
    expiresAt: "2026-08-16T14:05:00+05:30",
    notifyVia: ["Email"],
  },
  {
    id: "pl_5a1e02",
    amount: 1999.0,
    currency: "USD",
    status: "EXPIRED",
    customerName: "Daniel Osei",
    customerDetails: "daniel.osei@example.com",
    customerPhone: "+44 20 7946 0958",
    billingAddress: "27 Baker Street, Marylebone, London W1U 8ED, United Kingdom",
    paymentLinkUrl: "pay.pgcl.com/5a1e02",
    paymentFor: "Consultation fee",
    createdAt: "2026-07-30T18:22:00+05:30",
    expiresAt: "2026-08-01T18:22:00+05:30",
    notifyVia: ["SMS"],
  },
];

export const paymentLinksSummary = {
  totalAmountCollectedTrendPct: 12.3,
};

/** Chart behind the "Total Amount Collected" metric card. */
export const totalAmountCollectedChart: SparklinePoint[] = [
  { x: "Mon", y: 62000 },
  { x: "Tue", y: 58000 },
  { x: "Wed", y: 71000 },
  { x: "Thu", y: 69500 },
  { x: "Fri", y: 84000 },
  { x: "Sat", y: 91000 },
  { x: "Sun", y: 116119 },
];

export const totalLinksChart: SparklinePoint[] = [
  { x: "Mon", y: 1 },
  { x: "Tue", y: 1 },
  { x: "Wed", y: 2 },
  { x: "Thu", y: 2 },
  { x: "Fri", y: 3 },
  { x: "Sat", y: 3 },
  { x: "Sun", y: 4 },
];

export const paidLinksChart: SparklinePoint[] = [
  { x: "Mon", y: 0 },
  { x: "Tue", y: 0 },
  { x: "Wed", y: 0 },
  { x: "Thu", y: 0 },
  { x: "Fri", y: 0 },
  { x: "Sat", y: 0 },
  { x: "Sun", y: 1 },
];

export const activeLinksChart: SparklinePoint[] = [
  { x: "Mon", y: 0 },
  { x: "Tue", y: 1 },
  { x: "Wed", y: 1 },
  { x: "Thu", y: 1 },
  { x: "Fri", y: 2 },
  { x: "Sat", y: 2 },
  { x: "Sun", y: 2 },
];

// ── Metrics-section time period snapshots ───────────────────────────────────
// The metrics header's period dropdown controls ONLY these four cards — it is
// intentionally decoupled from paymentLinkRows / the table's own filters.

export interface PaymentLinksMetricsSnapshot {
  totalAmountCollected: number;
  totalAmountTrendPct: number;
  totalAmountChart: SparklinePoint[];
  totalLinks: number;
  totalLinksLabel: string;
  totalLinksChart: SparklinePoint[];
  paidLinks: number;
  paidLinksLabel: string;
  paidLinksChart: SparklinePoint[];
  activeLinks: number;
  activeLinksLabel: string;
  activeLinksChart: SparklinePoint[];
}

export const paymentLinksMetricsByPeriod: Record<MetricsPeriod, PaymentLinksMetricsSnapshot> = {
  today: {
    totalAmountCollected: 18500,
    totalAmountTrendPct: 5.2,
    totalAmountChart: [
      { x: "9 AM", y: 0 },
      { x: "12 PM", y: 4200 },
      { x: "3 PM", y: 9800 },
      { x: "6 PM", y: 14100 },
      { x: "9 PM", y: 18500 },
    ],
    totalLinks: 1,
    totalLinksLabel: "+1 today",
    totalLinksChart: [
      { x: "9 AM", y: 0 },
      { x: "12 PM", y: 0 },
      { x: "3 PM", y: 1 },
      { x: "6 PM", y: 1 },
      { x: "9 PM", y: 1 },
    ],
    paidLinks: 0,
    paidLinksLabel: "+0 today",
    paidLinksChart: [
      { x: "9 AM", y: 0 },
      { x: "12 PM", y: 0 },
      { x: "3 PM", y: 0 },
      { x: "6 PM", y: 0 },
      { x: "9 PM", y: 0 },
    ],
    activeLinks: 1,
    activeLinksLabel: "+1 today",
    activeLinksChart: [
      { x: "9 AM", y: 0 },
      { x: "12 PM", y: 0 },
      { x: "3 PM", y: 1 },
      { x: "6 PM", y: 1 },
      { x: "9 PM", y: 1 },
    ],
  },
  last7: {
    totalAmountCollected: 116119,
    totalAmountTrendPct: paymentLinksSummary.totalAmountCollectedTrendPct,
    totalAmountChart: totalAmountCollectedChart,
    totalLinks: 4,
    totalLinksLabel: "+4 today",
    totalLinksChart,
    paidLinks: 1,
    paidLinksLabel: "+1 today",
    paidLinksChart,
    activeLinks: 2,
    activeLinksLabel: "+2 today",
    activeLinksChart,
  },
  last1month: {
    totalAmountCollected: 342780,
    totalAmountTrendPct: 18.7,
    totalAmountChart: [
      { x: "Week 1", y: 152000 },
      { x: "Week 2", y: 214000 },
      { x: "Week 3", y: 278500 },
      { x: "Week 4", y: 342780 },
    ],
    totalLinks: 15,
    totalLinksLabel: "+4 today",
    totalLinksChart: [
      { x: "Week 1", y: 4 },
      { x: "Week 2", y: 8 },
      { x: "Week 3", y: 11 },
      { x: "Week 4", y: 15 },
    ],
    paidLinks: 6,
    paidLinksLabel: "+1 today",
    paidLinksChart: [
      { x: "Week 1", y: 1 },
      { x: "Week 2", y: 2 },
      { x: "Week 3", y: 4 },
      { x: "Week 4", y: 6 },
    ],
    activeLinks: 5,
    activeLinksLabel: "+2 today",
    activeLinksChart: [
      { x: "Week 1", y: 1 },
      { x: "Week 2", y: 2 },
      { x: "Week 3", y: 3 },
      { x: "Week 4", y: 5 },
    ],
  },
  ytd: {
    totalAmountCollected: 1284650,
    totalAmountTrendPct: 34.1,
    totalAmountChart: [
      { x: "Jan", y: 98000 },
      { x: "Feb", y: 186000 },
      { x: "Mar", y: 295000 },
      { x: "Apr", y: 410000 },
      { x: "May", y: 560000 },
      { x: "Jun", y: 742000 },
      { x: "Jul", y: 980000 },
      { x: "Aug", y: 1284650 },
    ],
    totalLinks: 64,
    totalLinksLabel: "+4 today",
    totalLinksChart: [
      { x: "Jan", y: 6 },
      { x: "Feb", y: 13 },
      { x: "Mar", y: 21 },
      { x: "Apr", y: 29 },
      { x: "May", y: 38 },
      { x: "Jun", y: 47 },
      { x: "Jul", y: 56 },
      { x: "Aug", y: 64 },
    ],
    paidLinks: 28,
    paidLinksLabel: "+1 today",
    paidLinksChart: [
      { x: "Jan", y: 2 },
      { x: "Feb", y: 5 },
      { x: "Mar", y: 9 },
      { x: "Apr", y: 13 },
      { x: "May", y: 17 },
      { x: "Jun", y: 21 },
      { x: "Jul", y: 25 },
      { x: "Aug", y: 28 },
    ],
    activeLinks: 19,
    activeLinksLabel: "+2 today",
    activeLinksChart: [
      { x: "Jan", y: 1 },
      { x: "Feb", y: 4 },
      { x: "Mar", y: 7 },
      { x: "Apr", y: 9 },
      { x: "May", y: 12 },
      { x: "Jun", y: 14 },
      { x: "Jul", y: 17 },
      { x: "Aug", y: 19 },
    ],
  },
};
