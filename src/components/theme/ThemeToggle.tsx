"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

type ThemeOption = "light" | "dark" | "system";

const OPTIONS: { value: ThemeOption; icon: "sun" | "moon" | "monitor"; label: string }[] = [
  { value: "light", icon: "sun", label: "Light" },
  { value: "dark", icon: "moon", label: "Dark" },
  { value: "system", icon: "monitor", label: "System" },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // theme/resolvedTheme are undefined during SSR and on the client's first
  // (pre-hydration) render, only trust them once mounted has flipped true.
  // setMounted runs inside the timeout callback, not synchronously in the
  // effect body, per CLAUDE.md's hooks-purity rule.
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentIcon = !mounted
    ? undefined
    : theme === "system"
      ? "monitor"
      : resolvedTheme === "dark"
        ? "moon"
        : "sun";

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((o: boolean) => !o)}
        className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-muted dark:border-border dark:hover:bg-accent flex items-center justify-center transition-colors"
        aria-label="Change theme"
      >
        {mounted && currentIcon && (
          <Icon
            name={currentIcon}
            size={16}
            className={
              theme !== "system" && resolvedTheme === "dark"
                ? "text-amber-400"
                : "text-muted-foreground"
            }
          />
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-11 z-50 w-36 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground py-1"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)" }}
          >
            {OPTIONS.map((opt) => {
              const active = mounted && theme === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setTheme(opt.value);
                    setOpen(false);
                  }}
                  className="w-full p-0 h-auto min-h-0 text-[13px] transition-colors hover:bg-muted/70 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5 [&>span]:px-3 [&>span]:py-2"
                >
                  <Icon
                    name={opt.icon}
                    size={14}
                    className={active ? "text-primary" : "text-muted-foreground"}
                  />
                  <span className={active ? "font-medium text-foreground" : "text-foreground"}>
                    {opt.label}
                  </span>
                  {active && <Icon name="check" size={12} className="ml-auto text-primary" />}
                </Button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
