"use client";

import { useState } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  DateRangeCalendarPicker,
  type DateRangeValue,
  type DatePickMode,
} from "@/components/common/DateRangeCalendarPicker";
import { formatDateKey, formatShortDate, parseDateKey } from "@/lib/utils/format";
import {
  FilterChipClearButton,
  FilterChipLabelTrigger,
  FilterChipShell,
} from "@/components/common/filters/FilterChips";

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

const PRESETS: { value: Exclude<DatePreset, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last3months", label: "Last 3 months" },
];

function dateLabel(value: PaymentLinksDateValue): string {
  const preset = PRESETS.find((p) => p.value === value.preset);
  if (preset) return preset.label;
  return value.from === value.to
    ? formatShortDate(value.from)
    : `${formatShortDate(value.from)} – ${formatShortDate(value.to)}`;
}

export function PaymentLinksDateFilter({ value, onChange }: PaymentLinksDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"presets" | "custom">("presets");
  const [mode, setMode] = useState<DatePickMode>("single");
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [range, setRange] = useState<DateRangeValue | undefined>(undefined);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Resync the popover's working selection from the last committed value
      // every time it opens (not via an effect — see CLAUDE.md hooks rules).
      if (value?.preset === "custom") {
        setView("custom");
        if (value.from === value.to) {
          setMode("single");
          setSingleDate(parseDateKey(value.from));
          setRange(undefined);
        } else {
          setMode("range");
          setRange({ from: parseDateKey(value.from), to: parseDateKey(value.to) });
          setSingleDate(undefined);
        }
      } else {
        setView("presets");
        setMode("single");
        setSingleDate(undefined);
        setRange(undefined);
      }
    }
    setOpen(next);
  }

  function handlePresetClick(preset: Exclude<DatePreset, "custom">) {
    const today = new Date();
    const to = new Date(today);
    const from = new Date(today);
    if (preset === "last7") from.setDate(from.getDate() - 6);
    if (preset === "last30") from.setDate(from.getDate() - 29);
    if (preset === "last3months") from.setMonth(from.getMonth() - 3);
    onChange({ preset, from: formatDateKey(from), to: formatDateKey(to) });
    setOpen(false);
  }

  function handleCustomDone() {
    if (mode === "single") {
      onChange(
        singleDate
          ? { preset: "custom", from: formatDateKey(singleDate), to: formatDateKey(singleDate) }
          : undefined
      );
    } else {
      onChange(
        range?.from
          ? {
              preset: "custom",
              from: formatDateKey(range.from),
              to: formatDateKey(range.to ?? range.from),
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
      {/* The shared chip shell, matching every other filter in the app — see the
          note in SettlementDateFilter for what this replaced. */}
      <FilterChipShell active={!!value}>
        {value && <FilterChipClearButton label="Date" onClick={handleClear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label={value ? dateLabel(value) : "Date"} active={!!value} />
        </PopoverTrigger>
      </FilterChipShell>
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
