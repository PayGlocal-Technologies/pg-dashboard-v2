export interface FilterOption {
  value: string;
  label: string;
}

export const TRANSACTIONS_PAGE_LIMIT = 15;

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

// ── Status segmented control (coarse buckets shown below the toolbar) ───────
export const PA_STATUS_SEGMENTS = [
  { value: "All",      label: "All" },
  { value: "success",  label: "Success" },
  { value: "refunded", label: "Refunded" },
  { value: "failed",   label: "Failed" },
  { value: "disputed", label: "Disputes" },
] as const;

// ── PA currency options (for the Currency filter chip) ───────────────────────
export const PA_CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

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
