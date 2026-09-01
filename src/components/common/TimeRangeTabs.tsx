"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

export interface TimeRangeOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * The compact time-range control a summary or analytics block is scoped by.
 *
 * Deliberately a different component from `UnderlineTabs`, which is the
 * page-level tab bar (sliding indicator, full-width row, the thing that
 * segments a table into views). This is the small right-aligned strip that says
 * *which period* the figures beside it describe. Two jobs, two components, so a
 * page can show both without the reader having to work out which tab row
 * governs what.
 *
 * Shared rather than reimplemented per feature: Transactions and Invoice
 * management both have one of these, and a DQA pass found them rendered as tabs
 * in one place and a dropdown in the other. One component is what keeps that
 * from happening again.
 *
 * Tabs at md and up, a Select below it. Both drive the same state, so resizing
 * mid-session never leaves the two disagreeing about which period is selected.
 */
export function TimeRangeTabs<T extends string>({
  options,
  value,
  onValueChange,
  label = "Time range",
}: {
  options: readonly TimeRangeOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name for both controls. */
  label?: string;
}) {
  return (
    <>
      <Tabs
        value={value}
        onValueChange={(next) => onValueChange(next as T)}
        className="hidden md:block"
      >
        {/* Plain underlined triggers, not flux Tabs' own pill/segmented look:
            no container background, border or padding, a gap row of triggers,
            each just an underline and a colour change when active. Still Radix
            Tabs underneath (keyboard nav, aria-selected, the works) — only the
            className overrides differ. */}
        <TabsList
          aria-label={label}
          className="h-auto gap-4 rounded-none border-0 bg-transparent p-0"
        >
          {options.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="rounded-none border-b-2 border-transparent px-0 py-1 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
        <SelectTrigger className="h-8 w-[9.5rem] md:hidden" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
