"use client";

import { Button, Field, FieldLabel } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { DEFAULT_THEME_METADATA } from "@/features/dashboard/create-invoice/constants";
import type { ThemePaletteOption } from "@/features/dashboard/create-invoice/types";

/** Turns "BOLD_RED" into "Bold red", which is what a swatch's tooltip should say. */
const labelFor = (name: string): string => {
  const words = name.toLowerCase().split("_").join(" ");
  return words ? words[0]!.toUpperCase() + words.slice(1) : name;
};

/**
 * One row of named swatches.
 *
 * This used to be a hex field plus ten arbitrary colours, because nothing on the
 * wire held a colour and the preview was the only consumer. It no longer is: the
 * invoice stores an enum NAME and the renderer decides what that name is worth,
 * so an arbitrary hex has nowhere to go. The swatches are therefore exactly the
 * server's vocabulary, and the hex under each one is only what this build draws
 * it as on screen.
 *
 * Losing the hex field loses nothing real. A merchant could type `#BADA55` into
 * it before and the generated PDF ignored them; now the control cannot promise
 * something the document will not honour.
 */
function SwatchRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ThemePaletteOption[];
  /** The stored enum name, e.g. "SLATE". */
  value: string;
  onChange: (name: string) => void;
}) {
  const selected = options.find((option) => option.name === value);

  return (
    <Field>
      <FieldLabel>
        {label}
        <span className="ml-1.5 font-normal text-muted-foreground">
          {labelFor(selected?.name ?? value)}
        </span>
      </FieldLabel>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const isSelected = option.name === value;

          return (
            <Button
              key={option.name}
              type="button"
              variant="ghost"
              size="sm"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${label} ${labelFor(option.name)}`}
              title={labelFor(option.name)}
              onClick={() => onChange(option.name)}
              className={cn(
                "h-7 w-7 rounded-full p-0 ring-offset-2 ring-offset-card",
                isSelected && "ring-2 ring-primary"
              )}
              style={{ backgroundColor: option.hex }}
            >
              {isSelected && <Icon name="check" className="h-3 w-3 text-white" aria-hidden />}
            </Button>
          );
        })}
      </div>
    </Field>
  );
}

export function InvoiceColorPicker({
  color,
  accent,
  colors,
  accents,
  onColorChange,
  onAccentChange,
  onReset,
}: {
  /** Stored colour enum name. */
  color: string;
  /** Stored accent enum name. */
  accent: string;
  colors: ThemePaletteOption[];
  accents: ThemePaletteOption[];
  onColorChange: (name: string) => void;
  onAccentChange: (name: string) => void;
  /** Puts both back to the pair the server itself defaults to. */
  onReset: () => void;
}) {
  const isDefault =
    color === DEFAULT_THEME_METADATA.color && accent === DEFAULT_THEME_METADATA.accent;

  return (
    <div className="space-y-3">
      <SwatchRow label="Colour" options={colors} value={color} onChange={onColorChange} />
      <SwatchRow label="Accent" options={accents} value={accent} onChange={onAccentChange} />

      {/* Hidden rather than disabled when there is nothing to undo: a permanently
          greyed link on a fresh invoice reads as something being broken. */}
      {!isDefault && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          leftIcon={<Icon name="rotate-ccw" className="h-3 w-3" />}
          onClick={onReset}
        >
          Reset to default colours
        </Button>
      )}
    </div>
  );
}
