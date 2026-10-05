import type { PaymentLinkRow } from "@/features/dashboard/payment-links/types";

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
