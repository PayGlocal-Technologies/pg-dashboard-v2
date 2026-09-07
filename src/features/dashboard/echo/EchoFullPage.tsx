"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { useEchoChat } from "@/stores/useEchoChat";
import { EchoFullPageComposer } from "@/features/dashboard/echo/components/EchoFullPageComposer";
import { EchoFullPageSuggestions } from "@/features/dashboard/echo/components/EchoFullPageSuggestions";
import { EchoMessageList } from "@/features/dashboard/echo/components/EchoMessageList";

/**
 * Echo at /echo — reached via the side panel's expand button, continuing the
 * same conversation (`useEchoChat` is a store, not local state, precisely so
 * this and `EchoPanel` never disagree about what's already been said).
 */
export function EchoFullPage() {
  const { messages, busy, sendMessage, reset } = useEchoChat();
  const profile = useApp((s) => s.profile);
  const bottomRef = useRef<HTMLDivElement>(null);

  const firstName = profile?.firstName || profile?.username || "";
  const hasMessages = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fafcff] dark:bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {hasMessages ? (
          <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
            <EchoMessageList />
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="flex min-h-full flex-col items-center justify-center px-5 py-10">
            <div className="flex w-full max-w-md flex-col items-center gap-6">
              <Icon name="echo-mark" className="h-14 w-14" />

              <div className="space-y-1 text-center">
                <h1 className="text-[1.45rem] font-bold leading-snug tracking-tight text-foreground">
                  {firstName ? `Hi ${firstName}! I'm Echo.` : "Hi! I'm Echo."}
                </h1>
                <p className="text-[1rem] font-medium leading-snug text-foreground/70">
                  How can I help you today?
                </p>
              </div>

              <EchoFullPageSuggestions onSend={sendMessage} />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2">
        <EchoFullPageComposer onSend={sendMessage} onReset={reset} disabled={busy} />
      </div>
    </div>
  );
}
