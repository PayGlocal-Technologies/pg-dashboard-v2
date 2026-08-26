import type { FilterOption } from "@/types/transactions";
import type { CurrencyOption as CurrencyFilterOption } from "@/components/common/filters/FilterChips";

export const TRANSACTIONS_PAGE_LIMIT = 15;

// ── Segment value — mirrors pg-dashboard's product key ──────────────────────
export const SEGMENT_MCA = "GLOBAL_FUND_TRANSFER";

// ── MCA status filter options ─────────────────────────────────────────────────
// The exact set and labels pg-dashboard's MCA_TABLE_FILTERS offers. Both
// reversal statuses are listed separately (the server treats them as distinct
// values) even though the table's badge renders one label for both.
export const MCA_STATUS_FILTERS: FilterOption[] = [
  { value: "All", label: "All" },
  { value: "FUNDS_ON_HOLD", label: "Funds on Hold" },
  { value: "DOCUMENT_PENDING", label: "Invoice Pending" },
  { value: "SENT_FOR_REVIEW", label: "Sent for Review" },
  { value: "SENT_FOR_SETTLEMENT", label: "Sent for Settlement" },
  { value: "SETTLED", label: "Settled" },
  { value: "FIRC_SETTLED", label: "FIRC Settled" },
  { value: "REVERSAL_FOR_RISK_REJECTED", label: "Funds reversed" },
  { value: "REVERSAL_FOR_NOT_SUPPORTED", label: "Reversal - Not Supported" },
];

// ── MCA currency filter options ───────────────────────────────────────────────
// Mirrors pg-dashboard's MCA_CURRENCY_OPTIONS, which is what its MCA table
// filters on — a fixed five plus a catch-all, not the virtual-account list.
// "OTHER" is a real server-side value covering every currency outside the
// five, so it is a genuine option rather than a placeholder.
export const MCA_CURRENCY_FILTERS: CurrencyFilterOption[] = [
  { value: "USD", label: "USD", iso2: "US" },
  { value: "EUR", label: "EUR", iso2: "EU" },
  { value: "GBP", label: "GBP", iso2: "GB" },
  { value: "AUD", label: "AUD", iso2: "AU" },
  { value: "CAD", label: "CAD", iso2: "CA" },
  { value: "OTHER", label: "Others" },
];

// ── Invoice upload constraints (Upload Invoice modal) ────────────────────────
export const INVOICE_ACCEPTED_EXTENSIONS = [".pdf"] as const;
export const INVOICE_ACCEPTED_MIME_TYPES = ["application/pdf"] as const;
export const INVOICE_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ── FX rates to INR ──────────────────────────────────────────────────────────
// TODO: replace with a live FX rate feed once one exists — see CLAUDE.md, do
// not guess API contracts. These are illustrative static rates only, kept for
// surfaces still awaiting a real conversion source; anything driven by the
// settlement timeline reads that response's own conversionRate instead.
export const MCA_FX_RATES_TO_INR: Record<string, number> = {
  USD: 83.12,
  EUR: 90.45,
  GBP: 105.3,
  AUD: 54.2,
  CAD: 61.1,
  INR: 1,
};

export const MCA_PROCESSING_FEE_RATE = 0.0075; // 0.75% of the converted INR amount

// ── Country name map (ISO2 → display name, matches pg-dashboard) ─────────────
export const COUNTRY_NAME_MAP: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  EU: "European Union",
  AU: "Australia",
  CA: "Canada",
  SG: "Singapore",
  AE: "UAE",
  IN: "India",
  JP: "Japan",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  CH: "Switzerland",
  HK: "Hong Kong",
  NZ: "New Zealand",
};
