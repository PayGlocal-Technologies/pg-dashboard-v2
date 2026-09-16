"use client";

import { SingleSelectFilterChip } from "@/components/ui";
import { DISPUTE_REASON_OPTIONS } from "@/features/dashboard/dispute-management/constants";

interface DisputeReasonFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

/**
 * flux's single-select chip. A dispute only ever has one reason, so picking
 * replaces rather than accumulates and there is nothing to stage behind Apply.
 *
 * The chip uses `""` for "nothing chosen"; this feature uses `undefined`. That
 * translation is all this wrapper does.
 */
export function DisputeReasonFilter({ value, onChange }: DisputeReasonFilterProps) {
  return (
    <SingleSelectFilterChip
      chipKey="dispute-reason"
      label="Reason"
      options={DISPUTE_REASON_OPTIONS}
      value={value ?? ""}
      onChange={(next) => onChange(next === "" ? undefined : next)}
      showValueInLabel
    />
  );
}
