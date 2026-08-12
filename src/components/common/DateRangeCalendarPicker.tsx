"use client";

import { Button, Calendar } from "@/components/ui";
import { cn } from "@/lib/utils";

export type DurationPickMode = "single" | "range";

export type DateRangeValue = { from: Date | undefined; to?: Date | undefined };

interface DateRangeCalendarPickerProps {
  mode: DurationPickMode;
  onModeChange: (mode: DurationPickMode) => void;
  singleDate: Date | undefined;
  onSingleDateChange: (date: Date | undefined) => void;
  range: DateRangeValue | undefined;
  onRangeChange: (range: DateRangeValue | undefined) => void;
  onClear: () => void;
  onDone: () => void;
  numberOfMonths?: number;
}

const PICK_MODES: { value: DurationPickMode; label: string }[] = [
  { value: "single", label: "Single date" },
  { value: "range", label: "Date range" },
];

/** Mode toggle + Calendar (single or range) + Clear/Done footer — the reusable
 * body of every duration-style filter popover in the app. */
export function DateRangeCalendarPicker({
  mode,
  onModeChange,
  singleDate,
  onSingleDateChange,
  range,
  onRangeChange,
  onClear,
  onDone,
  numberOfMonths = 2,
}: DateRangeCalendarPickerProps) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {PICK_MODES.map((m) => (
          <Button
            key={m.value}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onModeChange(m.value)}
            className={cn(
              "h-auto min-h-0 flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium",
              mode === m.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </Button>
        ))}
      </div>

      {mode === "single" ? (
        <Calendar mode="single" selected={singleDate} onSelect={onSingleDateChange} />
      ) : (
        <Calendar mode="range" selected={range} onSelect={onRangeChange} numberOfMonths={numberOfMonths} />
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
