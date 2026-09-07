"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ECHO_QUICK_ACTIONS } from "@/features/dashboard/echo/constants";

/** The full page's "TRY ASKING" welcome list — a vertical stack of
 *  arrow-prefixed prompt cards, distinct from the panel's flat 2-column
 *  chip grid (`EchoQuickActions`); the two surfaces share the same four
 *  prompts but not the same layout, matching the reference. */
export function EchoFullPageSuggestions({ onSend }: { onSend: (prompt: string) => void }) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Try asking
      </p>
      <div className="flex w-full flex-col gap-2">
        {ECHO_QUICK_ACTIONS.map((action) => (
          // flux's Button wraps all children in one plain <span>, hence the
          // unwrap below.
          <Button
            key={action.id}
            type="button"
            variant="outline"
            onClick={() => onSend(action.prompt)}
            aria-label={`Ask: ${action.label}`}
            className={[
              "h-auto min-h-0 rounded-xl border-border/70 bg-card/80 p-0 text-left shadow-sm",
              "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5 [&>span]:px-4 [&>span]:py-3",
              "hover:border-border hover:bg-muted/40",
            ].join(" ")}
          >
            <Icon name="arrow-up-right" className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-foreground">
              {action.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
