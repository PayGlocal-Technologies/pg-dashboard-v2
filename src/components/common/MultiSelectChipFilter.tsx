"use client";

import { SelectFilterChip } from "@/components/ui";

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
 * A generic multi-select filter chip.
 *
 * flux's `SelectFilterChip` under this app's contract: it treats "nothing
 * chosen" as `undefined` rather than an empty array, because the request
 * builders omit the key entirely in that case. That translation is the whole
 * of this file — it used to be a second, hand-rolled copy of the same popover,
 * which is how it ended up as the one chip in the app with no selected count.
 */
export function MultiSelectChipFilter({
  value,
  options,
  onChange,
  placeholder,
}: MultiSelectChipFilterProps) {
  return (
    <SelectFilterChip
      chipKey={placeholder}
      label={placeholder}
      options={options}
      selected={value ?? []}
      onChange={(next) => onChange(next.length > 0 ? next : undefined)}
    />
  );
}
