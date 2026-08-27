import type { GuideStep } from "@/components/common/guide/types";

/** Storage id for the Connect Platforms walkthrough. Bump the version suffix
 *  if the steps change enough to re-show returning users. */
export const MCA_PLATFORMS_GUIDE_KEY = "mca-platforms-v2";

/**
 * First-visit coach-marks for the Connect Platforms page. `target` values match
 * the `data-guide` attributes on the platform selector column and the Account
 * Details card in index.tsx. Copy carried over verbatim from the design
 * annotations.
 */
export const MCA_PLATFORMS_GUIDE_STEPS: GuideStep[] = [
  {
    target: "mca-platform-selector",
    title: "Select platform",
    description: "Choose the platform you'd like to connect your account to.",
    side: "right",
    align: "start",
  },
  {
    target: "mca-account-details",
    title: "Account details",
    description: "Find your account details here when you need them to connect with a platform.",
    side: "left",
    align: "start",
  },
];
