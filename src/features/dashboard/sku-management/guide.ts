import type { GuideStep } from "@/components/common/guide/types";

/** Storage id for the SKU management walkthrough. Bump the version suffix if
 *  the step changes enough to re-show returning users. */
export const SKU_GUIDE_KEY = "sku-management-v2";

/**
 * First-visit coach-mark for SKU management. `target` matches the `data-guide`
 * on the first product row's thumbnail cell (columns.tsx) / card (SkuCardList).
 *
 * Copy follows the design annotation, singular: the catalogue stores one image
 * per SKU. The hint names the form's Media section rather than the "+ Add
 * Image" tile the annotation described — that tile belonged to the six-image
 * strip, and pointing a first-run coach-mark at a control that isn't there is
 * worse than no coach-mark.
 */
export const SKU_GUIDE_STEPS: GuideStep[] = [
  {
    target: "mca-sku-image",
    title: "Add images to your SKU",
    description:
      "Add an image to your SKUs to easily identify your products and services. Edit product → Media.",
    side: "bottom",
    align: "start",
  },
];
