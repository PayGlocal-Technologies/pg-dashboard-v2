"use client";

import { cn } from "@/lib/utils";

const AVATAR_PALETTES: [string, string][] = [
  ["#e0f2fe", "#0369a1"],
  ["#fce7f3", "#9d174d"],
  ["#d1fae5", "#065f46"],
  ["#ede9fe", "#5b21b6"],
];

/**
 * The two-letter mark that stands for one merchant account.
 *
 * Keyed off the name's first character rather than an index, so an account keeps
 * the same colour wherever it is drawn — the sidebar's selector, and any other
 * place that has to ask which merchant is meant.
 *
 * Lifted out of MerchantSelector when the MID pickers on the invoice entry
 * points needed the same mark: a second copy would have been a second palette to
 * keep in step, and two shades of "the same account" is exactly what a merchant
 * with four MIDs cannot afford.
 */
export function MidAvatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const initials = name.slice(0, 2).toUpperCase();
  const [bg, color] = AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length]!;

  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center font-bold",
        size === "md" ? "h-8 w-8 rounded-lg text-[13px]" : "h-6 w-6 rounded-md text-[10px]",
        className
      )}
      style={{ background: bg, color }}
    >
      {initials}
    </div>
  );
}

/** Dot colour per account status, matching the sidebar's own selector. */
export const MID_STATUS_DOT: Record<string, string> = {
  ACTIVE: "#22c55e",
  INACTIVE: "#f59e0b",
  DISABLED: "#9ca3af",
};
