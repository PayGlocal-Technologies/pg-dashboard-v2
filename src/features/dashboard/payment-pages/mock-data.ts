import type { PaymentPageRow } from "@/features/dashboard/payment-pages/types";

// TODO(integration): this screen is mock data only. Wire it up to the real
// payment pages endpoints per the CLAUDE.md migration checklist before
// shipping — endpoint URL, request payload and response statuses must all be
// copied from pg-dashboard, not guessed.

export const paymentPageRows: PaymentPageRow[] = [
  {
    id: "pp_books",
    product: "Books",
    amount: null,
    currency: "INR",
    status: "LIVE",
    createdAt: "2026-07-02T12:00:00+05:30",
    link: "pay.payglocal.in/acme/books",
  },
  {
    id: "pp_consulting",
    product: "1:1 Consulting session",
    amount: 5000,
    currency: "USD",
    status: "LIVE",
    createdAt: "2026-07-18T12:00:00+05:30",
    link: "pay.payglocal.in/acme/1-1-consulting-session",
  },
  {
    id: "pp_support",
    product: "Support our work",
    amount: null,
    currency: "INR",
    status: "PAUSED",
    createdAt: "2026-08-01T12:00:00+05:30",
    link: "pay.payglocal.in/acme/support-our-work",
  },
  {
    id: "pp_workshop",
    product: "Design workshop ticket",
    amount: 1500,
    currency: "INR",
    status: "DRAFT",
    createdAt: "2026-08-08T12:00:00+05:30",
    link: "pay.payglocal.in/acme/design-workshop-ticket",
  },
];
