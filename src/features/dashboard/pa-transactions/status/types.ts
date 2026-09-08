import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";

/** Shared shape for every status chip in the app (transaction/refund/
 * dispute), see the status-vocabulary spec: one vocabulary per object, one
 * colour meaning applied identically everywhere. */
export interface StatusMeta {
  label: string;
  variant: BadgeVariant;
  trailIcon?: BadgeTrailIcon;
  /** Extra context shown on hover rather than inline in the badge itself. */
  tooltip?: string;
}
