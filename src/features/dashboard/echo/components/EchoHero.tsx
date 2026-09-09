"use client";

import { type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * Echo's welcome screen: the mark, a greeting, and one list of things to tap.
 *
 * That list is always the server's own — the opening menu, or placeholder rows
 * while the handshake is in flight — handed in as `children` by the
 * transcript. See the welcome-turn note in EchoTranscript.
 *
 * There is no hardcoded prompt list any more. The session opens itself the
 * moment Echo is shown, so showing invented suggestions alongside the server's
 * real menu made this screen two competing menus; showing them *while waiting*
 * was worse still, because four suggestions were then replaced by four
 * different menu rows the instant the response landed.
 * `ECHO_QUICK_ACTIONS` and its two layouts are kept for a surface that has no
 * server menu to show, and nothing renders them today.
 *
 * The caption is dropped along with the list when there is nothing to caption,
 * so a turn that carries no menu does not leave a stray "Try asking" behind.
 */
export function EchoHero({
  firstName,
  compact = false,
  children,
}: {
  firstName?: string;
  compact?: boolean;
  /** The server's opening menu, already rendered, or its placeholder. */
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "gap-3" : "gap-4")}>
      <Icon name="echo-mark" className={cn("shrink-0", compact ? "text-[40px]" : "text-[56px]")} />

      <div className="space-y-1">
        <h2
          className={cn(
            "font-semibold tracking-tight text-foreground",
            compact ? "text-[15px]" : "text-xl"
          )}
        >
          {firstName ? `Hi ${firstName}, how can I help?` : "How can I help?"}
        </h2>
        <p
          className={cn(
            "mx-auto max-w-md text-muted-foreground",
            compact ? "text-[12px]" : "text-[13.5px]"
          )}
        >
          Transactions, settlements, disputes, accounts and payment links, without the menus.
        </p>
      </div>

      {children ? (
        <div className={cn("w-full text-left", compact ? "max-w-full" : "max-w-md")}>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Try asking
          </p>
          {children}
        </div>
      ) : null}
    </div>
  );
}
