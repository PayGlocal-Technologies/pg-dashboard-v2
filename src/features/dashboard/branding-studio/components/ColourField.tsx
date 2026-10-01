"use client";

import { useId } from "react";
import { Field, FieldLabel, Input } from "@/components/ui";
import { isHexColor } from "@/features/dashboard/branding-studio/helpers";

/**
 * A colour as a swatch (the browser's picker) and its hex beside it, kept in
 * step: picking updates the hex, typing a full hex updates the swatch.
 */
export function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const invalid = !isHexColor(value);

  return (
    <Field orientation="horizontal" className="w-fit items-center gap-3">
      <FieldLabel
        htmlFor={id}
        className="w-12 flex-none text-[12.5px] font-normal text-muted-foreground"
      >
        {label}
      </FieldLabel>
      <Input
        type="color"
        aria-label={`${label} colour picker`}
        value={isHexColor(value) ? value : "#000000"}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        className="h-9 min-h-9 w-10 cursor-pointer p-1"
      />
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        maxLength={7}
        spellCheck={false}
        aria-invalid={invalid}
        className="h-9 min-h-9 w-[88px] px-2.5 font-mono text-[12px]"
      />
    </Field>
  );
}
