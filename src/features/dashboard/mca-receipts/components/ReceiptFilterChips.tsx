"use client";

import { useState } from "react";
import {
  MonthRangeFilterChip,
  type MonthRange,
  FilterChipGroup,
} from "@/components/common/filters/FilterChips";

/**
 * The receipts table's filter row: Period only (the Amount chip is hidden for
 * now). Period is the shared year-and-month grid from FilterChips.tsx in its
 * range form, picking the start and end months the list request is bounded
 * by, so changing it refetches. It always has a value (the window the page
 * opens on), which is why the chip renders as active from first paint rather
 * than reading as unset while it silently bounds every row on screen.
 *
 * This owns the "which popover is open" state itself rather than taking it as a
 * prop, and that ownership is load-bearing: the table renders this row twice —
 * once in its desktop control bar and once in its narrow-viewport one, with CSS
 * deciding which is visible — so both copies are mounted at all times. Lifting
 * `openChip` above them would make a click on the visible chip also open its
 * display:none twin, and a Radix popover anchored to a hidden trigger never
 * positions: it stays translated off-screen while still stacking above the real
 * one and competing for focus, so the visible popover appears to do nothing at
 * all. Each instance holding its own state means the hidden copy simply never
 * opens. (FilterChipsRow, the shared Date/Status/Currency row this replaced,
 * carries the same note for the same reason.)
 */
export function ReceiptFilterChips({
  periodBounds,
  monthsWithData,
  period,
  defaultPeriod,
  onPeriodChange,
}: {
  /** The outer limits the Period grid can navigate within. */
  periodBounds: MonthRange;
  monthsWithData: Set<string>;
  /** The window currently in force, and in the request body. */
  period: MonthRange;
  /** What the chip's Reset goes back to. */
  defaultPeriod: MonthRange;
  onPeriodChange: (next: MonthRange) => void;
}) {
  return (
    // `contents` so the group adds no box of its own — the chips stay direct
    // children of the toolbar row that renders this.
    <FilterChipGroup className="contents">
      <MonthRangeFilterChip
        bounds={periodBounds}
        value={period}
        defaultRange={defaultPeriod}
        monthsWithData={monthsWithData}
        onChange={onPeriodChange}
      />
    </FilterChipGroup>
  );
}
