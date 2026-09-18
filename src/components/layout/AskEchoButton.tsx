"use client";

import { usePathname, useRouter } from "next/navigation";
import { Badge, Button, useBreakpoint } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useHasEcho } from "@/features/dashboard/echo/hooks";
import { cn } from "@/lib/utils";
import { useEchoPanel } from "@/stores/useEchoPanel";

/**
 * The two ways into Echo: the sidebar row (under its own "Assistant" heading)
 * and the header pill beside Help. Both toggle the same side panel through
 * `useEchoPanel`, so they can never disagree about whether it is open.
 *
 * Both are gated on `useHasEcho` — a merchant without Echo has no server
 * session to talk to, so the control does not appear rather than opening a
 * panel that cannot work. The sidebar's "Assistant" heading reads the same
 * hook, so the two cannot disagree and leave a heading over an empty gap.
 *
 * Below `md` there is no room for a 420px panel beside the content, so on
 * those viewports both controls navigate to /echo instead of toggling. The
 * transcript is the same either way: it lives in useEcho, above both surfaces.
 */

/**
 * Shared behaviour for both controls: toggle the panel on a wide viewport, go
 * to the page on a narrow one, and do neither when the merchant is already on
 * /echo — opening a 420px panel beside the full page would put the same
 * conversation on screen twice. On that route the control just reports itself
 * as the current place, which is what uat's sidebar button did before the
 * panel existed.
 */
function useEchoEntryAction(onNavigate?: () => void) {
  const { isBelow } = useBreakpoint();
  const router = useRouter();
  const pathname = usePathname();
  const open = useEchoPanel((s) => s.open);
  const toggle = useEchoPanel((s) => s.toggle);
  const setOpen = useEchoPanel((s) => s.setOpen);

  const narrow = isBelow("md");
  const onEchoPage = pathname === "/echo";

  return {
    onEchoPage,
    /** True when Echo is the thing on screen, whichever surface that is. */
    pressed: onEchoPage || (!narrow && open),
    activate: () => {
      onNavigate?.();
      if (onEchoPage) return;
      if (narrow) {
        setOpen(false);
        router.push("/echo");
        return;
      }
      toggle();
    },
  };
}

type SidebarProps = {
  /** Sidebar rail mode: icon only, no label. */
  collapsed?: boolean;
  /** Closes the mobile drawer the sidebar renders into. */
  onNavigate?: () => void;
  className?: string;
};

/**
 * The sidebar's Echo row.
 *
 * Carries `data-guide="echo-ask"`, the anchor for the Echo step in the MCA
 * dashboard walkthrough (see `mca-home/guide.ts`). The attribute sits on the
 * element that only exists when the permission check passes; the tour drops
 * that step for the same accounts, reading `useHasEcho` itself.
 */
export function AskEchoButton({ collapsed = false, onNavigate, className }: SidebarProps) {
  const hasEcho = useHasEcho();
  const { pressed, activate, onEchoPage } = useEchoEntryAction(onNavigate);

  if (!hasEcho) return null;

  return (
    // flux's Button wraps all children in one plain <span>, so `items-center`
    // / `gap` on the button itself never reaches the icon and label inside it.
    // Hence the `[&>span]` unwrap — the same trick Sidebar's own
    // ExpandableItem trigger uses, rather than reaching for a bare <button>.
    <Button
      type="button"
      data-guide="echo-ask"
      aria-label="Ask Echo"
      aria-current={onEchoPage ? "page" : undefined}
      aria-pressed={onEchoPage ? undefined : pressed}
      title={collapsed ? "Ask Echo" : undefined}
      variant="ghost"
      onClick={activate}
      className={cn(
        "h-auto min-h-0 rounded-lg p-0 text-left text-[14px] font-medium transition-all duration-100",
        "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5 [&>span]:px-2.5 [&>span]:py-2",
        collapsed ? "w-9 [&>span]:justify-center [&>span]:px-0" : "w-full",
        pressed
          ? "border border-border bg-card text-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5",
        className
      )}
    >
      <Icon name="echo-mark" className={cn("shrink-0 text-[18px]", pressed && "text-primary")} />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">Echo</span>
          <Badge variant="default" size="sm">
            AI
          </Badge>
        </>
      )}
    </Button>
  );
}

/**
 * The header pill, beside Help.
 *
 * Same 36px height as its neighbours but pill-shaped with a visible label and
 * a rotating gradient ring, so it reads as the one AI action among a row of
 * utility icons rather than another of them. Hidden below `sm`, where the
 * header has no room for a labelled control — the sidebar row is the way in
 * on those viewports.
 */
export function AskEchoHeaderButton() {
  const hasEcho = useHasEcho();
  const { pressed, activate, onEchoPage } = useEchoEntryAction();

  if (!hasEcho) return null;

  return (
    // The rotating gradient ring (.echo-ask-ring-wrap in globals.css) is a
    // masked ::before on this wrapper, clipped to the rounded-full shape by
    // `overflow: hidden`. The button sits above it (z-1) with a fully opaque
    // background, so only the outer 1px shows as the ring.
    <span className="echo-ask-ring-wrap hidden sm:inline-flex">
      <Button
        type="button"
        variant="ghost"
        aria-current={onEchoPage ? "page" : undefined}
        aria-pressed={onEchoPage ? undefined : pressed}
        onClick={activate}
        className={cn(
          "relative z-1 h-9 rounded-full border-0 px-3 text-[13px] font-medium shadow-sm backdrop-blur-sm transition-colors",
          "[&>span]:flex [&>span]:items-center [&>span]:gap-1.5",
          pressed ? "bg-primary/10 text-primary" : "bg-muted text-foreground hover:bg-accent"
        )}
      >
        <Icon name="echo-mark" className="h-4 w-4 shrink-0" />
        Ask Echo
      </Button>
    </span>
  );
}
