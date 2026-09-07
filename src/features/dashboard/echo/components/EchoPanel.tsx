"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useEchoPanel, ECHO_PANEL_WIDTH } from "@/stores/useEchoPanel";
import { useEchoChat } from "@/stores/useEchoChat";
import { useApp } from "@/stores/useApp";
import { EchoComposer } from "@/features/dashboard/echo/components/EchoComposer";
import { EchoMessageList } from "@/features/dashboard/echo/components/EchoMessageList";
import { EchoQuickActions } from "@/features/dashboard/echo/components/EchoQuickActions";

/**
 * Echo's side panel — a flex sibling of the main content column (mounted
 * once in `(dashboard)/layout.tsx`), sliding open to `ECHO_PANEL_WIDTH`
 * rather than overlaying, so it never covers whatever the merchant was
 * looking at.
 *
 * Shares its conversation with `EchoFullPage` via `useEchoChat` — "expand"
 * closes this panel and navigates to `/echo` with the transcript intact,
 * rather than starting over on a second, disconnected chat.
 */
export function EchoPanel() {
  const { open, setOpen } = useEchoPanel();
  const { messages, busy, sendMessage, reset } = useEchoChat();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const profile = useApp((s) => s.profile);
  const bottomRef = useRef<HTMLDivElement>(null);

  const firstName = profile?.firstName || profile?.username || "";
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const expand = () => {
    setOpen(false);
    router.push("/echo");
  };

  return (
    <motion.aside
      aria-label="Echo assistant"
      aria-hidden={!open}
      initial={false}
      animate={{ width: open ? ECHO_PANEL_WIDTH : 0 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }}
      className={cn(
        "relative flex h-screen shrink-0 flex-col overflow-hidden bg-card/90 backdrop-blur-md",
        open && "border-l border-border"
      )}
    >
      {/* Fixed inner width (not `w-full`): the outer <motion.aside> animates
          from 0, so its own width is mid-transition most of the time —
          content needs a stable width to lay out against instead of
          reflowing as the panel opens. */}
      <div className="flex h-full min-h-0 flex-col" style={{ width: ECHO_PANEL_WIDTH }}>
        <header className="flex h-[57px] shrink-0 items-center justify-end gap-0.5 border-b border-header-border bg-header px-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 min-h-0 rounded-lg p-0 text-muted-foreground hover:text-foreground"
            aria-label="Reset conversation"
            title="Reset conversation"
            onClick={() => reset()}
          >
            <Icon name="rotate-ccw" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 min-h-0 rounded-lg p-0 text-muted-foreground hover:text-foreground"
            aria-label="Open Echo full page"
            title="Open full page"
            onClick={expand}
          >
            <Icon name="maximize-2" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 min-h-0 rounded-lg p-0 text-muted-foreground hover:text-foreground"
            aria-label="Collapse Echo panel"
            title="Collapse panel"
            onClick={() => setOpen(false)}
          >
            <Icon name="panel-right" className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-4">
          {hasMessages ? (
            <>
              <EchoMessageList />
              <div ref={bottomRef} />
            </>
          ) : (
            <div className="flex h-full flex-col justify-center gap-6">
              <div className="text-center">
                <Icon name="echo-mark" className="mx-auto h-12 w-12" />
                {firstName && (
                  <p className="mt-3 text-[13px] font-medium text-muted-foreground">
                    Hey {firstName}!
                  </p>
                )}
                <p className="mt-1 text-[19px] font-bold tracking-tight text-foreground">
                  How can I help you?
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-center text-[12px] font-medium tracking-tight text-muted-foreground">
                  Things you can do with Echo!
                </p>
                <EchoQuickActions onSend={sendMessage} />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-3.5 pb-3.5 pt-1">
          <EchoComposer onSend={sendMessage} disabled={busy} />
        </div>
      </div>
    </motion.aside>
  );
}
