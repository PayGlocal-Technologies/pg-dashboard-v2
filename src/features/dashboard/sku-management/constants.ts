import type { SkuProductType } from "@/features/dashboard/sku-management/types";

/** Rows per page — matches TRANSACTIONS_PAGE_LIMIT so both tables page alike. */
export const SKU_PAGE_LIMIT = 10;

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
