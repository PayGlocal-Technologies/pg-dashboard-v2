import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";
import type { SchedulerView } from "@/features/dashboard/scheduler/types";

/** The MID feature key pg-dashboard gates the page on. */
export const SCHEDULER_FEATURE = "SCHEDULER";

export const SCHEDULER_PAGE_LIMIT = 15;

export const SCHEDULER_PAGE_SUBTITLE =
  "Standing Instruction debits the scheduler has run, and the ones coming up";

export const SCHEDULER_VIEW_TABS: { value: SchedulerView; label: string }[] = [
  { value: "executed", label: "Executed transactions" },
  { value: "projected", label: "Projected revenue" },
];

/** The Status filter on Executed: one value at a time, as in pg-dashboard. */
export const SCHEDULER_STATUS_OPTIONS = [
  { value: "EXECUTED", label: "Executed" },
  { value: "MANUALLY_EXECUTED", label: "Manually executed" },
  { value: "FAILED", label: "Failed" },
];

type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

export const SCHEDULER_STATUS_META: Record<string, StatusMeta> = {
  EXECUTED: { label: "Executed", variant: "success", trailIcon: "check" },
  MANUALLY_EXECUTED: { label: "Manually executed", variant: "success", trailIcon: "check" },
  FAILED: { label: "Failed", variant: "danger", trailIcon: "x" },
};

/** An attempt that went through; anything else is drawn as failed. */
export const SUCCESSFUL_ATTEMPT_STATUS = "SENT_FOR_CAPTURE";

/** The permission behind the report (and pg-dashboard's sidebar entry). */
export const SCHEDULER_REPORT_PERMISSION = ["merchantAdminReport"];
