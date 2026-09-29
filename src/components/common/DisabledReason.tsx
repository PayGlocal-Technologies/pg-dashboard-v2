"use client";

import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Wraps a button that is disabled for a reason the merchant should be told.
 *
 * Pass `reason` as the string to show, or null when the button can run; the
 * child should derive its own `disabled` from the same value so the two can
 * never disagree. Lifted from LinkConsentFooter, which proved the pattern:
 *
 *  - The trigger is a span, not the button. A disabled button emits no pointer
 *    events, so a tooltip on the button itself never opens on hover.
 *  - The span takes tabIndex 0 while disabled, so keyboard users can focus it
 *    and read the reason too (a disabled button drops out of the tab order).
 *  - `inline-flex` so wrapping does not change the button's box, and the
 *    child's pointer events are switched off so the span receives the hover.
 *
 * Use this only where a button must stay disabled (pending data, a missing
 * selection, a permission). For ordinary required fields, keep the submit
 * enabled and show errors on click instead, with RequiredMark on the labels.
 */
export function DisabledReason({
  reason,
  children,
  className,
}: {
  reason: string | null | undefined;
  children: ReactElement;
  className?: string;
}) {
  if (!reason) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          // Radix links the tooltip to its trigger with aria-describedby, so
          // the reason is announced on focus without renaming the button.
          tabIndex={0}
          className={cn("inline-flex [&>*]:pointer-events-none", className)}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
