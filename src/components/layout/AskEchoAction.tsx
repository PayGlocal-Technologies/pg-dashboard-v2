"use client";

import { Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useEchoPanel } from "@/stores/useEchoPanel";

/**
 * "Ask Echo" — the two entry points into Echo's side panel: the header (a
 * pill beside Help) and the sidebar (a row under its own "Assistant"
 * section). Both just toggle the same panel via `useEchoPanel`, so the
 * header and sidebar can never disagree about whether it's open.
 */

/** The header's pill trigger, beside Help — same 36px height as its
 *  neighbours, but pill-shaped with visible text and a primary tint rather
 *  than the plain muted square the icon-only buttons use, so it reads as the
 *  one AI-flavoured action among them rather than another utility icon. */
export function AskEchoHeaderButton() {
  const open = useEchoPanel((s) => s.open);
  const toggle = useEchoPanel((s) => s.toggle);

  return (
    // The rotating gradient ring (.echo-ask-ring-wrap in globals.css) is a
    // masked ::before on this wrapper, clipped to its rounded-full shape by
    // `overflow: hidden` — the button itself sits above it (z-[1]) with a
    // fully opaque background, so only the outer 1px shows as the ring.
    <span className="echo-ask-ring-wrap hidden sm:inline-flex">
      {/* flux's Button wraps all children in one plain <span>, so
          `items-center`/`gap-1.5` on the button itself never reaches the
          icon and text inside it — they were laid out as inline content,
          which is what let the icon sit on the text's baseline instead of
          centered against it. Same unwrap trick as the sidebar's Echo row. */}
      <Button
        type="button"
        variant="ghost"
        aria-pressed={open}
        onClick={toggle}
        className={cn(
          "relative z-1 h-9 rounded-full border-0 px-3 text-[13px] font-medium shadow-sm backdrop-blur-sm transition-colors",
          "[&>span]:flex [&>span]:items-center [&>span]:gap-1.5",
          open ? "bg-primary/10 text-primary" : "bg-muted text-foreground hover:bg-accent"
        )}
      >
        <Icon name="echo-mark" className="h-4 w-4 shrink-0" />
        Ask Echo
      </Button>
    </span>
  );
}

/** The sidebar's row, under its own "Assistant" section — same row shape as
 *  every other nav item (see Sidebar.tsx). */
export function AskEchoSidebarRow({ collapsed }: { collapsed: boolean }) {
  const open = useEchoPanel((s) => s.open);
  const toggle = useEchoPanel((s) => s.toggle);

  return (
    // flux's Button wraps all children in one plain <span>, hence the
    // unwrap below — same trick Sidebar.tsx's own ExpandableItem uses for
    // its trigger, so this row is built the same way its neighbours are
    // rather than reaching for a bare <button>.
    <Button
      type="button"
      variant="ghost"
      title={collapsed ? "Ask Echo" : undefined}
      aria-pressed={open}
      onClick={toggle}
      className={cn(
        "w-full h-auto min-h-0 rounded-lg p-0 text-left text-[14px] font-medium transition-all duration-100",
        "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5 [&>span]:px-2.5 [&>span]:py-2",
        open
          ? "bg-card text-foreground border border-border shadow-sm"
          : "text-sidebar-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
      )}
    >
      <Icon
        name="echo-mark"
        size={16}
        className={cn("flex-shrink-0", open ? "text-primary" : "text-muted-foreground")}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">Echo</span>
          <Badge variant="default" size="sm">
            AI
          </Badge>
        </>
      )}
    </Button>
  );
}
