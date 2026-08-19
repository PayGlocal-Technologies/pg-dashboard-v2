"use client";

import { InputGroup, InputGroupInput, InputGroupText } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * A price field with its currency shown alongside, sharing one control.
 *
 * The symbol is read-only: the Currency select owns which currency applies and
 * both prices follow it, which is why this is deliberately not flux's
 * CurrencyAmountInput (that pairs each amount with its own selector).
 *
 * No height override — InputGroup's own h-11 is the same token Input and
 * SelectTrigger use, so every control in the Pricing row lines up with the
 * fields above it.
 */
export function PriceInput({
  id,
  symbol,
  field,
}: {
  id: string;
  /** Symbol for the chosen currency, or null before one is chosen. */
  symbol: string | null;
  // Structurally typed rather than taking TanStack's full field API: only
  // these three members are used, and the real signature changes with the
  // form's shape.
  field: {
    state: { value: string; meta: { errors: unknown[] } };
    handleChange: (value: string) => void;
    handleBlur: () => void;
  };
}) {
  return (
    <InputGroup>
      {symbol && (
        <InputGroupText className="shrink-0 pl-3 text-[13px] font-medium text-foreground">
          {symbol}
        </InputGroupText>
      )}
      <InputGroupInput
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0.00"
        aria-invalid={field.state.meta.errors.length > 0}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        className={cn(
          "bg-transparent text-[13px] tabular-nums",
          // Stepper arrows crowd a field this narrow.
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          symbol ? "pl-1.5" : "pl-3"
        )}
      />
    </InputGroup>
  );
}
