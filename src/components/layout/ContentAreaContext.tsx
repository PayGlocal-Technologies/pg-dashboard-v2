"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * The dashboard's main content area DOM node — everything to the right of
 * the sidebar and below the top nav (see `(dashboard)/layout.tsx`'s <main>).
 * Lets content-area-scoped overlays (e.g. the Transaction Details drawer)
 * portal into it instead of document.body, so they never cover the sidebar
 * or top nav and only that region's scroll needs locking while open.
 */
const ContentAreaContext = createContext<HTMLElement | null>(null);

export const ContentAreaProvider = ContentAreaContext.Provider;

export function useContentAreaElement(): HTMLElement | null {
  return useContext(ContentAreaContext);
}

/**
 * The content area's current horizontal bounds (`left`/`width`, in viewport
 * pixels), re-measured whenever it resizes — the sidebar collapsing/
 * expanding, the Echo panel opening, or the window itself resizing all
 * change it. For a `position: fixed` element that must span exactly "the
 * content column, not the sidebar or Echo panel" (e.g. a docked action bar
 * portaled via `ViewPortal`), since `fixed` positioning is relative to the
 * viewport and ignores the flex layout that normally keeps content clear of
 * those regions.
 *
 * Returns `null` until the content element is available and measured, so
 * callers can skip rendering rather than flash at the wrong bounds.
 */
export function useContentAreaBounds(): { left: number; width: number } | null {
  const contentEl = useContentAreaElement();
  const [bounds, setBounds] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    if (!contentEl) return;
    const measure = () => {
      const rect = contentEl.getBoundingClientRect();
      setBounds({ left: rect.left, width: rect.width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(contentEl);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [contentEl]);

  return bounds;
}
