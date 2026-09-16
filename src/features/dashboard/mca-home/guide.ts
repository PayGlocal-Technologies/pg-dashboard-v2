import type { GuideStep } from "@/components/common/guide/types";

/**
 * Storage id for the MCA dashboard walkthrough. Bump the version suffix if the
 * steps below change enough that returning merchants should see it again.
 *
 * v4 adds the Echo step. Echo used to announce itself with its own launch
 * modal on every dashboard route; introducing it inside this tour instead
 * means one interruption on first visit rather than two, and it points at the
 * real control the merchant will use rather than a dialog they dismiss.
 */
export const MCA_DASHBOARD_GUIDE_KEY = "mca-dashboard-v4";

/**
 * First-visit coach-marks for the MCA dashboard home. `target` values match
 * `data-guide` attributes — the `mca-*` ones are placed in
 * `mca-home/index.tsx`, and `echo-ask` is on the sidebar's Echo row (see
 * AskEchoButton), since that control is shared chrome rather than part of this
 * page. Copy is carried over verbatim from the design annotations.
 */
/**
 * Target of the Echo step, exported so the page can drop that step for
 * merchants who do not have Echo.
 *
 * Relying on `Spotlight`'s `onMissing` instead would technically work, but it
 * only gives up after a ~6s retry window (it exists for targets that render
 * late, not ones that never will) — six seconds of dimmed screen on the very
 * first step. Filtering the step out up front is the honest version.
 */
export const MCA_DASHBOARD_GUIDE_ECHO_TARGET = "echo-ask";

export const MCA_DASHBOARD_GUIDE_STEPS: GuideStep[] = [
  {
    // Lives in the sidebar, not on this page — Spotlight resolves targets by
    // `[data-guide]` selector at runtime, so a step can point at shared
    // chrome. The attribute is on AskEchoButton, which renders nothing
    // without `getEchoActiveSession`; see the filter in mca-home/index.tsx.
    target: MCA_DASHBOARD_GUIDE_ECHO_TARGET,
    title: "Meet Echo",
    description:
      "Ask Echo about transactions, settlements, disputes, accounts and payment links, and skip the menus entirely.",
    side: "right",
    align: "start",
  },
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
    description: "Quickly find the tools and information you need to manage your virtual accounts.",
    side: "top",
    align: "start",
  },
];
