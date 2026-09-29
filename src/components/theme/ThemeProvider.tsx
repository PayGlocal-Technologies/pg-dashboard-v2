"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      // Light unless the merchant picks otherwise from the theme toggle. A
      // dark OS no longer turns the dashboard dark on its own; "System" is
      // still offered in the toggle for anyone who wants that.
      defaultTheme="light"
      enableSystem={true}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
