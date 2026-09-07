import type { Receipt } from "@/features/dashboard/mca-receipts/types";

/**
 * Placeholder receipts, one set covering all three products.
 *
 * Every value here is dummy data — there is no receipts endpoint yet, so this
 * stands in for the API response. Replace this module with the real query once
 * the endpoint exists: the shape is deliberately what the table already
 * consumes, so wiring the backend up means swapping the source, not touching the
 * UI. See CLAUDE.md — do not guess an API contract; confirm the real field names
 * against pg-dashboard before mapping onto Receipt.
 *
 * Invoice numbers and IDs are made-up strings, not real merchant, invoice or
 * transaction identifiers. Periods are fixed "YYYY-MM" literals rather than
 * derived from `new Date()`, so rendering stays pure and server/client markup
 * can't drift (see CLAUDE.md's purity rules).
 *
 * **Exactly one row per product per month.** That is the invariant the whole
 * page rests on: a receipt *is* a month of activity for one product, so a month
 * cannot hold two of them and the Download action can address a receipt by
 * product and month alone (see Receipt's own note). Fraud screening starts in
 * January 2026 — the service was taken on later than the other two — which is
 * why its run is shorter, not because a month is missing.
 *
 * Every amount is INR: these are PayGlocal's own tax invoices for the fees
 * charged on a month's activity, billed to an Indian merchant, which is what
 * makes them usable for GST input credit (the page's own subtitle). The currency
 * a collection arrived in doesn't survive into the receipt.
 *
 * Rows are newest first, the order the table renders them in.
 */
