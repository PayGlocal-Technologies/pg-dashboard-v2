"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ECHO_QUICK_ACTIONS } from "@/features/dashboard/echo/constants";

/** Icon stroke colour only (no tinted tile behind the glyph) — matches the
 *  flat, borderless-shadow chip look of the panel's "Things you can do with
 *  Echo!" strip, rotating through a few accent hues so the grid doesn't read
 *  as four identical grey buttons. */
const ICON_TINTS = [
  "text-primary",
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
] as const;

/**
 * The four starting prompts, as a flat 2-column grid of chips — shown only
 * on an empty conversation (once a message exists these give way to the
 * transcript). This is the panel's presentation; the full page uses
 * `EchoFullPageSuggestions` instead, which reads as a numbered "try asking"
 * list rather than a chip grid.
 */
export function EchoQuickActions({ onSend }: { onSend: (prompt: string) => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {ECHO_QUICK_ACTIONS.map((action, i) => (
        // flux's Button wraps all children in one plain <span>, hence the
        // unwrap below — same trick used for the sidebar's Echo row.
        <Button
          key={action.id}
          type="button"
          variant="outline"
          onClick={() => onSend(action.prompt)}
          title={action.label}
          className={cn(
            "h-9 min-h-0 w-full rounded-lg border-border bg-muted/70 p-0 text-left font-medium leading-none",
            "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2 [&>span]:px-2",
            "hover:border-border hover:bg-muted"
          )}
        >
          <Icon
            name={action.icon}
            className={cn("h-4 w-4 shrink-0", ICON_TINTS[i % ICON_TINTS.length])}
          />
          <span className="min-w-0 flex-1 truncate text-[12px]">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
