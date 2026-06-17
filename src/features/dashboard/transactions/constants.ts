export interface FilterOption {
  value: string;
  label: string;
}

export const TRANSACTIONS_PAGE_LIMIT = 15;

// ── Segment values — mirror pg-dashboard's product keys ────────────────────
export const SEGMENT_PA  = "CARDS_UPI_NETBANKING";
export const SEGMENT_MCA = "GLOBAL_FUND_TRANSFER";

// ── PA product flags (from merchantEnabledProducts.pgProducts) ──────────────
export const PA_PRODUCT_FLAGS = [
  "INTERNATIONAL_CARDS_AND_ALT_PAYS",
  "DOMESTIC_CARDS_UPI_AND_INB",
] as const;

// ── PA status pills shown in the filter bar ──────────────────────────────────
export const PA_STATUS_FILTERS: FilterOption[] = [
  { value: "All",              label: "All" },
  { value: "SUCCESS",          label: "Success" },
  { value: "INPROGRESS",       label: "In Progress" },
  { value: "SENT_FOR_CAPTURE", label: "Sent for capture" },
  { value: "ISSUER_DECLINE",   label: "Failed" },
];

// ── PA payment method pills ──────────────────────────────────────────────────
export const PA_METHOD_FILTERS: FilterOption[] = [
  { value: "All",        label: "All Methods" },
  { value: "CARDS",      label: "Card" },
  { value: "UPI",        label: "UPI" },
  { value: "NETBANKING", label: "Net Banking" },
];

// ── MCA status pills ──────────────────────────────────────────────────────────
export const MCA_STATUS_FILTERS: FilterOption[] = [
  { value: "All",              label: "All" },
  { value: "DOCUMENT_PENDING", label: "Invoice Pending" },
  { value: "SENT_FOR_REVIEW",  label: "In Review" },
  { value: "SETTLED",          label: "Settled" },
  { value: "FIRC_SETTLED",     label: "FIRC Settled" },
];

// ── MCA currency pills ────────────────────────────────────────────────────────
export const MCA_CURRENCY_FILTERS: FilterOption[] = [
  { value: "All", label: "All" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "AUD", label: "AUD" },
  { value: "CAD", label: "CAD" },
];

// ── Country name map (ISO2 → display name, matches pg-dashboard) ─────────────
export const COUNTRY_NAME_MAP: Record<string, string> = {
  US: "United States", GB: "United Kingdom", EU: "European Union",
  AU: "Australia",     CA: "Canada",         SG: "Singapore",
  AE: "UAE",           IN: "India",          JP: "Japan",
  DE: "Germany",       FR: "France",         NL: "Netherlands",
  CH: "Switzerland",   HK: "Hong Kong",      NZ: "New Zealand",
};
