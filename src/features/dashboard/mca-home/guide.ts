import type { GuideStep } from "@/components/common/guide/types";

/**
 * Storage id for the MCA dashboard walkthrough. Bump the version suffix if the
 * steps below change enough that returning merchants should see it again.
 */
export const MCA_DASHBOARD_GUIDE_KEY = "mca-dashboard-v2";

/**
 * First-visit coach-marks for the MCA dashboard home. `target` values match the
 * `data-guide` attributes placed in `mca-home/index.tsx`. Copy is carried over
 * verbatim from the design annotations.
 */
export const MCA_DASHBOARD_GUIDE_STEPS: GuideStep[] = [
  {
    target: "mca-create-invoice",
    title: "Create invoice",
    description: "Create an invoice right here, without leaving the dashboard.",
    side: "bottom",
    align: "end",
  },
  {
    target: "mca-needs-attention",
    title: "Invoice status",
    description: "See anything that needs your attention, so you know what to take care of.",
    side: "left",
    align: "start",
  },
  {
    target: "mca-quick-access",
    title: "Quick access",
    description:
      "Quickly find the tools and information you need to manage your virtual accounts.",
    side: "top",
    align: "start",
  },
];
