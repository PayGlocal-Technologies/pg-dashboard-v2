import type { GuideStep } from "@/components/common/guide/types";

/** Storage id for the SKU management walkthrough. Bump the version suffix if
 *  the step changes enough to re-show returning users. */
export const SKU_GUIDE_KEY = "sku-management-v2";

/**
 * First-visit coach-mark for SKU management. `target` matches the `data-guide`
 * on the first product row's thumbnail cell (columns.tsx) / card (SkuCardList).
 * Copy carried over verbatim from the design annotation, including the
 * "Edit product → Add Image" hint.
 */
export const SKU_GUIDE_STEPS: GuideStep[] = [
  {
    target: "mca-sku-image",
    title: "Add images to your SKU",
    description:
      "Add images to your SKUs to easily identify your products and services. Edit product → + Add Image.",
    side: "bottom",
    align: "start",
  },
];
