"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Popover,
  PopoverAnchor,
  PopoverContent,
  RadioGroup,
  RadioGroupItem,
  Switch,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  GST_RATE_OPTIONS,
  LINE_ITEM_TYPE_OPTIONS,
} from "@/features/dashboard/create-invoice/constants";
import { useLineItemSuggestions } from "@/features/dashboard/create-invoice/hooks";
import type { LineItemDraft, LineItemSuggestion } from "@/features/dashboard/create-invoice/types";

export type LineItemValues = Omit<LineItemDraft, "key">;

const EMPTY: LineItemValues = {
  description: "",
  type: "",
  hsn: "",
  gstRate: "",
  unitPrice: "",
  quantity: "1",
  saveAsSku: false,
};

/**
 * Add or edit a line item.
 *
 * Two deliberate departures from Nova's dialog:
 *
 * - Nova's item-type radio (Amount only / Quantity / Hours) is replaced by
 *   Good / Service. The API's `type` field is the SKU kind and drives SAC-vs-HSN
 *   validation; it has no concept of an hours-based item, so offering one would
 *   produce a value the server rejects.
 * - Nova's per-item discount is gone. `LineItem` has no field for it, so a
 *   discount entered per row would be silently dropped on save. Invoice-level
 *   discount lives in the totals footer, where the API does store it.
 *
 * Added back from production: name autocomplete off the merchant's previous
 * items, and the "save to catalogue" tick that pushes an item into SKU
 * management.
 */
