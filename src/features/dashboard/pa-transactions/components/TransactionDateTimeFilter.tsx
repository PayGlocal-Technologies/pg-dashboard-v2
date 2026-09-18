"use client";

import { CalendarDateFilterChip, type CalendarDatePreset } from "@/components/ui";
import { formatDateKey, parseDateKey } from "@/lib/utils/format";

export type DateTimePreset = "today" | "last7" | "last30" | "custom";

export interface TransactionDateTimeValue {
  preset: DateTimePreset;
  startTime: number;
  endTime: number;
  label: string;
}

interface TransactionDateTimeFilterProps {
  value: TransactionDateTimeValue | undefined;
  onChange: (value: TransactionDateTimeValue | undefined) => void;
  /** Trigger label, so a feature filtering on a different date (Dispute
   *  Management's "Disputed Date") reads correctly without a second chip. */
  triggerLabel?: string;
}

/** Counts `days` back from today, inclusive, as a YYYY-MM-DD span. Resolved at
 *  pick time, so "last 7 days" is seven days from the click. */
function lastDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: formatDateKey(from), to: formatDateKey(to) };
}

const PRESETS: readonly CalendarDatePreset[] = [
  { value: "today", label: "Today", resolve: () => lastDays(0) },
  { value: "last7", label: "Last 7 Days", resolve: () => lastDays(6) },
  { value: "last30", label: "Last 30 Days", resolve: () => lastDays(29) },
];

const startOfDay = (key: string): number => parseDateKey(key).setHours(0, 0, 0, 0);
const endOfDay = (key: string): number => parseDateKey(key).setHours(23, 59, 59, 999);

/**
 * flux's calendar date chip, reported as the epoch window this feature's
 * request bodies take.
 *
 * The chip works in YYYY-MM-DD because that is what a calendar picks; the
 * endpoints want millisecond bounds, and a day filter means the whole day —
 * so the span is widened to its edges here rather than at every call site.
 */
export function TransactionDateTimeFilter({
  value,
  onChange,
  triggerLabel = "Date",
}: TransactionDateTimeFilterProps) {
  return (
    <CalendarDateFilterChip
      chipKey={triggerLabel}
      label={triggerLabel}
      presets={PRESETS}
      value={
        value && {
          preset: value.preset === "custom" ? "" : value.preset,
          from: formatDateKey(new Date(value.startTime)),
          to: formatDateKey(new Date(value.endTime)),
        }
      }
      onChange={(next) => {
        if (!next) return onChange(undefined);
        const preset = (next.preset || "custom") as DateTimePreset;
        onChange({
          preset,
          startTime: startOfDay(next.from),
          endTime: endOfDay(next.to),
          label: PRESETS.find((p) => p.value === preset)?.label ?? `${next.from} – ${next.to}`,
        });
      }}
    />
  );
}
