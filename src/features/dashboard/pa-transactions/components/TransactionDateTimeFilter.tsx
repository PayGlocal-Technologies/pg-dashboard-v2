"use client";

import { useState } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  DateRangeCalendarPicker,
  type DateRangeValue,
  type DurationPickMode,
} from "@/components/common/DateRangeCalendarPicker";

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
  /** Trigger button's placeholder label, lets other features (e.g. Dispute
   * Management's "Disputed Date" filter) reuse this same popover/preset
   * logic under a different label instead of duplicating the component. */
  triggerLabel?: string;
}

const PRESETS: { value: Exclude<DateTimePreset, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
];

const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

function startOfDay(d: Date): number {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function endOfDay(d: Date): number {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy.getTime();
}

export function TransactionDateTimeFilter({
  value,
  onChange,
  triggerLabel = "Date & Time",
}: TransactionDateTimeFilterProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"presets" | "custom">("presets");
  const [mode, setMode] = useState<DurationPickMode>("range");
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [range, setRange] = useState<DateRangeValue | undefined>(undefined);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Resync the popover's working selection every time it opens (not via
      // an effect, see CLAUDE.md hooks rules).
      setView(value?.preset === "custom" ? "custom" : "presets");
      setSingleDate(undefined);
      setRange(undefined);
      setMode("range");
    }
    setOpen(next);
  }

  function handlePresetClick(preset: Exclude<DateTimePreset, "custom">) {
    const now = new Date();
    let start: Date;
    if (preset === "today") {
      start = now;
    } else if (preset === "last7") {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - 29);
    }
    const label = PRESETS.find((p) => p.value === preset)!.label;
    onChange({ preset, startTime: startOfDay(start), endTime: endOfDay(now), label });
    setOpen(false);
  }

  function handleCustomDone() {
    if (mode === "single" && singleDate) {
      onChange({
        preset: "custom",
        startTime: startOfDay(singleDate),
        endTime: endOfDay(singleDate),
        label: singleDate.toLocaleDateString("en-US", SHORT_DATE),
      });
    } else if (mode === "range" && range?.from) {
      const to = range.to ?? range.from;
      onChange({
        preset: "custom",
        startTime: startOfDay(range.from),
        endTime: endOfDay(to),
        label: `${range.from.toLocaleDateString("en-US", SHORT_DATE)} – ${to.toLocaleDateString("en-US", SHORT_DATE)}`,
      });
    } else {
      onChange(undefined);
    }
    setOpen(false);
  }

  function handleClear() {
    setSingleDate(undefined);
    setRange(undefined);
    onChange(undefined);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="plus" className="h-3 w-3" />}
          className={cn(
            "relative h-auto rounded-full border-dotted bg-transparent px-4 py-2 text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground",
            open && "text-foreground"
          )}
        >
          {value ? value.label : triggerLabel}
          {value && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        {view === "presets" ? (
          <div className="flex w-44 flex-col gap-0.5">
            {PRESETS.map((p) => (
              <Button
                key={p.value}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePresetClick(p.value)}
                className="h-auto min-h-0 justify-start rounded-md px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                {p.label}
              </Button>
            ))}
            <div className="my-1 h-px bg-border" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setView("custom")}
              rightIcon={<Icon name="chevron-right" className="h-3 w-3" />}
              className="h-auto min-h-0 justify-between rounded-md px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              Custom range
            </Button>
          </div>
        ) : (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setView("presets")}
              leftIcon={<Icon name="chevron-left" className="h-3 w-3" />}
              className="mb-2 h-auto min-h-0 gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Back
            </Button>
            <DateRangeCalendarPicker
              mode={mode}
              onModeChange={setMode}
              singleDate={singleDate}
              onSingleDateChange={setSingleDate}
              range={range}
              onRangeChange={setRange}
              onClear={handleClear}
              onDone={handleCustomDone}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
