import type { CurrencyOption } from "@/components/common/filters/FilterChips";

/** Matches the tooltip styling already used by CopyableText across the app. */
export const TOOLTIP_CONTENT_CLASS =
  "rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]";

/**
 * Options for the Currency filter chip, shared by every MCA table that
 * offers one (Transactions, Links): the currencies MCA collects in, not
 * every currency countryCurrencyMap knows about, most of which have no MCA
 * account behind them and would only ever filter to an empty result.
 */
export const CURRENCY_FILTER_OPTIONS: CurrencyOption[] = [
  { value: "USD", label: "USD", iso2: "US" },
  { value: "GBP", label: "GBP", iso2: "GB" },
  { value: "EUR", label: "EUR", iso2: "EU" },
  { value: "AUD", label: "AUD", iso2: "AU" },
  { value: "CAD", label: "CAD", iso2: "CA" },
];
