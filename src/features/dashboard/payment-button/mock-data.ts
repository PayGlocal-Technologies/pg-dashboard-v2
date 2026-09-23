import type { PaymentButton } from "@/features/dashboard/payment-button/types";

/**
 * Stand-in rows until the list endpoint returns what the design shows. The
 * real `/search/wqr` response carries id, status and timestamps only — no
 * amount, payment count or revenue — so the table runs on these for now.
 */
export const MOCK_PAYMENT_BUTTONS: PaymentButton[] = [
  {
    gid: "pb-1",
    mid: "<MERCHANT_ID>",
    buttonId: "pl_TOIAYILU",
    title: "Annual membership",
    label: "Pay Now",
    amountType: "FIXED",
    amount: "5000",
    currency: "INR",
    status: "ACTIVE",
    successfulPayments: 102,
    revenue: "30000",
    createdAt: "2026-07-20T16:57:00+05:30",
  },
  {
    gid: "pb-2",
    mid: "<MERCHANT_ID>",
    buttonId: "pl_QXZ81FnK",
    title: "Donations",
    label: "Donate",
    amountType: "CUSTOMER_DECIDES",
    amount: null,
    currency: "INR",
    status: "ACTIVE",
    successfulPayments: 12,
    revenue: "1200",
    createdAt: "2026-08-02T11:24:00+05:30",
  },
  {
    gid: "pb-3",
    mid: "<MERCHANT_ID>",
    buttonId: "pl_9mVebGty",
    title: "Workshop ticket",
    label: "Book Now",
    amountType: "FIXED",
    amount: "1500",
    currency: "CAD",
    status: "DRAFT",
    successfulPayments: null,
    revenue: null,
    createdAt: "2026-08-09T09:12:00+05:30",
  },
  {
    gid: "pb-4",
    mid: "<MERCHANT_ID>",
    buttonId: "pl_Hk2LwQ7s",
    title: "Consultation fee",
    label: "Pay Now",
    amountType: "FIXED",
    amount: "250",
    currency: "USD",
    status: "DISABLED",
    successfulPayments: 41,
    revenue: "10250",
    createdAt: "2026-06-14T18:03:00+05:30",
  },
];
