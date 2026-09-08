"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ECHO_QUICK_ACTIONS } from "@/features/dashboard/echo/constants";

/**
 * The full page's "Try asking" list — a vertical stack of arrow-prefixed
 * prompt cards, distinct from the panel's two-column chip grid
 * (`EchoQuickActions`). The two surfaces share the same four prompts but not
 * the same layout.
 */
export function EchoFullPageSuggestions({
  onSend,
  disabled,
}: {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex w-full flex-col gap-2">
        {ECHO_QUICK_ACTIONS.map((action) => (
          // flux's Button wraps all children in one plain <span>, hence the
          // `[&>span]` unwrap below.
          <Button
            key={action.id}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onSend(action.prompt)}
            aria-label={`Ask: ${action.label}`}
            className={[
              "h-auto min-h-0 rounded-xl border-border/70 bg-card/80 p-0 text-left shadow-sm",
              "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5 [&>span]:px-4 [&>span]:py-3",
              "hover:border-border hover:bg-muted/40",
            ].join(" ")}
          >
            <Icon name={action.icon} className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
              {action.label}
            </span>
            <Icon name="arrow-up-right" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        ))}
      </div>
    </div>
  );
}
