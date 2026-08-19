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
  type FilterChipOption,
} from "@/components/common/filters/FilterChips";

/**
 * Multi-select month chip: pick one or more of the months the selected product
 * actually has receipts for.
 *
 * Built from the shared chip primitives — the same dashed pill, the same split
 * clear/label triggers, the same staged draft committed on Apply — so it is the
 * Status chip's shape with months in it, not a second filter idiom. It lives in
 * the receipts feature rather than in FilterChips.tsx because its options are
 * this page's data: no other table filters by billing period.
 *
 * `options` is derived from the rows themselves (see receiptMonthOptions), so the
 * list can only ever offer a month with a receipt behind it. There is exactly one
 * receipt per product per month, so ticking August 2026 selects one row — the
 * month *is* the receipt's identity, which is why this replaces a day-range
 * picker rather than sitting beside one.
 *
 * `open`/`onOpenChange` are lifted to the caller, matching every chip in
 * FilterChips.tsx, so only one filter can be open at a time.
 */
export function MonthFilterChip({
  options,
  selected,
  onChange,
  open,
  onOpenChange,
}: {
  options: FilterChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const isActive = selected.length > 0;

  const toggle = (value: string) => {
    setDraft((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const clear = () => {
    onChange([]);
    setDraft([]);
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setDraft(selected);
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label="Month" onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label="Month" active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-56 p-3">
        {/* Scrolls rather than growing: a product accrues a row a month, so this
            list only gets longer with time. */}
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-muted/50"
            >
              <Checkbox
                checked={draft.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
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
            onClick={clear}
            disabled={draft.length === 0}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
