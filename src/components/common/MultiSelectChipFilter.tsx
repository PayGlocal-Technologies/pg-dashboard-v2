"use client";

import { useState } from "react";
import { Button, Checkbox, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

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

/** Dotted, no-fill filter chip whose popover is a scrollable checkbox list
 * with Clear/Apply footer buttons, selections are staged in the popover and
 * only committed on Apply. Mirrors TransactionAmountFilter's draft/resync
 * pattern, generalized to a multi-select list instead of a min/max range. */
export function MultiSelectChipFilter({ value, options, onChange, placeholder }: MultiSelectChipFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value ?? []);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Resync the draft from the last committed value every time the
      // popover opens (not via an effect, see CLAUDE.md hooks rules).
      setDraft(value ?? []);
    }
    setOpen(next);
  }

  function toggleOption(optValue: string) {
    setDraft((prev) => (prev.includes(optValue) ? prev.filter((v) => v !== optValue) : [...prev, optValue]));
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

  const hasValue = !!value && value.length > 0;
  const triggerLabel = hasValue && value
    ? value.length === 1
      ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
      : `${placeholder} (${value.length})`
    : placeholder;

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
          {triggerLabel}
          {hasValue && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="max-h-64 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
          {options.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60"
            >
              <Checkbox checked={draft.includes(opt.value)} onCheckedChange={() => toggleOption(opt.value)} />
              <span className="text-sm text-foreground">{opt.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="h-3 w-3" />}
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
