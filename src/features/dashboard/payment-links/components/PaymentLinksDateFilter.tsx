"use client";

import { CalendarDateFilterChip, type CalendarDatePreset } from "@/components/ui";
import { formatDateKey } from "@/lib/utils/format";

export type DatePreset = "today" | "last7" | "last30" | "last3months" | "custom";

export interface PaymentLinksDateValue {
  preset: DatePreset;
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
}

interface PaymentLinksDateFilterProps {
  value: PaymentLinksDateValue | undefined;
  onChange: (value: PaymentLinksDateValue | undefined) => void;
}

/**
 * Counts `days` back from today, inclusive, as a YYYY-MM-DD span.
 *
 * Called when the preset is picked rather than when this list is built, so
 * "last 7 days" is seven days from the click, not from the module load.
 */
function lastDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: formatDateKey(from), to: formatDateKey(to) };
}

const PRESETS: readonly CalendarDatePreset[] = [
  { value: "today", label: "Today", resolve: () => lastDays(0) },
  { value: "last7", label: "Last 7 days", resolve: () => lastDays(6) },
  { value: "last30", label: "Last 30 days", resolve: () => lastDays(29) },
  { value: "last3months", label: "Last 3 months", resolve: () => lastDays(89) },
];

/**
 * flux's calendar date chip under this feature's value shape.
 *
 * The chip reports `preset: ""` for a hand-picked span; this feature spells
 * that `"custom"`, which is the only difference between the two.
 */
export function PaymentLinksDateFilter({ value, onChange }: PaymentLinksDateFilterProps) {
  return (
    <CalendarDateFilterChip
      chipKey="pl-date"
      label="Date"
      value={value}
      presets={PRESETS}
      onChange={(next) =>
        onChange(
          next && { preset: (next.preset || "custom") as DatePreset, from: next.from, to: next.to }
        )
      }
    />
  );
}
