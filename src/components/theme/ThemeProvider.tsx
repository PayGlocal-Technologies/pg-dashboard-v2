"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Light only: there is no theme toggle, and `forcedTheme` pins light even for
 * a browser that still has "dark" or "system" saved from when there was one.
 * The `dark:` styles and dark-mode assets stay in place, so restoring the
 * toggle means dropping `forcedTheme` and un-commenting ThemeToggle in Header
 * and the auth layout.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
