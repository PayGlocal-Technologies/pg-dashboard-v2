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

/** Type choices in the item form, in the order the select lists them. */
export const SKU_TYPE_OPTIONS: { value: SkuProductType; label: string }[] = [
  { value: "GOODS", label: SKU_TYPE_LABEL.GOODS },
  { value: "SERVICES", label: SKU_TYPE_LABEL.SERVICES },
];

/**
 * The tax-code scheme each product type files under. Goods carry an HSN code
 * and services a SAC code — one column in the table either way, but the form
 * names the one that actually applies once a type is chosen.
 */
export const SKU_TAX_CODE: Record<SkuProductType, { label: string; placeholder: string }> = {
  GOODS: { label: "HSN", placeholder: "e.g. 85183000" },
  SERVICES: { label: "SAC", placeholder: "e.g. 998311" },
};

/** Shown before a type is picked, and as the table's column header. */
export const SKU_TAX_CODE_FALLBACK = { label: "HSN / SAC", placeholder: "e.g. 998311" };

/** Currency choices, each labelled with the country the merchant's receiving
 *  account for it sits in. Derived from SKU_CURRENCIES' union, so the two
 *  can't drift. */
export const SKU_CURRENCY_OPTIONS: { value: SkuCurrency; country: string }[] = [
  { value: "USD", country: "United States" },
  { value: "GBP", country: "United Kingdom" },
  { value: "EUR", country: "Europe" },
  { value: "CAD", country: "Canada" },
  { value: "AED", country: "United Arab Emirates" },
  { value: "AUD", country: "Australia" },
  { value: "SGD", country: "Singapore" },
];

/** Images allowed per item — enough for a small gallery, few enough that the
 *  preview strip never becomes the tallest thing in the modal. */
export const SKU_MAX_IMAGES = 6;

export const SKU_IMAGE_ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
] as const;

export const SKU_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * The hints the search box cycles through, exactly as the Transactions page
 * cycles remitter/transaction ID/UTR: each one names a field the query is
 * matched against, and the query hits any of them (see SkuTable's filter).
 * Rendered as "Search by " + hint, so these are lowercase phrases except
 * HSN/SAC, which is an initialism.
 */
export const SKU_SEARCH_HINTS = ["product name", "HSN/SAC"];
