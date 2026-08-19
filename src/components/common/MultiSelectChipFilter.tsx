"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  FilterChipClearButton,
  FilterChipLabelTrigger,
  FilterChipShell,
} from "@/components/common/filters/FilterChips";

export interface MultiSelectChipOption {
  value: string;
  label: string;
}

interface MultiSelectChipFilterProps {
  value: string[] | undefined;
  options: MultiSelectChipOption[];
  onChange: (value: string[] | undefined) => void;
  placeholder: string;
}

/**
 * A generic multi-select filter chip: a checkbox list staged in a popover and
 * committed only on Apply.
 *
 * Built from the same FilterChipShell/ClearButton/LabelTrigger pieces the
 * transaction tables' chips use, so a filter reads identically wherever it
 * appears. That means the dashed pill (not dotted), the leading + only while
 * inactive, a separate × segment once there is something to clear, and a
 * trailing dot rather than a selected-count — the chips deliberately signal
 * on/off rather than how many, see FilterChipLabelTrigger.
 */
export function MultiSelectChipFilter({
  value,
  options,
  onChange,
  placeholder,
}: MultiSelectChipFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value ?? []);

  const isActive = !!value?.length;

  function handleOpenChange(next: boolean) {
    if (next) {
      // Resync the draft from the last committed value every time the
      // popover opens (not via an effect, see CLAUDE.md hooks rules).
      setDraft(value ?? []);
    }
    setOpen(next);
  }

  function toggleOption(optValue: string) {
    setDraft((prev) =>
      prev.includes(optValue) ? prev.filter((v) => v !== optValue) : [...prev, optValue]
    );
  }

  function handleApply() {
    onChange(draft.length > 0 ? draft : undefined);
    setOpen(false);
  }

  function handleClear() {
    setDraft([]);
    onChange(undefined);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label={placeholder} onClick={handleClear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label={placeholder} active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>

      <PopoverContent align="start" className="w-auto p-0">
        <div className="w-56 p-3">
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-muted/50"
              >
                <Checkbox
                  checked={draft.includes(option.value)}
                  onCheckedChange={() => toggleOption(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>

          <Separator className="my-2" />

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="x" className="w-3 h-3" />}
              onClick={handleClear}
              disabled={draft.length === 0}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
