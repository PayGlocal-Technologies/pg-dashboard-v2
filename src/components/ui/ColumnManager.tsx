"use client";

import { ColumnManager as FluxColumnManager, type ColumnManagerProps } from "@payglocal_ui/flux-ui";
import { cn } from "@/lib/utils";

/**
 * Flux's ColumnManager with its trigger in the table toolbar's tone: dark
 * text and a visible lift, matching the Refresh / Download buttons beside it
 * in every table (Flux mutes the trigger's text and its outline shadow barely
 * reads at this compact size). The shadow is !important so a table that
 * flattens its card's controls ([&_*]:shadow-none, as PA Transactions does)
 * still lifts the toolbar buttons. Re-exported from @/components/ui in place
 * of Flux's, so every table picks it up.
 */
export function ColumnManager({ className, ...props }: ColumnManagerProps) {
  return (
    <FluxColumnManager
      {...props}
      className={cn(
        "text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.12)]!",
        className
      )}
    />
  );
}
