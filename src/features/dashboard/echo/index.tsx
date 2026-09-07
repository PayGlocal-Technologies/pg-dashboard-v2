"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { EchoTranscript } from "@/features/dashboard/echo/components/EchoTranscript";
import { EchoComposer } from "@/features/dashboard/echo/components/EchoComposer";
import { useEchoAutoStart, useEchoSession } from "@/features/dashboard/echo/hooks";

/**
 * Echo's page — the only surface. Reached from the header's "Ask Echo" button
 * and the launch banner, both of which just navigate here.
 *
 * The transcript lives in the useEcho store rather than in this component, so
 * navigating away to another dashboard route and back does not restart a
 * conversation the server is still holding open.
 */
export function EchoFeature() {
  const { entries, status, busy, start, sendText, sendButton, sendListRow, retry, restart } =
    useEchoSession();
  useEchoAutoStart(true, start);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border pb-3">
        <Icon name="echo-mark" className="shrink-0 text-[26px]" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold leading-tight text-foreground">Echo</h1>
          <p className="text-[12.5px] text-muted-foreground">
            Transactions, settlements, disputes, accounts and payment links, without the menus.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={restart}
          leftIcon={<Icon name="rotate-ccw" size={13} />}
          className="text-[13px] font-medium"
        >
          New conversation
        </Button>
      </header>

      <EchoTranscript
        entries={entries}
        status={status}
        onButton={sendButton}
        onListRow={sendListRow}
        onRetry={retry}
      />
      <EchoComposer onSend={sendText} busy={busy} autoFocus className="mx-auto w-full max-w-3xl" />
    </div>
  );
}
