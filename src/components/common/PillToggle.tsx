"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface PillToggleOption<T extends string> {
  value: T;
  label: string;
}

interface PillToggleProps<T extends string> {
  options: readonly PillToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the toggle as a whole, e.g. "Dispute overview metric". */
  ariaLabel: string;
  className?: string;
}

/** Compact filled-pill segmented control, for switching a single card's
 * display metric (e.g. Count vs. Amount) rather than filtering/navigating,
 * see SegmentedTabs (an underline-tab style) for that latter use case. Same
 * visual pattern already established inline in McaRevenueCard's timeframe
 * switch, extracted here so it can be reused without duplicating the
 * styling. */
export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: PillToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Button
            key={opt.value}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-auto min-h-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
