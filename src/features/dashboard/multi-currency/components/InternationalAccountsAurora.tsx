import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page-scoped aurora background for International Accounts only — see
 * `.intl-accounts-aurora` / `.intl-accounts-aurora-layer` in globals.css for
 * why the tokens and gradient live there rather than inline. Nothing else in
 * the app imports this component, which is what keeps the effect from
 * leaking onto any other route.
 *
 * Now the *outermost* element this page returns, not something nested a
 * level inside its usual `mx-auto max-w-[1400px]` wrapper. That wrapper (and
 * the shared dashboard layout's own `p-4 md:p-6`) moved to the inner content
 * div below, cancelled here via `-m-4 md:-m-6` and re-applied inside — so
 * this component's own solid `--aurora-base` fill spans the *entire*
 * scrollable area, flush against the sidebar/header, rather than sitting
 * inset within that padding. The first version didn't do this: the tinted
 * box ended exactly where the shared padding began, and since `--aurora-base`
 * is a real, if subtle, off-white (not the app's actual `--background`), that
 * boundary read as a visible seam all the way around the box — most obvious
 * along the bottom, where there's no content to distract from it. Removing
 * the surrounding plain-white margin removes the edge to see.
 *
 * `isolation: isolate` contains the aurora's stacking context so it can't
 * interleave with the app's own overlays — moot in practice, since every
 * dialog/popover/toast this page can open renders through a portal to
 * `document.body` and never sits inside this subtree at all, but cheap
 * insurance regardless. The aurora layer itself sits at z-0 with
 * `pointer-events-none`; real content is lifted to z-10 — without that, the
 * *absolutely positioned* aurora would actually paint on top of the page's
 * plain in-flow content, not behind it, per how CSS resolves stacking order
 * between positioned and static boxes.
 *
 * `min-h-[calc(100dvh-57px)]` (57px is this app's fixed header height,
 * hardcoded the same way for the same reason on the Echo full page) rather
 * than a percentage min-height: nothing in this chain has a defined height
 * for a percentage to resolve against. This guarantees the wash still fills
 * the viewport on a short page instead of cutting off early — it scrolls
 * with the content (position: absolute, not fixed), it doesn't sit pinned
 * behind it.
 */
export function InternationalAccountsAurora({
  children,
  contentClassName,
}: {
  children: ReactNode;
  /** Extra classes for the inner, padded content wrapper — e.g. `space-y-*`
   *  between this page's own direct children. */
  contentClassName?: string;
}) {
  return (
    <div className="intl-accounts-aurora relative isolate -m-4 min-h-[calc(100dvh-57px)] bg-(--aurora-base) md:-m-6">
      <div
        aria-hidden="true"
        className="intl-accounts-aurora-layer pointer-events-none absolute inset-0 z-0 overflow-hidden"
      />
      <div
        className={cn(
          "relative z-10 mx-auto max-w-[1400px] p-4 page-enter md:p-6",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
