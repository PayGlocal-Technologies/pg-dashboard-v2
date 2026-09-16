"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ECHO_QUICK_ACTIONS } from "@/features/dashboard/echo/constants";

/**
 * The panel's prompt chips: a flat two-column grid, distinct from the full
 * page's vertical "Try asking" list (`EchoFullPageSuggestions`). Both surfaces
 * offer the same four prompts, laid out for the space they have.
 *
 * Tapping one sends its `prompt` as an ordinary text turn — see
 * ECHO_QUICK_ACTIONS.
 */
export function EchoQuickActions({
  onSend,
  disabled,
}: {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ECHO_QUICK_ACTIONS.map((action) => (
        // flux's Button wraps all children in one plain <span>, hence the
        // `[&>span]` unwrap so the icon centres against the label instead of
        // sitting on its baseline.
        <Button
          key={action.id}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onSend(action.prompt)}
          aria-label={`Ask: ${action.label}`}
          className={[
            "h-auto min-h-0 rounded-xl border-border/70 bg-card/80 p-0 text-left shadow-sm",
            "[&>span]:flex [&>span]:w-full [&>span]:flex-col [&>span]:items-start [&>span]:gap-1.5 [&>span]:px-3 [&>span]:py-2.5",
            "hover:border-border hover:bg-muted/40",
          ].join(" ")}
        >
          <Icon name={action.icon} className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-[12px] font-medium leading-snug text-foreground">
            {action.label}
          </span>
        </Button>
      ))}
    </div>
  );
}
