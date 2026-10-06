import type { FilterOption } from "@/types/transactions";

export const TRANSACTIONS_PAGE_LIMIT = 15;

// ── Segment value — mirrors pg-dashboard's product key ──────────────────────
export const SEGMENT_PA = "CARDS_UPI_NETBANKING";

// ── PA product flags (from merchantEnabledProducts.pgProducts) ──────────────
export const PA_PRODUCT_FLAGS = [
  "INTERNATIONAL_CARDS_AND_ALT_PAYS",
  "DOMESTIC_CARDS_UPI_AND_INB",
] as const;

// ── PA status pills shown in the filter bar ──────────────────────────────────
export const PA_STATUS_FILTERS: FilterOption[] = [
  { value: "All", label: "All" },
  { value: "SUCCESS", label: "Success" },
  { value: "INPROGRESS", label: "In Progress" },
  { value: "SENT_FOR_CAPTURE", label: "Sent for capture" },
  { value: "ISSUER_DECLINE", label: "Failed" },
];

// ── PA payment method pills ──────────────────────────────────────────────────
export const PA_METHOD_FILTERS: FilterOption[] = [
  { value: "All", label: "All Methods" },
  { value: "CARDS", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "NETBANKING", label: "Net Banking" },
];

// ── Payment status filter options (externalStatus codes) ────────────────────
// The product's list for this table. Labels match the status chips in the
// table (columns.tsx's PA_STATUS_META).
export const PA_PAYMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: "SENT_FOR_CAPTURE", label: "Sent for capture" },
  { value: "ISSUER_DECLINE", label: "Issuer decline" },
  { value: "GENERAL_DECLINE", label: "General decline" },
  { value: "SENT_FOR_REFUND", label: "Sent for refund" },
  { value: "CUSTOMER_CANCELLED", label: "Customer cancelled" },
  { value: "AUTHENTICATION_TIMEOUT", label: "Authentication timeout" },
  { value: "SYSTEM_ERROR", label: "System error" },
  { value: "REQUEST_ERROR", label: "Request error" },
  { value: "INPROGRESS", label: "In progress" },
  { value: "AUTHORIZED", label: "Authorised" },
  { value: "REVERSED", label: "Reversed" },
  { value: "CONFIG_ERROR", label: "Config error" },
];

// ── Table view tabs → the payment statuses each one filters to ─────────────
// Shortcuts onto the Status chip, built from the list above. That list has no
// plain SUCCESS, so Success is the captured state. No Disputed tab: disputes
// are not shown on this page.
export const PA_VIEW_TABS = [
  { value: "all", label: "All", statuses: [] as string[] },
  { value: "success", label: "Success", statuses: ["SENT_FOR_CAPTURE"] },
  { value: "refunded", label: "Refunded", statuses: ["SENT_FOR_REFUND"] },
  {
    value: "failed",
    label: "Failed",
    statuses: [
      "ISSUER_DECLINE",
      "GENERAL_DECLINE",
      "CUSTOMER_CANCELLED",
      "AUTHENTICATION_TIMEOUT",
      "SYSTEM_ERROR",
      "REQUEST_ERROR",
      "CONFIG_ERROR",
    ],
  },
] as const;

// ── Order status filter options ────────────────────────────────────────────
export const PA_ORDER_STATUS_OPTIONS: FilterOption[] = [
  { value: "AUTHORIZED", label: "Authorised" },
  { value: "REVERSED", label: "Reversed" },
  { value: "CAPTURED", label: "Captured" },
];

// ── Payment method chip options (the production method codes) ───────────────
export const PA_METHOD_CHIP_OPTIONS: FilterOption[] = PA_METHOD_FILTERS.filter(
  (o) => o.value !== "All"
);

// ── Currency chip options, flagged by country. MOCK list: the currencies a
// PA merchant is assumed to take; confirm against pg-dashboard.
export const PA_CURRENCY_OPTIONS = [
  { value: "INR", label: "INR", iso2: "IN" },
  { value: "USD", label: "USD", iso2: "US" },
  { value: "EUR", label: "EUR", iso2: "EU" },
  { value: "GBP", label: "GBP", iso2: "GB" },
  { value: "AUD", label: "AUD", iso2: "AU" },
  { value: "CAD", label: "CAD", iso2: "CA" },
  { value: "SGD", label: "SGD", iso2: "SG" },
  { value: "AED", label: "AED", iso2: "AE" },
];
