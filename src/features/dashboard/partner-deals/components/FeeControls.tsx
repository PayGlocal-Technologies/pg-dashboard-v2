"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { FEE_TYPES } from "@/features/dashboard/partner-deals/constants";
import type { FeeType } from "@/features/dashboard/partner-deals/types";

/** Table cells use shorter controls than the page's 44px form default, so a
 *  pricing grid reads as rows of values rather than a stack of forms. */
export const COMPACT_CONTROL = "h-9 min-h-9 text-[13px]";

/**
 * The fee-type dropdown and fee amount input every pricing row uses, so the
 * Global, International and Domestic sections can't drift apart. Plain
 * controlled components; the form wiring stays in each section.
 */

export function FeeTypeSelect({
  id,
  value,
  onChange,
  ariaLabel,
  className,
  compact,
}: {
  id?: string;
  value: FeeType;
  onChange: (next: FeeType) => void;
  ariaLabel?: string;
  className?: string;
  /** Table-cell size; see COMPACT_CONTROL. */
  compact?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as FeeType)}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn("w-full", compact && COMPACT_CONTROL, className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FEE_TYPES.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Amount with its unit beside it: "%" after a percentage, "₹" before a flat fee. */
export function FeeInput({
  id,
  value,
  onChange,
  onBlur,
  feeType,
  invalid,
  ariaLabel,
  className,
  compact,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  feeType: FeeType;
  invalid?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Table-cell size; see COMPACT_CONTROL. */
  compact?: boolean;
}) {
  const isPercentage = feeType === "PERCENTAGE";
  return (
    // The group draws the invalid outline itself (it watches the input's
    // aria-invalid), so the input's own invalid border is cancelled below.
    <InputGroup className={cn(compact && COMPACT_CONTROL, className)}>
      {!isPercentage && (
        <InputGroupAddon align="inline-start" className={cn(compact && "h-full min-h-0 py-0 text-[13px]")}>
          <InputGroupText>₹</InputGroupText>
        </InputGroupAddon>
      )}
      <InputGroupInput
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        // Digits and one decimal point only; the validator checks the rest.
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
        onBlur={onBlur}
        className={cn(
          "tabular-nums aria-invalid:border-transparent aria-invalid:ring-0",
          // The input carries its own full height; in a compact group it has
          // to shrink with it or the value sits below centre.
          compact && "h-full min-h-0 py-0 text-[13px]"
        )}
      />
      {isPercentage && (
        <InputGroupAddon align="inline-end" className={cn(compact && "h-full min-h-0 py-0 text-[13px]")}>
          <InputGroupText>%</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

/** A table cell's inline error: small, under the control, no layout jump
 *  for rows without one. */
export function CellError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] leading-tight text-destructive">{message}</p>;
}
