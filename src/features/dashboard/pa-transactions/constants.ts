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
