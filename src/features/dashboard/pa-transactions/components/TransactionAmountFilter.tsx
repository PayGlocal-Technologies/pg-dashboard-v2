"use client";

import { NumberRangeFilterChip } from "@/components/ui";

export interface AmountRangeValue {
  min?: number;
  max?: number;
}

interface TransactionAmountFilterProps {
  value: AmountRangeValue | undefined;
  onChange: (value: AmountRangeValue | undefined) => void;
}

/** A blank field is "no bound", which is not the same as zero. */
const toNumber = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * flux's number-range chip under this feature's value shape.
 *
 * The chip works in strings, because its fields are text inputs and "" is a
 * field nobody filled in; this feature stores numbers. That conversion is all
 * that is left here.
 */
export function TransactionAmountFilter({ value, onChange }: TransactionAmountFilterProps) {
  return (
    <NumberRangeFilterChip
      chipKey="txn-amount"
      label="Amount"
      value={{
        min: value?.min != null ? String(value.min) : "",
        max: value?.max != null ? String(value.max) : "",
      }}
      onChange={(next) => {
        const min = toNumber(next.min);
        const max = toNumber(next.max);
        onChange(min === undefined && max === undefined ? undefined : { min, max });
      }}
    />
  );
}
