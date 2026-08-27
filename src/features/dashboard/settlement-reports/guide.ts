import type { GuideStep } from "@/components/common/guide/types";

/** Storage id for the MCA settlements walkthrough. Bump the version suffix if
 *  the steps below change enough that returning merchants should see it. */
export const MCA_SETTLEMENT_GUIDE_KEY = "mca-settlement-v2";

/**
 * First-visit coach-marks for the MCA settlement reports page. `target` values
 * match the `data-guide` attributes on the Settlement calendar button and the
 * analytics summary (SettlementStatCards) in index.tsx. Copy carried over
 * verbatim from the design annotations.
 */
export const MCA_SETTLEMENT_GUIDE_STEPS: GuideStep[] = [
  {
    target: "mca-settlement-calendar",
    title: "Settlement calendar",
    description: "See your upcoming settlements and all the details you need, in one place.",
    side: "bottom",
    align: "end",
  },
  {
    target: "mca-settlement-analytics",
    title: "View analytics",
    description: "Get a quick look at how your settlements are performing.",
    side: "bottom",
    align: "center",
  },
];
