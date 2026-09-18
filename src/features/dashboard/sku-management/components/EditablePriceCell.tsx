"use client";

import { useId, useState } from "react";
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  InputGroup,
  InputGroupInput,
  InputGroupText,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { currencySymbol, formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { SKU_PRICE_LOCALE } from "@/features/dashboard/sku-management/constants";

/**
 * A price the merchant can retype, but only ever a valid one:
 * - blank / non-numeric is rejected rather than saved as 0, since an empty
 *   price field almost always means "I cleared it and got distracted", not
 *   "this product is free";
 * - negatives are rejected outright — a selling price or a cost below zero has
 *   no meaning in a catalogue.
 * Returns the parsed amount, or an error message to show under the field.
 */
export function parsePriceDraft(draft: string): { amount: number } | { error: string } {
  const trimmed = draft.trim();
  if (!trimmed) return { error: "Enter an amount" };
  // Number() rather than parseFloat: parseFloat("12abc") is 12, which would
  // silently save a different number than the merchant typed.
  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) return { error: "Enter a valid number" };
  if (amount < 0) return { error: "Amount can't be negative" };
  return { amount };
}

interface EditablePriceCellProps {
  /** The column's own header text, used verbatim for the popover's label and,
   *  lowercased, in its assistive line. Passing it in (rather than deriving it
   *  from `field`) keeps the two in sync with whatever the column is called. */
  label: string;
  value: number;
  /** Widened with SkuProduct.currency: a fetched row can be priced in a code
   *  outside the seven the form offers, and formatCurrency takes any string. */
  currency: string;
  onSave: (next: number) => void;
  /** Selling price is the figure merchants scan for and is emphasised in the
   *  table; product cost trails it as muted secondary text. */
  emphasis?: boolean;
}

export function EditablePriceCell({
  label,
  value,
  currency,
  onSave,
  emphasis = false,
}: EditablePriceCellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Both Cancel and a click outside land here with `next === false`, so the
  // draft is discarded on either — only Save (below) ever calls onSave.
  const onOpenChange = (next: boolean) => {
    if (next) {
      // Seeded from the current value, unformatted: the merchant edits the
      // number itself, not "$1,850.00", and the grouped/symbolised form comes
      // back the moment it's saved.
      setDraft(String(value));
      setError(null);
    }
    setOpen(next);
  };

  const handleSave = () => {
    const result = parsePriceDraft(draft);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSave(result.amount);
    setOpen(false);
  };

  // useId rather than a slug of the label: every row renders one of these per
  // price column, so a label-derived id would be duplicated across the table
  // and the label/description would point at whichever input mounted first.
  const fieldId = useId();
  const inputId = `${fieldId}-amount`;
  const descriptionId = `${fieldId}-description`;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {/* Ghost Button stripped back to the cell's own type scale — the same
            way mcaColumns' in-table actions override it — so the value keeps
            the exact weight and colour it had before it became editable and
            the affordance is just Button's own hover fill. No permanent edit
            icon; -mr-1 pulls that fill's padding back so the figure stays
            flush with the column's right edge. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Edit ${label.toLowerCase()}`}
          aria-haspopup="dialog"
          className={cn(
            "-mr-1 h-auto min-h-0 rounded-md px-1.5 py-0.5 text-[13px] tabular-nums whitespace-nowrap",
            "data-[state=open]:bg-muted",
            emphasis ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
          )}
        >
          {formatCurrency(value, currency, SKU_PRICE_LOCALE)}
        </Button>
      </PopoverTrigger>

      {/* No onOpenAutoFocus override: the popover opens with nothing focused
          and no ring anywhere, and the merchant clicks into the amount to
          edit it. Radix still focuses the content container itself, which is
          what keeps Escape and Tab working — that's not a visible focus
          state, so it stays. */}
      <PopoverContent
        align="end"
        className="w-64 p-3"
        // On close Radix returns focus to the trigger, and since Enter is a
        // keyboard interaction that lands as :focus-visible — a ring drawn
        // around the value the merchant just saved. Preventing it leaves the
        // saved figure clean. The cost is that keyboard focus falls back to
        // the document rather than the value, so tabbing after a save resumes
        // from the top of the page instead of the next cell.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Field>
          {/* Uppercased via CSS, not in the string: the text stays the
              column's exact title, so it reads correctly to a screen reader
              and follows the column if it's ever renamed. */}
          <FieldLabel
            htmlFor={inputId}
            className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground"
          >
            {label}
          </FieldLabel>
          <FieldDescription id={descriptionId} className="text-[12px]">
            This will update the {label.toLowerCase()} of this product
          </FieldDescription>

          {/* Currency is static text beside the amount: it's the product's own
              currency and this interaction never changes it, which is why this
              isn't flux's CurrencyAmountInput (that pairs the amount with a
              currency *selector*).

              justify-end keeps the symbol and the amount together as one group
              flush with the field's right edge (items-stretch plus the text's
              own items-center centre them vertically), rather than the default
              inline-start addon pinning the symbol to the left with the amount
              stranded opposite it. The grey fill replaces the default card
              background/border/shadow, and the focus ring InputGroup normally
              raises on the inner control is suppressed here. */}
          <InputGroup
            className={cn(
              "h-10 min-h-10 justify-end gap-1 border-transparent bg-muted pr-3.5 shadow-none",
              "has-[[data-slot=input-group-control]:focus-visible]:ring-0"
            )}
          >
            <InputGroupText className="flex-none text-[13px] font-medium text-foreground">
              {currencySymbol(currency)}
            </InputGroupText>
            <InputGroupInput
              id={inputId}
              aria-describedby={descriptionId}
              // type="number" gives mobile a numeric keypad and blocks most
              // stray characters at the source; parsePriceDraft above is still
              // the authority, since a number input can be pasted into.
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={draft}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
                // Escape already closes the popover through Radix's own
                // dismiss handling, which routes to onOpenChange(false) and
                // discards the draft — nothing to add here.
              }}
              // Width tracks the text being typed, so the amount never leaves
              // a gap between itself and its currency symbol the way a fixed
              // width would once justify-end pushes the pair right. tabular-nums
              // makes every digit exactly 1ch; the +1 covers the narrower
              // separators (a decimal point or thousands comma) plus the caret.
              style={{ width: `${Math.max(5, draft.length + 1)}ch` }}
              className={cn(
                "flex-none bg-transparent px-0 text-left text-[13px] tabular-nums",
                "focus-visible:outline-none focus-visible:ring-0",
                // Number inputs render stepper arrows on hover/focus, which
                // would sit in the middle of the centred group.
                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              )}
            />
          </InputGroup>

          {error && <FieldError>{error}</FieldError>}
        </Field>

        <div className="mt-3 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
