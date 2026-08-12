"use client";

import { useState } from "react";
import { Button, Field, FieldLabel, Input, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export interface AmountRangeValue {
  min?: number;
  max?: number;
}

interface PaymentLinksAmountFilterProps {
  value: AmountRangeValue | undefined;
  onChange: (value: AmountRangeValue | undefined) => void;
}

function amountLabel(value: AmountRangeValue): string {
  if (value.min != null && value.max != null) return `$${value.min} – $${value.max}`;
  if (value.min != null) return `Min $${value.min}`;
  if (value.max != null) return `Max $${value.max}`;
  return "Amount";
}

export function PaymentLinksAmountFilter({ value, onChange }: PaymentLinksAmountFilterProps) {
  const [open, setOpen] = useState(false);
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");

  function handleOpenChange(next: boolean) {
    if (next) {
      // Resync draft inputs from the last committed value every time the
      // popover opens (not via an effect — see CLAUDE.md hooks rules).
      setMinInput(value?.min != null ? String(value.min) : "");
      setMaxInput(value?.max != null ? String(value.max) : "");
    }
    setOpen(next);
  }

  function handleApply() {
    const min = minInput.trim() ? Number(minInput) : undefined;
    const max = maxInput.trim() ? Number(maxInput) : undefined;
    onChange(min != null || max != null ? { min, max } : undefined);
    setOpen(false);
  }

  function handleClear() {
    setMinInput("");
    setMaxInput("");
    onChange(undefined);
    setOpen(false);
  }

  const hasValue = !!value && (value.min != null || value.max != null);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="plus" className="h-3 w-3" />}
          className={cn(
            "relative h-auto rounded-full border-dotted bg-transparent px-4 py-2 text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground",
            open && "text-foreground"
          )}
        >
          {hasValue && value ? amountLabel(value) : "Amount"}
          {hasValue && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="flex items-start gap-2">
          <Field className="flex-1">
            <FieldLabel htmlFor="payment-links-amount-min" className="text-[11px] text-muted-foreground">
              Min amount
            </FieldLabel>
            <Input
              id="payment-links-amount-min"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              className="h-8 text-xs"
            />
          </Field>
          <Field className="flex-1">
            <FieldLabel htmlFor="payment-links-amount-max" className="text-[11px] text-muted-foreground">
              Max amount
            </FieldLabel>
            <Input
              id="payment-links-amount-max"
              type="number"
              inputMode="decimal"
              placeholder="Any"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              className="h-8 text-xs"
            />
          </Field>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
