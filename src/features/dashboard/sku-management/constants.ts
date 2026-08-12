import type { SkuCurrency, SkuProductType } from "@/features/dashboard/sku-management/types";

/** Rows per page — matches TRANSACTIONS_PAGE_LIMIT so both tables page alike. */
export const SKU_PAGE_LIMIT = 10;

/**
 * Runtime list of the SkuCurrency union — the same seven the merchant holds
 * local receiving accounts for (see MOCK_VIRTUAL_ACCOUNTS in
 * multi-currency/mock-data.ts). Typed as SkuCurrency[] so adding a code here
 * that isn't in the union is a compile error, not a silent divergence.
 */
export const SKU_CURRENCIES: readonly SkuCurrency[] = [
  "USD",
  "GBP",
  "EUR",
  "CAD",
  "AED",
  "AUD",
  "SGD",
];

/**
 * Locale used to group the digits in both price columns. Fixed to en-US
 * (not the formatCurrency default of en-IN) since none of SKU_CURRENCIES is
 * INR: these should read 1,850.00, never the 1,85,0.00 lakh grouping.
 */
export const SKU_PRICE_LOCALE = "en-US";

export const SKU_VIEW_TABS = [
  { value: "all", label: "All" },
  { value: "goods", label: "Goods" },
  { value: "services", label: "Services" },
] as const;

export type SkuViewTab = (typeof SKU_VIEW_TABS)[number]["value"];

/** Which product type each non-"All" tab narrows to. */
export const SKU_TAB_TYPE: Record<Exclude<SkuViewTab, "all">, SkuProductType> = {
  goods: "GOODS",
  services: "SERVICES",
};

export const SKU_TYPE_LABEL: Record<SkuProductType, string> = {
  GOODS: "Goods",
  SERVICES: "Services",
};

/**
 * The hints the search box cycles through, exactly as the Transactions page
 * cycles remitter/transaction ID/UTR: each one names a field the query is
 * matched against, and the query hits any of them (see SkuTable's filter).
 * Rendered as "Search by " + hint, so these are lowercase phrases except
 * HSN/SAC, which is an initialism.
 */
export const SKU_SEARCH_HINTS = ["product name", "HSN/SAC"];
