"use client";

import {
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";

interface StatusBadgeWithTooltipProps {
  label: string;
  variant: BadgeVariant;
  trailIcon?: BadgeTrailIcon;
  /** Extra context (e.g. a dispute's response deadline) shown on hover
   * instead of inline in the badge text, see getDisplayStatus/PA_STATUS_META
   * in paColumns.tsx for where this comes from. Renders a plain StatusBadge
   * with no tooltip wrapper at all when absent. */
  tooltip?: string;
  size?: "sm" | "md";
}

export function StatusBadgeWithTooltip({
  label,
  variant,
  trailIcon,
  tooltip,
  size = "sm",
}: StatusBadgeWithTooltipProps) {
  const badge = <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size={size} />;
  if (!tooltip) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
