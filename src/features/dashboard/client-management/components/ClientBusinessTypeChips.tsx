"use client";

import { Checkbox } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ClientBusinessTypeChipsProps {
  /** The id the field's label points at, so clicking the label focuses the
   *  group's first chip. */
  id: string;
  options: readonly string[];
  /** The one selected option, or "" for none. */
  value: string;
  onChange: (next: string) => void;
  /** Labels the group for assistive tech — the FieldLabel's own id. */
  labelledBy: string;
  invalid?: boolean;
}

/**
 * Single-choice check chips: every business type is on screen at once, and
 * picking one deselects whatever was picked before. A row of chips rather than
 * a dropdown because there are five short options — a select would hide all of
 * them behind a click and a scroll to save no space at all.
 *
 * Each chip is flux's own `Checkbox` inside a bordered label, which is the
 * pattern this product already uses for a selectable option (see the
 * multi-select popovers in FilterChips): the tick, its checked colours, and its
 * focus ring are the design system's, and the label only supplies the chip's
 * border and padding around it. No icon is drawn here.
 *
 * Selection is exclusive, and clicking the selected chip clears it. That second
 * part is deliberate: the control shows a tick, so it has to be un-tickable —
 * a checkbox that refuses to uncheck is a radio wearing the wrong clothes.
 * Business type is required, so clearing it surfaces the field's own error
 * immediately (the validator runs onChange), which is honest about the state
 * the form is now in rather than quietly ignoring the click.
 */
export function ClientBusinessTypeChips({
  id,
  options,
  value,
  onChange,
  labelledBy,
  invalid = false,
}: ClientBusinessTypeChipsProps) {
  return (
    // role="group" (not radiogroup): the children are checkboxes, and claiming
    // radio semantics over them would misdescribe what a screen reader then
    // announces. Exclusivity is this component's behaviour, not a role.
    <div
      id={id}
      role="group"
      aria-labelledby={labelledBy}
      // flex-wrap, so the chips run across the row where there's space and fold
      // onto the next line where there isn't — no horizontal scrolling at any
      // width, and nothing to configure per breakpoint.
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition-colors",
              // The ring comes from the Checkbox's own focus, so the whole chip
              // reads as focused when tabbed to.
              "focus-within:ring-2 focus-within:ring-ring/35",
              selected
                ? "border-primary bg-primary/5 font-medium text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50",
              // Only ever reachable with nothing selected (the field's one rule
              // is that it must be), so this puts the same destructive edge on
              // the group that an errored Input gets on its own border.
              invalid && !selected && "border-destructive/50"
            )}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={() => onChange(selected ? "" : option)}
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}