export const MOCK_RECEIPTS: Receipt[] = [
  // ── Multi-currency accounts: one receipt a month ──────────────────────────
  {
    gid: "receipt-mca-0001",
    product: "MCA",
    invoiceNumber: "INV-2026-08-0512",
    invoiceId: "b7f4c21ae93d",
    periodMonth: "2026-08",
    amount: "486250.00",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0002",
    product: "MCA",
    invoiceNumber: "INV-2026-07-0483",
    invoiceId: "9f2e7d05c8b1",
    periodMonth: "2026-07",
    amount: "452180.75",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0003",
    product: "MCA",
    invoiceNumber: "INV-2026-06-0454",
    invoiceId: "16de8b47c0f9",
    periodMonth: "2026-06",
    amount: "471905.00",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0004",
    product: "MCA",
    invoiceNumber: "INV-2026-05-0425",
    invoiceId: "20b6ad91ce74",
    periodMonth: "2026-05",
    amount: "398640.50",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0005",
    product: "MCA",
    invoiceNumber: "INV-2026-04-0396",
    invoiceId: "4c8e10fb7d25",
    periodMonth: "2026-04",
    amount: "415370.00",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0006",
    product: "MCA",
    invoiceNumber: "INV-2026-03-0367",
    invoiceId: "e91a53d0f6b8",
    periodMonth: "2026-03",
    amount: "523815.25",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0007",
    product: "MCA",
    invoiceNumber: "INV-2026-02-0338",
    invoiceId: "7b04ce8a12df",
    periodMonth: "2026-02",
    amount: "361490.00",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0008",
    product: "MCA",
    invoiceNumber: "INV-2026-01-0309",
    invoiceId: "a5d8720fb31c",
    periodMonth: "2026-01",
    amount: "389075.50",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0009",
    product: "MCA",
    invoiceNumber: "INV-2025-12-0280",
    invoiceId: "3e6c94a08bd7",
    periodMonth: "2025-12",
    amount: "604320.00",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0010",
    product: "MCA",
    invoiceNumber: "INV-2025-11-0251",
    invoiceId: "c208f5b71ea4",
    periodMonth: "2025-11",
    amount: "512760.25",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0011",
    product: "MCA",
    invoiceNumber: "INV-2025-10-0222",
    invoiceId: "84fb3d1c05e9",
    periodMonth: "2025-10",
    amount: "447190.00",
    currency: "INR",
  },
  {
    gid: "receipt-mca-0012",
    product: "MCA",
    invoiceNumber: "INV-2025-09-0193",
    invoiceId: "52a7be09d4c6",
    periodMonth: "2025-09",
    amount: "468530.75",
    currency: "INR",
  },

  // ── Payment aggregator: one receipt a month ───────────────────────────────
  {
    gid: "receipt-pa-0001",
    product: "PA",
    invoiceNumber: "INV-2026-08-0511",
    invoiceId: "c92a4f17be03",
    periodMonth: "2026-08",
    amount: "842750.00",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0002",
    product: "PA",
    invoiceNumber: "INV-2026-07-0482",
    invoiceId: "31f70e5da8b6",
    periodMonth: "2026-07",
    amount: "791340.50",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0003",
    product: "PA",
    invoiceNumber: "INV-2026-06-0453",
    invoiceId: "ae64c3097f21",
    periodMonth: "2026-06",
    amount: "823615.00",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0004",
    product: "PA",
    invoiceNumber: "INV-2026-05-0424",
    invoiceId: "6b18d5f2a04e",
    periodMonth: "2026-05",
    amount: "674180.75",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0005",
    product: "PA",
    invoiceNumber: "INV-2026-04-0395",
    invoiceId: "d0537ea9c1b8",
    periodMonth: "2026-04",
    amount: "710542.00",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0006",
    product: "PA",
    invoiceNumber: "INV-2026-03-0366",
    invoiceId: "4fc9b60128da",
    periodMonth: "2026-03",
    amount: "928407.50",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0007",
    product: "PA",
    invoiceNumber: "INV-2026-02-0337",
    invoiceId: "72e1a4db390f",
    periodMonth: "2026-02",
    amount: "583691.25",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0008",
    product: "PA",
    invoiceNumber: "INV-2026-01-0308",
    invoiceId: "b58f0c3e7412",
    periodMonth: "2026-01",
    amount: "641277.00",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0009",
    product: "PA",
    invoiceNumber: "INV-2025-12-0279",
    invoiceId: "0d76b829fa15",
    periodMonth: "2025-12",
    amount: "1023864.00",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0010",
    product: "PA",
    invoiceNumber: "INV-2025-11-0250",
    invoiceId: "97c40be51d3a",
    periodMonth: "2025-11",
    amount: "890123.50",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0011",
    product: "PA",
    invoiceNumber: "INV-2025-10-0221",
    invoiceId: "e5b192a7c608",
    periodMonth: "2025-10",
    amount: "765430.00",
    currency: "INR",
  },
  {
    gid: "receipt-pa-0012",
    product: "PA",
    invoiceNumber: "INV-2025-09-0192",
    invoiceId: "1a83fd4e2670",
    periodMonth: "2025-09",
    amount: "812905.25",
    currency: "INR",
  },

  // ── Fraud screening: one receipt a month, from January 2026 ───────────────
  {
    gid: "receipt-frm-0001",
    product: "FRAUD",
    invoiceNumber: "INV-2026-08-0510",
    invoiceId: "e83b1a67d520",
    periodMonth: "2026-08",
    amount: "128450.00",
    currency: "INR",
  },
  {
    gid: "receipt-frm-0002",
    product: "FRAUD",
    invoiceNumber: "INV-2026-07-0481",
    invoiceId: "1c5f9028ed67",
    periodMonth: "2026-07",
    amount: "124380.00",
    currency: "INR",
  },
  {
    gid: "receipt-frm-0003",
    product: "FRAUD",
    invoiceNumber: "INV-2026-06-0452",
    invoiceId: "a70e63d4915f",
    periodMonth: "2026-06",
    amount: "131720.00",
    currency: "INR",
  },
  {
    gid: "receipt-frm-0004",
    product: "FRAUD",
    invoiceNumber: "INV-2026-05-0423",
    invoiceId: "38ba17f04c9d",
    periodMonth: "2026-05",
    amount: "118960.00",
    currency: "INR",
  },
  {
    gid: "receipt-frm-0005",
    product: "FRAUD",
    invoiceNumber: "INV-2026-04-0394",
    invoiceId: "cf2649b08e1a",
    periodMonth: "2026-04",
    amount: "122540.00",
    currency: "INR",
  },
  {
    gid: "receipt-frm-0006",
    product: "FRAUD",
    invoiceNumber: "INV-2026-03-0365",
    invoiceId: "5d907c31fb42",
    periodMonth: "2026-03",
    amount: "139815.00",
    currency: "INR",
  },
  {
    gid: "receipt-frm-0007",
    product: "FRAUD",
    invoiceNumber: "INV-2026-02-0336",
    invoiceId: "82e4f0a5619c",
    periodMonth: "2026-02",
    amount: "109275.00",
    currency: "INR",
  },
  {
    gid: "receipt-frm-0008",
    product: "FRAUD",
    invoiceNumber: "INV-2026-01-0307",
    invoiceId: "4a1cd76eb038",
    periodMonth: "2026-01",
    amount: "115630.00",
    currency: "INR",
  },
];
