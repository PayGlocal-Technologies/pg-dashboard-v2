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
    <div className="flex flex-col items-center text-center">
      {/* Explicit margins rather than one flex `gap` on the whole column:
          a single gap value put equal air between the mark and the heading
          as between the heading and the "try asking" list below, so all
          three read as one evenly-spaced stack instead of a clear mark →
          heading → subtext group followed by a deliberately bigger breath
          before the list. */}
      <Icon
        name="echo-mark"
        className={cn("shrink-0", compact ? "mb-2 text-[40px]" : "mb-3 text-[48px]")}
      />

      <h2
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-[15px]" : "text-[26px] font-bold"
        )}
      >
        {firstName ? `Hi ${firstName}, how can I help?` : "How can I help?"}
      </h2>
      <p
        className={cn(
          "mx-auto max-w-md text-muted-foreground",
          compact ? "mt-1 text-[12px]" : "mt-2 text-[15px]"
        )}
      >
        Ask about transactions, settlements, disputes, accounts or payment
        links — I&apos;ll skip the menus and get straight to it.
      </p>

      {children ? (
        <div
          className={cn(
            "w-full text-left",
            compact ? "mt-4 max-w-full" : "mt-8 max-w-xl"
          )}
        >
          <p
            className={cn(
              "mb-2 text-center font-semibold uppercase tracking-[0.08em] text-muted-foreground",
              compact ? "text-[11px]" : "text-[12px]"
            )}
          >
            Try asking
          </p>
          {children}
        </div>
      ) : null}
    </div>
  );
}
