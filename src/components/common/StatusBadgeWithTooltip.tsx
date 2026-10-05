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
        {/* StatusBadge doesn't pass the trigger's handlers through, so it is
            wrapped in a span that does; otherwise the tooltip never opens. */}
        <TooltipTrigger asChild>
          <span className="inline-flex">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
