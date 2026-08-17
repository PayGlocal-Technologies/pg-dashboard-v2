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
import {
  formatDateKey,
  formatShortDate,
} from "@/features/dashboard/settlement-reports/calendarUtils";

export interface SettlementDurationValue {
  mode: DurationPickMode;
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD — only set when mode is "range" */
  to?: string;
}

interface SettlementDurationFilterProps {
  value: SettlementDurationValue | undefined;
  onChange: (value: SettlementDurationValue | undefined) => void;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function durationLabel(value: SettlementDurationValue): string {
  if (value.mode === "single") return formatShortDate(value.from);
  return value.to
    ? `${formatShortDate(value.from)} – ${formatShortDate(value.to)}`
    : formatShortDate(value.from);
}

export function SettlementDurationFilter({ value, onChange }: SettlementDurationFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DurationPickMode>("single");
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [range, setRange] = useState<DateRangeValue | undefined>(undefined);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Resync the popover's working selection from the last committed value
      // every time it opens (not via an effect — see CLAUDE.md hooks rules).
      if (value?.mode === "range") {
        setMode("range");
        setRange({
          from: parseDateKey(value.from),
          to: value.to ? parseDateKey(value.to) : undefined,
        });
        setSingleDate(undefined);
      } else if (value?.mode === "single") {
        setMode("single");
        setSingleDate(parseDateKey(value.from));
        setRange(undefined);
      } else {
        setMode("single");
        setSingleDate(undefined);
        setRange(undefined);
      }
    }
    setOpen(next);
  }

  function handleDone() {
    if (mode === "single") {
      onChange(singleDate ? { mode: "single", from: formatDateKey(singleDate) } : undefined);
    } else {
      onChange(
        range?.from
          ? {
              mode: "range",
              from: formatDateKey(range.from),
              to: range.to ? formatDateKey(range.to) : undefined,
            }
          : undefined
      );
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
          {value ? durationLabel(value) : "Duration"}
          {value && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <DateRangeCalendarPicker
          mode={mode}
          onModeChange={setMode}
          singleDate={singleDate}
          onSingleDateChange={setSingleDate}
          range={range}
          onRangeChange={setRange}
          onClear={handleClear}
          onDone={handleDone}
        />
      </PopoverContent>
    </Popover>
  );
}
