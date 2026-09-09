"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { EchoComposer } from "@/features/dashboard/echo/components/EchoComposer";
import { EchoHero } from "@/features/dashboard/echo/components/EchoHero";
import { EchoTranscript } from "@/features/dashboard/echo/components/EchoTranscript";
import { useEchoAutoStart, useEchoSession, useHasEcho } from "@/features/dashboard/echo/hooks";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import { ECHO_PANEL_WIDTH, useEchoPanel } from "@/stores/useEchoPanel";

/**
 * Echo's side panel — mounted once in `(dashboard)/layout.tsx` as a flex
 * sibling of the main content column, so opening it slides the content over
 * rather than covering whatever the merchant was reading.
 *
 * Shares its conversation with the /echo page through `useEcho`: both call
 * `useEchoSession`, and the server owns the session anyway (keyed off the auth
 * cookie), so "expand" is a plain navigation with the transcript already in
 * place rather than a second, disconnected chat.
 *
 * The session opens on first open, not on mount — `claimSessionStart` inside
 * `start` is what keeps the panel and the page from racing two opening
 * handshakes when both are mounted on /echo.
 *
 * Gated on `useHasEcho` like every other Echo surface. Below `md`
 * nothing renders it: the entry points navigate to /echo on those viewports
 * instead (see AskEchoButton), since a 420px panel beside the content needs a
 * viewport that has 420px to spare.
 */
export function EchoPanel() {
  const { open, setOpen } = useEchoPanel();
  const { entries, status, busy, ended, start, sendText, sendButton, sendListRow, retry, restart } =
    useEchoSession();
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const profile = useApp((s) => s.profile);

  useEchoAutoStart(open, start);

  const hasEcho = useHasEcho();

  const expand = () => {
    setOpen(false);
    router.push("/echo");
  };

  // Not on /echo: that page is the same conversation at full size, and a
  // panel beside it would show the transcript twice. The entry points refuse
  // to open it there too (see AskEchoButton), so this only catches a direct
  // URL visit while the panel happened to be open.
  if (!hasEcho || pathname === "/echo") return null;

  return (
    <motion.aside
      aria-label="Echo assistant"
      // Collapsed the panel still holds its controls in the DOM, so it needs
      // more than aria-hidden (which over focusable content is itself a
      // violation): `inert` takes them out of the tab order, hides them from
      // assistive tech and swallows pointer events in one attribute.
      inert={!open}
      initial={false}
      animate={{ width: open ? ECHO_PANEL_WIDTH : 0 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }}
      className={cn(
        "relative hidden h-screen shrink-0 flex-col overflow-hidden bg-card/90 backdrop-blur-md md:flex",
        open && "border-l border-border"
      )}
    >
      {/* A fixed inner width rather than `w-full`: the <motion.aside> above is
          mid-animation most of the time, so a percentage width would reflow
          the whole panel on every frame of the slide. */}
      <div className="flex h-full flex-col" style={{ width: ECHO_PANEL_WIDTH }}>
        <header className="flex h-[57px] shrink-0 items-center gap-2 border-b border-border px-3">
          <Icon name="echo-mark" className="shrink-0 text-[22px]" />
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">Echo</p>

          {/* BTN_RESTART_CHAT, an id the server never offers as a rendered
              button: it discards the server session rather than walking back
              to the main menu, which would keep it. See ECHO_RESTART_REQUEST. */}
          <IconButton
            type="button"
            variant="ghost"
            size="xs"
            aria-label="New conversation"
            title="New conversation"
            disabled={busy}
            onClick={restart}
          >
            <Icon name="rotate-ccw" size={14} />
          </IconButton>
          <IconButton
            type="button"
            variant="ghost"
            size="xs"
            aria-label="Open Echo full screen"
            title="Open full screen"
            onClick={expand}
          >
            <Icon name="maximize-2" size={14} />
          </IconButton>
          <IconButton
            type="button"
            variant="ghost"
            size="xs"
            aria-label="Close Echo"
            title="Close"
            onClick={() => setOpen(false)}
          >
            <Icon name="x" size={15} />
          </IconButton>
        </header>

        <EchoTranscript
          entries={entries}
          status={status}
          onButton={sendButton}
          onListRow={sendListRow}
          onRetry={retry}
          ended={ended}
          onRestart={restart}
          className="px-3 md:px-3"
          // Always mounted — see the matching note in the full page.
          hero={(options) => (
            <EchoHero firstName={profile?.firstName || profile?.username || ""} compact>
              {options}
            </EchoHero>
          )}
        />

        <EchoComposer onSend={sendText} busy={busy} disabled={ended} autoFocus={open} />
      </div>
    </motion.aside>
  );
}
