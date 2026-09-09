"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import {
  FilterChipClearButton,
  FilterChipLabelTrigger,
  FilterChipShell,
} from "@/components/common/filters/FilterChips";
import {
  DateRangeCalendarPicker,
  type DateRangeValue,
  type DatePickMode,
} from "@/components/common/DateRangeCalendarPicker";
import { formatDateKey, formatShortDate, parseDateKey } from "@/lib/utils/format";

export interface SettlementDateValue {
  mode: DatePickMode;
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD — only set when mode is "range" */
  to?: string;
}

interface SettlementDateFilterProps {
  value: SettlementDateValue | undefined;
  onChange: (value: SettlementDateValue | undefined) => void;
}

function dateLabel(value: SettlementDateValue): string {
  if (value.mode === "single") return formatShortDate(value.from);
  return value.to
    ? `${formatShortDate(value.from)} – ${formatShortDate(value.to)}`
    : formatShortDate(value.from);
}

export function SettlementDateFilter({ value, onChange }: SettlementDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DatePickMode>("single");
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

  // Clear resets the calendar's own selection and drops the applied filter, but
  // deliberately leaves the popover OPEN. It used to close it, which made the
  // control look like it had merely dismissed itself: the merchant never saw the
  // date deselect, so the only feedback was the popover vanishing. Staying open
  // shows the calendar go empty, and leaves them somewhere to pick a new date
  // without reopening. Done is still what commits a *selection*; this is the one
  // action that also takes effect immediately, because "Clear" that needs a
  // second confirming click is not a clear.
  function handleClear() {
    setSingleDate(undefined);
    setRange(undefined);
    onChange(undefined);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {/* The shared chip shell every other filter in the app uses, so an active
          Date reads the same as an active Status or Currency: solid accent
          border, its own leading × to clear, trailing state dot. This used to be
          a bespoke dotted Button with the dot absolutely positioned OUTSIDE its
          own box, which both looked unrelated to the other chips and clipped
          wherever an ancestor scrolled. */}
      <FilterChipShell active={!!value}>
        {value && <FilterChipClearButton label="Date" onClick={handleClear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label={value ? dateLabel(value) : "Date"} active={!!value} />
        </PopoverTrigger>
      </FilterChipShell>
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