export function AddLineItemDialog({
  open,
  onOpenChange,
  currency,
  currencySymbol,
  editingItem,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  currencySymbol: string;
  /** null when adding. */
  editingItem: LineItemDraft | null;
  onSubmit: (values: LineItemValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>{editingItem ? "Edit line item" : "Add line item"}</DialogTitle>
        <LineItemBody
          // Remount per open/target so the fields start from the right values
          // and no stale validation carries over.
          key={`${open ? "open" : "closed"}-${editingItem?.key ?? "new"}`}
          currency={currency}
          currencySymbol={currencySymbol}
          editingItem={editingItem}
          onCancel={() => onOpenChange(false)}
          onSubmit={(values) => {
            onSubmit(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function LineItemBody({
  currency,
  currencySymbol,
  editingItem,
  onCancel,
  onSubmit,
}: {
  currency: string;
  currencySymbol: string;
  editingItem: LineItemDraft | null;
  onCancel: () => void;
  onSubmit: (values: LineItemValues) => void;
}) {
  const [values, setValues] = useState<LineItemValues>(() =>
    editingItem
      ? {
          description: editingItem.description,
          type: editingItem.type,
          hsn: editingItem.hsn,
          gstRate: editingItem.gstRate,
          unitPrice: editingItem.unitPrice,
          quantity: editingItem.quantity,
          saveAsSku: editingItem.saveAsSku ?? false,
        }
      : EMPTY
  );
  const [showGst, setShowGst] = useState(!!editingItem?.gstRate);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const suggestions = useLineItemSuggestions(currency);

  const patch = (next: Partial<LineItemValues>) => setValues((prev) => ({ ...prev, ...next }));

  // Suggestions are previously-billed line items and carry no id, so the same
  // name recurs whenever an item was billed more than once. Two entries that
  // differ only by name are the same suggestion twice — indistinguishable in the
  // list and a duplicate React key — so they collapse on the whole tuple, which
  // keeps a genuine "same item, different rate" pair as two separate rows.
  /**
   * The suggestion list, matching pg-dashboard's ItemsTable exactly.
   *
   * Two behaviours copied deliberately, because both were wrong here before:
   *
   *  - An empty query lists *everything*, not nothing. Production seeds its
   *    search from the field's current value on focus, so focusing an empty
   *    field shows the whole catalogue. Requiring a keystroke first hid the
   *    feature from anyone who did not already know it was there.
   *  - No cap. This used to stop at six, so a merchant with thirty SKUs saw an
   *    arbitrary six and reasonably concluded it was broken. The list scrolls
   *    instead.
   *
   * The one departure: production does not de-duplicate, so an item billed
   * three times appears three times. Collapsing on the whole tuple keeps a
   * genuine "same name, different rate" pair as two rows while dropping exact
   * repeats, which are indistinguishable in the list and duplicate React keys.
   */
  const matches = useMemo(() => {
    const query = values.description.trim().toLowerCase();

    const seen = new Set<string>();
    const unique: { item: LineItemSuggestion; key: string }[] = [];

    for (const item of suggestions) {
      if (!item.name) continue;
      if (query && !item.name.toLowerCase().includes(query)) continue;
      const key = [item.name, item.unitPrice ?? "", item.hsn ?? "", item.type ?? ""].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({ item, key });
    }

    return unique;
  }, [suggestions, values.description]);

  // Same four fields production requires before it will leave the items step.
  const isValid =
    !!values.description.trim() &&
    !!values.type.trim() &&
    !!values.unitPrice.trim() &&
    !!values.quantity.trim();

  const isService = values.type === "SERVICE";

  return (
    <div className="mt-4 space-y-4">
      <Field>
        <FieldLabel>Item type</FieldLabel>
        <RadioGroup
          value={values.type}
          onValueChange={(next) => patch({ type: next })}
          // flex-row is explicit: RadioGroup defaults to flex-col, and a bare
          // `flex` does not override a direction tailwind-merge sees no conflict
          // with — without it the two options stack.
          className="flex flex-row items-center gap-5"
        >
          {LINE_ITEM_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 text-[13.5px] font-medium text-foreground"
            >
              <RadioGroupItem value={option.value} id={`line-item-type-${option.value}`} />
              {option.label}
            </label>
          ))}
        </RadioGroup>
      </Field>

      {/* `modal` for the same reason SearchableSelect needs it: this popover
          lives inside a Dialog, and flux's PopoverContent always portals to
          document.body — outside the Dialog's subtree. A modal Dialog mounts
          react-remove-scroll and sets `pointer-events: none` on the body, so a
          non-modal popover out there has its wheel events cancelled. Without
          this the list rendered but would not scroll, which with the old
          six-item cap is most of why this looked broken. */}
      <Popover modal open={suggestionsOpen && matches.length > 0} onOpenChange={setSuggestionsOpen}>
        <PopoverAnchor asChild>
          <Field>
            <FieldLabel htmlFor="line-item-name">Item name</FieldLabel>
            <Input
              id="line-item-name"
              autoFocus
              autoComplete="off"
              placeholder="e.g. Logo design, Consulting fee…"
              value={values.description}
              onFocus={() => setSuggestionsOpen(true)}
              onChange={(e) => {
                patch({ description: e.target.value });
                setSuggestionsOpen(true);
              }}
            />
          </Field>
        </PopoverAnchor>

        {/* Suggestions from the merchant's previous items. Picking one fills in
            the rate and HSN it was last billed at, which is the whole point of
            the endpoint — typing the name again should not mean retyping those. */}
        <PopoverContent
          align="start"
          className="max-h-64 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-1"
          // Keep focus in the input so typing continues to filter.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {matches.map(({ item: match, key }) => {
            // The secondary line production shows: type, HSN and last rate,
            // joined. It is the whole reason to pick a suggestion rather than
            // retype the name, so it has to be visible *before* choosing.
            const meta = [
              match.type ? (match.type === "SERVICE" ? "Service" : "Good") : "",
              match.hsn ? `${match.type === "SERVICE" ? "SAC" : "HSN"} ${match.hsn}` : "",
              match.unitPrice ? `${currencySymbol}${match.unitPrice}` : "",
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Button
                key={key}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start px-2 py-1.5 text-left [&>span]:min-w-0 [&>span]:flex-1"
                onClick={() => {
                  patch({
                    description: match.name,
                    unitPrice: match.unitPrice ?? values.unitPrice,
                    hsn: match.hsn ?? values.hsn,
                    type: match.type ?? values.type,
                    // Production clears this on select: picking an item that is
                    // already in the catalogue must not queue it for re-import.
                    saveAsSku: false,
                  });
                  setSuggestionsOpen(false);
                }}
              >
                <span className="block min-w-0">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {match.name}
                  </span>
                  {meta && (
                    <span className="block truncate text-[11.5px] font-normal text-muted-foreground">
                      {meta}
                    </span>
                  )}
                </span>
              </Button>
            );
          })}
        </PopoverContent>
      </Popover>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="line-item-rate">Rate</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>{currencySymbol}</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="line-item-rate"
              inputMode="decimal"
              placeholder="0.00"
              value={values.unitPrice}
              onChange={(e) => patch({ unitPrice: e.target.value })}
            />
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="line-item-qty">Quantity</FieldLabel>
          <Input
            id="line-item-qty"
            inputMode="numeric"
            value={values.quantity}
            onChange={(e) => patch({ quantity: e.target.value })}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="line-item-hsn">
          {isService ? "SAC code" : "HSN code"}{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Input
          id="line-item-hsn"
          inputMode="numeric"
          placeholder={isService ? "e.g. 998314" : "e.g. 8471"}
          value={values.hsn}
          onChange={(e) => patch({ hsn: e.target.value })}
        />
      </Field>

      <div className="space-y-1">
        <div className={cn(showGst && "border-b border-border")}>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-foreground">Add GST</p>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Optional
              </span>
            </div>
            <Switch
              checked={showGst}
              onCheckedChange={(checked) => {
                setShowGst(checked);
                if (!checked) patch({ gstRate: "" });
              }}
              aria-label="Toggle GST"
            />
          </div>

          {showGst && (
            <div className="flex flex-wrap items-center gap-2 pb-3">
              {GST_RATE_OPTIONS.filter((option) => option.value !== "").map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={values.gstRate === option.value ? "primary" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => patch({ gstRate: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Save to SKU catalogue</p>
            <p className="text-[11px] text-muted-foreground">
              Reuse this item on future invoices without retyping it.
            </p>
          </div>
          <Switch
            checked={values.saveAsSku ?? false}
            onCheckedChange={(checked) => patch({ saveAsSku: checked })}
            aria-label="Save item to SKU catalogue"
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="primary"
          className="w-full"
          disabled={!isValid}
          onClick={() => onSubmit(values)}
        >
          {editingItem ? "Save changes" : "Add item"}
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Re-exported so the section can render the same "no items" affordance. */
export { EMPTY as EMPTY_LINE_ITEM };
