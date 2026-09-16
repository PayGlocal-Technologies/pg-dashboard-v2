import type { GuideStep } from "@/components/common/guide/types";

/** Storage id for the International Accounts (multi-currency) walkthrough. Bump
 *  the version suffix if the steps change enough to re-show returning users. */
export const MCA_INTL_ACCOUNTS_GUIDE_KEY = "mca-intl-accounts-v2";

/**
 * First-visit coach-marks for the International Accounts page. `target` values
 * match the `data-guide` attributes on the region selector (index.tsx, tagged
 * on both the mobile and desktop renderings) and the Share / Copy button row
 * (VirtualAccountDetails.tsx). Copy carried over verbatim from the design
 * annotations.
 */
export const MCA_INTL_ACCOUNTS_GUIDE_STEPS: GuideStep[] = [
  {
    target: "mca-region-selector",
    title: "Select a client region",
    description: "Choose the region you want to send account details for.",
    side: "right",
    align: "start",
  },
  {
    target: "mca-share-copy",
    title: "Share or Copy account details",
    description: "Share the account details with your client, or copy them to send yourself.",
    side: "top",
    align: "center",
  },
];
