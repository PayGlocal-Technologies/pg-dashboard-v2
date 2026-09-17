import type { FilterOption } from "@/types/transactions";

export const TRANSACTIONS_PAGE_LIMIT = 15;

// ── Segment value — mirrors pg-dashboard's product key ──────────────────────
export const SEGMENT_PA = "CARDS_UPI_NETBANKING";

// ── PA product flags (from merchantEnabledProducts.pgProducts) ──────────────
export const PA_PRODUCT_FLAGS = [
  "INTERNATIONAL_CARDS_AND_ALT_PAYS",
  "DOMESTIC_CARDS_UPI_AND_INB",
] as const;

// ── PA payment method pills, the multi-select "Payment method" filter chip
// (see PaTransactionTable) reads these too. The status segments/chip moved
// to PaTransactionTable itself (STATUS_SEGMENTS/STATUS_FILTER_OPTIONS) once
// the table switched to Dispute Management's SegmentedTabs +
// FilterChipGroup shape, rather than staying a bare list of pill buttons
// here. ──────────────────────────────────────────────────────────────────
export const PA_METHOD_FILTERS: FilterOption[] = [
  { value: "All", label: "All Methods" },
  { value: "CARDS", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "NETBANKING", label: "Net Banking" },
];
