"use client";

import { CalendarDateFilterChip, type DatePickMode } from "@/components/ui";

export type { DatePickMode };

export interface SettlementDateValue {
  mode: DatePickMode;
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD — only set when mode is "range" */
  to?: string;
}

interface SettlementDateFilterProps {
  value: SettlementDateValue | undefined;
  onChange: (value: SettlementDateValue | undefined) => void;
}

/**
 * flux's calendar date chip under this feature's value shape.
 *
 * The chip always reports a span; this feature distinguishes a single day from
 * a range with `mode`, and omits `to` entirely for a single day. That mapping
 * is the whole of what is left here — there is no second date picker.
 */
export function SettlementDateFilter({ value, onChange }: SettlementDateFilterProps) {
  return (
    <CalendarDateFilterChip
      chipKey="settlement-date"
      label="Date"
      value={value && { preset: "", from: value.from, to: value.to ?? value.from }}
      onChange={(next) => {
        if (!next) return onChange(undefined);
        const isSpan = !!next.to && next.to !== next.from;
        onChange(
          isSpan
            ? { mode: "range", from: next.from, to: next.to }
            : { mode: "single", from: next.from }
        );
      }}
    />
  );
}
