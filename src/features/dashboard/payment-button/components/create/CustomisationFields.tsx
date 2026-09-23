"use client";

import { Field, FieldError, FieldLabel, Input } from "@/components/ui";
import { PillToggle } from "@/components/common/PillToggle";
import { isHexColor } from "@/features/dashboard/payment-button/helpers";
import {
  DEFAULT_BUTTON_COLOR,
  PAYMENT_BUTTON_RADIUS_OPTIONS,
  PAYMENT_BUTTON_SIZE_OPTIONS,
  PAYMENT_BUTTON_THEME_OPTIONS,
} from "@/features/dashboard/payment-button/constants";
import type { PaymentButtonAppearance } from "@/features/dashboard/payment-button/types";

/**
 * The Customisation panel's controls: Theme, Colour, Corner radius, Size.
 *
 * Controlled by one `appearance` value rather than four form fields — none of
 * them can be invalid in a way that should block Create (a half-typed hex just
 * falls back to the default in the preview), so they need no validators, and
 * one object keeps the panel a plain component the editor can drop in.
 *
 * The three choice groups are the shared PillToggle, the filled segmented
 * control the dashboard already uses for one-of-a-few switches.
 */
export function CustomisationFields({
  value,
  onChange,
}: {
  value: PaymentButtonAppearance;
  onChange: (patch: Partial<PaymentButtonAppearance>) => void;
}) {
  const hexInvalid = !!value.color.trim() && !isHexColor(value.color);
  // What the swatch shows: the typed colour once it is a full hex, the default
  // until then, so the swatch never goes blank mid-edit.
  const swatch = isHexColor(value.color) ? value.color : DEFAULT_BUTTON_COLOR;

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <FieldLabel>Theme</FieldLabel>
        <PillToggle
          ariaLabel="Button theme"
          options={PAYMENT_BUTTON_THEME_OPTIONS}
          value={value.theme}
          onChange={(theme) => onChange({ theme })}
          className="w-fit"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="payment-button-color">Colour</FieldLabel>
        <div className="flex items-center gap-2">
          {/* flux Input as the native colour picker, sized into a swatch. */}
          <Input
            type="color"
            aria-label="Pick button colour"
            value={swatch}
            onChange={(e) => onChange({ color: e.target.value.toUpperCase() })}
            className="h-10 w-12 cursor-pointer p-1 shadow-none"
          />
          <Input
            id="payment-button-color"
            value={value.color}
            onChange={(e) => onChange({ color: e.target.value })}
            onBlur={() => {
              if (!value.color.trim()) onChange({ color: DEFAULT_BUTTON_COLOR });
            }}
            aria-invalid={hexInvalid}
            maxLength={7}
            spellCheck={false}
            className="w-36 font-mono uppercase shadow-none"
          />
        </div>
        {hexInvalid && <FieldError>Enter a hex colour, like #0061E3</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Corner radius</FieldLabel>
        <PillToggle
          ariaLabel="Button corner radius"
          options={PAYMENT_BUTTON_RADIUS_OPTIONS}
          value={value.radius}
          onChange={(radius) => onChange({ radius })}
          className="w-fit"
        />
      </Field>

      <Field>
        <FieldLabel>Size</FieldLabel>
        <PillToggle
          ariaLabel="Button size"
          options={PAYMENT_BUTTON_SIZE_OPTIONS}
          value={value.size}
          onChange={(size) => onChange({ size })}
          className="w-fit"
        />
      </Field>
    </div>
  );
}
