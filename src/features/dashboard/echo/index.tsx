"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
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
export function EchoFeature() {
  const { entries, status, busy, start, sendText, sendButton, sendListRow, retry, restart } =
    useEchoSession();
  const profile = useApp((s) => s.profile);
  useEchoAutoStart(true, start);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border pb-3">
        <Icon name="echo-mark" className="shrink-0 text-[26px]" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold leading-tight text-foreground">Echo</h1>
          <p className="hidden text-[12.5px] text-muted-foreground sm:block">
            Transactions, settlements, disputes, accounts and payment links, without the menus.
          </p>
        </div>

        {/* BTN_RESTART_CHAT, an id the server never offers as a rendered
            button: it discards the server session rather than walking back to
            the main menu, which would keep it. See ECHO_RESTART_REQUEST. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={restart}
          leftIcon={<Icon name="rotate-ccw" size={13} />}
          className="shrink-0 text-[13px] font-medium"
        >
          <span className="hidden sm:inline">New conversation</span>
          <span className="sm:hidden">New</span>
        </Button>
      </header>

      <EchoTranscript
        entries={entries}
        status={status}
        onButton={sendButton}
        onListRow={sendListRow}
        onRetry={retry}
        // Always mounted: the greeting is the top of the conversation, and it
        // scrolls away like any other history. Unmounting it on the first
        // interaction is what made the opening menu re-render in a different
        // style — see the welcome-turn note in EchoTranscript.
        hero={(options) => (
          <EchoHero firstName={profile?.firstName || profile?.username || ""}>{options}</EchoHero>
        )}
      />
      <EchoComposer onSend={sendText} busy={busy} autoFocus className="mx-auto w-full max-w-3xl" />
    </div>
  );
}
