"use client";

import { SegmentedTabs as FluxSegmentedTabs } from "@/components/ui";

interface SegmentedTabsOption {
  value: string;
  label: string;
}

/**
 * Flat underline-style status filter — no pill background, the active tab gets
 * a coloured underline. Shared by Transactions, Payment Links and Settlement
 * Reports so all three status filters look identical.
 *
 * The implementation is flux's `SegmentedTabs`. Kept as a named wrapper for two
 * reasons: this app's prop is `onChange` where flux's is `onValueChange`, and
 * this strip does **not** collapse to a Select on narrow screens — these rows
 * already have the room, and a dropdown appearing at one breakpoint reads as a
 * different control rather than the same one.
 *
 * Beware the name: pg-internal-v2's `SegmentedTabs` is the *collapsing* variant,
 * which this app carries as `TimeRangeTabs`. Both are the same flux component
 * with `collapseToSelect` flipped.
 */
export function SegmentedTabs({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly SegmentedTabsOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <FluxSegmentedTabs
      options={options}
      value={value}
      onValueChange={onChange}
      collapseToSelect={false}
      className={className}
    />
  );
}
