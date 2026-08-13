"use client";

import { createContext, useContext } from "react";

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
