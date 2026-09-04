"use client";

import { Button, Calendar } from "@/components/ui";
import { cn } from "@/lib/utils";

export type DatePickMode = "single" | "range";

export type DateRangeValue = { from: Date | undefined; to?: Date | undefined };

interface DateRangeCalendarPickerProps {
  mode: DatePickMode;
  onModeChange: (mode: DatePickMode) => void;
  singleDate: Date | undefined;
  onSingleDateChange: (date: Date | undefined) => void;
  range: DateRangeValue | undefined;
  onRangeChange: (range: DateRangeValue | undefined) => void;
  onClear: () => void;
  onDone: () => void;
  numberOfMonths?: number;
}

const PICK_MODES: { value: DatePickMode; label: string }[] = [
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

      {/* `bg-transparent p-0`: flux's Calendar paints `bg-background` on itself
          and only drops it via a `[[data-slot=popover-content]_&]` selector —
          but flux's own PopoverContent never sets that data-slot, so the
          selector cannot match. Left alone, the calendar renders the page's
          off-white background as a solid block inside the white popover, with
          its own `p-3` on top of the popover's padding: a greyed, inset panel
          that reads as disabled. */}
      {mode === "single" ? (
        <Calendar
          mode="single"
          selected={singleDate}
          onSelect={onSingleDateChange}
          className="bg-transparent p-0"
        />
      ) : (
        <Calendar
          mode="range"
          selected={range}
          onSelect={onRangeChange}
          numberOfMonths={numberOfMonths}
          className="bg-transparent p-0"
        />
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
