"use client";

import { useState } from "react";
import { Button, Field, FieldLabel, Input } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { normalizeHexColor } from "@/features/dashboard/create-invoice/helpers";
import { BRAND_COLOR_SWATCHES } from "@/features/dashboard/create-invoice/constants";

/**
 * One colour: ten swatches and a hex field.
 *
 * Nova pairs a native `<input type="color">` with the hex box. flux has no
 * colour-input component and CLAUDE.md's UI rule rules out the bare element, so
 * this is swatches plus hex instead — which covers a brand palette better
 * anyway, since a brand colour is a known value to be entered, not a hue to be
 * hunted for on a wheel. Logged as a flux gap: a `<ColorInput>` would replace
 * both halves of this component.
 *
 * The hex field commits on blur, not per keystroke, so typing "1" into an empty
 * box does not repaint the whole preview a colour nobody asked for. Invalid
 * input reverts and says so inline rather than through a toast, because the
 * field that is wrong is the thing that should carry the message.
 */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value.toUpperCase());
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const normalized = normalizeHexColor(draft);
    if (!normalized) {
      setDraft(value.toUpperCase());
      setError("Not a hex colour");
      return;
    }
    setError(null);
    setDraft(normalized);
    onChange(normalized);
  };

  const pick = (hex: string) => {
    setError(null);
    setDraft(hex);
    onChange(hex);
  };

  const fieldId = `brand-color-${label.toLowerCase()}`;

  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>

      <div className="flex items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded-md border border-border"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <Input
          id={fieldId}
          value={draft}
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          className="h-8 max-w-[7.5rem] font-mono text-[12px] uppercase"
        />
        {error && (
          <span id={`${fieldId}-error`} className="text-[11px] text-destructive">
            {error}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {BRAND_COLOR_SWATCHES.map((hex) => (
          <Button
            key={hex}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`${label} ${hex}`}
            aria-pressed={hex === value.toUpperCase()}
            onClick={() => pick(hex)}
            className={cn(
              "h-6 w-6 rounded-full p-0 ring-offset-2 ring-offset-card",
              hex === value.toUpperCase() && "ring-2 ring-primary"
            )}
            style={{ backgroundColor: hex }}
          >
            {hex === value.toUpperCase() && (
              <Icon name="check" className="h-3 w-3 text-white" aria-hidden />
            )}
          </Button>
        ))}
      </div>
    </Field>
  );
}

export function InvoiceColorPicker({
  primaryColor,
  accentColor,
  onPrimaryColorChange,
  onAccentColorChange,
  onReset,
}: {
  primaryColor: string;
  accentColor: string;
  onPrimaryColorChange: (hex: string) => void;
  onAccentColorChange: (hex: string) => void;
  /** Puts both colours back to the current theme's defaults. */
  onReset: () => void;
}) {
  return (
    <div className="space-y-3">
      <ColorField label="Primary" value={primaryColor} onChange={onPrimaryColorChange} />
      <ColorField label="Accent" value={accentColor} onChange={onAccentColorChange} />

      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0"
        leftIcon={<Icon name="rotate-ccw" className="h-3 w-3" />}
        onClick={onReset}
      >
        Reset to theme defaults
      </Button>
    </div>
  );
}
