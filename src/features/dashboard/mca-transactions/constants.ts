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

// ── No FX rates or fee rates live here ───────────────────────────────────────
// A static MCA_FX_RATES_TO_INR table and an MCA_PROCESSING_FEE_RATE of 0.0075
// used to sit at this spot. Both were exported, neither had a single consumer,
// and both read as authoritative, which made them exactly the constants someone
// building an FX or fee surface would reach for. Deleted rather than left as a
// trap.
//
// Where these values actually come from:
//   conversion rate  the settlement timeline response's own `conversionRate`
//                    (see buildSettlementTimeline), which is the rate that was
//                    really applied to that transaction
//   live quote       GET /gcc/v3/merchants/{mid}/exchange-rates/{ccy}/{amount}
//                    (see multi-currency/services.ts), which also returns the
//                    PayGlocal fee amount, rate and type for that quote
//   fee terms        merchant configuration, not a constant. A hardcoded rate is
//                    a commercial term someone will be billed on.
//
// If a surface needs a blended realized rate over a period, that has no endpoint
// yet: it is the `fx-rate-realized` dashboard widget, on the backend list.

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
