"use client";

import { SegmentedTabs, type SegmentedTabOption } from "@/components/ui";

export type TimeRangeOption<T extends string = string> = SegmentedTabOption<T>;

/**
 * The compact time-range control a summary or analytics block is scoped by:
 * tabs from `md` up, a `Select` below.
 *
 * Deliberately not `UnderlineTabs`, which is the page-level bar that segments a
 * table into views. This is the small right-aligned strip saying *which period*
 * the figures beside it describe. Two jobs, two components, so a page can show
 * both without the reader having to work out which row governs what.
 *
 * The implementation is flux's `SegmentedTabs` — pg-internal-v2 had ported this
 * exact component under that name, so flux now carries one of it. This stays as
 * a named wrapper because "TimeRangeTabs" is what the call sites here ask for,
 * and the name says which of the two strips on a page this is.
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
  label?: string;
}) {
  return (
    <SegmentedTabs options={options} value={value} onValueChange={onValueChange} label={label} />
  );
}
