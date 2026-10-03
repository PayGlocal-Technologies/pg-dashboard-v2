import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";
import type { DealStatus } from "@/features/dashboard/partner-deals/types";

/**
 * The one label and chip style per deal status, read by the list, its
 * Status filter and the detail view alike, so the three can never disagree.
 * Deactivated is muted rather than red: it is a state the partner chose, not
 * an error.
 */
export const DEAL_STATUS_META: Record<
  DealStatus,
  { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon }
> = {
  ACTIVE: { label: "Active", variant: "success", trailIcon: "check" },
  USED: { label: "Used", variant: "info" },
  DEACTIVATED: { label: "Deactivated", variant: "muted" },
};

export const DEAL_STATUS_OPTIONS = (Object.keys(DEAL_STATUS_META) as DealStatus[]).map((value) => ({
  value,
  label: DEAL_STATUS_META[value].label,
}));
