"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  // resolvedTheme is undefined during SSR, so this safely defaults to "light" before hydration.
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      toastOptions={{
        classNames: {
          toast:
            "bg-[var(--popover)] text-[var(--popover-foreground)] border-[var(--border)] shadow-lg rounded-[10px] text-[13px]",
          description: "text-[var(--muted-foreground)]",
        },
      }}
    />
  );
}
