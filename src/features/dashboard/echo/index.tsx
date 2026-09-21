"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { HeaderHelpMenu } from "@/components/layout/HeaderHelpMenu";
import { EchoTranscript } from "@/features/dashboard/echo/components/EchoTranscript";
import { EchoComposer } from "@/features/dashboard/echo/components/EchoComposer";
import { EchoHero } from "@/features/dashboard/echo/components/EchoHero";
import { useEchoAutoStart, useEchoSession } from "@/features/dashboard/echo/hooks";
import { useApp } from "@/stores/useApp";

/**
 * Echo's full page. Reached from the side panel's expand button, and directly
 * from the sidebar row / header pill on viewports too narrow for the panel
 * (see AskEchoButton).
 *
 * The transcript lives in the useEcho store rather than in this component, so
 * navigating away to another dashboard route and back does not restart a
 * conversation the server is still holding open — and arriving here from the
 * panel continues that same conversation rather than opening a second one.
 */

/**
 * Shared square for the three corner controls, matching the boxed-icon
 * language already used for the header's theme toggle and "Switch to old
 * view" — same light-gray/bordered square in light mode, same muted/border
 * tokens in dark, so this corner reads as one more instance of that pattern
 * rather than a one-off.
 */
const CORNER_BUTTON_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-0 text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground dark:border-border dark:bg-muted dark:hover:bg-accent";

export function EchoFeature() {
  const { entries, status, busy, ended, start, sendText, sendButton, sendListRow, retry, restart } =
    useEchoSession();
  const profile = useApp((s) => s.profile);
  const router = useRouter();
  useEchoAutoStart(true, start);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Corner toolbar, Claude/ChatGPT-style: a slim row of icon-only
          controls floating over the top-right of the conversation rather
          than a titled header bar taking a row of its own. It sits above the
          transcript (z-10) and scrolls with nothing — the hero and messages
          pass underneath it, same as those two apps' own corner controls. */}
      <div className="absolute right-0 top-0 z-10 flex items-center gap-2">
        {/* BTN_RESTART_CHAT — discards the server session and reopens the
            welcome screen. See ECHO_RESTART_REQUEST. */}
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={restart}
          aria-label="New conversation"
          title="New conversation"
          className={CORNER_BUTTON_CLASS}
        >
          <Icon name="plus" size={16} />
        </Button>
        {/* Re-fetches this route's server data. The conversation itself lives
            in the useEcho store, not in anything this call would touch, so
            this is a plain "refresh the screen" affordance rather than
            anything that could interrupt or reset a chat in progress. */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.refresh()}
          aria-label="Refresh"
          title="Refresh"
          className={CORNER_BUTTON_CLASS}
        >
          <Icon name="rotate-ccw" size={15} />
        </Button>
        <HeaderHelpMenu />
      </div>

      <EchoTranscript
        entries={entries}
        status={status}
        onButton={sendButton}
        onListRow={sendListRow}
        onRetry={retry}
        ended={ended}
        onRestart={restart}
        // Always mounted: the greeting is the top of the conversation, and it
        // scrolls away like any other history. Unmounting it on the first
        // interaction is what made the opening menu re-render in a different
        // style — see the welcome-turn note in EchoTranscript.
        hero={(options) => (
          <EchoHero firstName={profile?.firstName || profile?.username || ""}>{options}</EchoHero>
        )}
        // Clears the corner toolbar above: without it, the hero mark starts
        // at the transcript's own py-4 (16px), less than the toolbar's own
        // height, and scrolls in from directly underneath it.
        className="pt-12"
      />
      <EchoComposer
        onSend={sendText}
        busy={busy}
        disabled={ended}
        autoFocus
        className="mx-auto w-full max-w-3xl"
      />
    </div>
  );
}
