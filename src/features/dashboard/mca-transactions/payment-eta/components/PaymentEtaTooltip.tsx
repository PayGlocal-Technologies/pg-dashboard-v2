"use client";

import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/** A small ⓘ that explains itself on hover or keyboard focus, never on its
 *  own. A real button, so it takes focus and the tooltip reads out. */
export function PaymentEtaTooltip({
  label,
  content,
  className,
}: {
  /** Accessible name for the icon, e.g. "About this estimate". */
  label: string;
  content: string;
  className?: string;
}) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <IconButton
          type="button"
          variant="ghost"
          size="xs"
          rounded="full"
          aria-label={label}
          className={cn(
            "h-4 w-4 min-h-0 min-w-0 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground",
            className
          )}
        >
          <Icon name="info" size={13} aria-hidden />
        </IconButton>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-center">{content}</TooltipContent>
    </Tooltip>
  );
}
