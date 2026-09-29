"use client";

import { useMemo, useState } from "react";
import { useStore } from "@tanstack/react-form";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
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
import { useAppForm } from "@/components/form/AppForm";
import { required, rules } from "@/components/form/rules";
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

/** The catalogue rejects an item with no tax code, and the import that would
 *  hit that rule runs after the invoice is already saved — so a blank one here
 *  surfaces as a failure nothing on this screen can still fix. Ask now. */
function hsnError(hsn: string, saveAsSku: boolean | undefined, type: string): string | undefined {
  if (!saveAsSku || hsn.trim()) return undefined;
  return type === "SERVICE"
    ? "SAC code is required to save this to your catalogue"
    : "HSN code is required to save this to your catalogue";
}

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
  initialDescription,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  currencySymbol: string;
  /** null when adding. */
  editingItem: LineItemDraft | null;
  /** Seeds the name field when opening fresh from a typed-but-unmatched
   *  search, e.g. LineItemsSection's inline "Add "…"" row. Ignored once
   *  editingItem is set. */
  initialDescription?: string;
  onSubmit: (values: LineItemValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Pinned header and footer around a scrolling body: with GST open the
          fields outgrow a laptop screen, and Save must stay in view. */}
      <DialogContent className="flex max-w-md flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>{editingItem ? "Edit line item" : "Add line item"}</DialogTitle>
        </div>
        <LineItemBody
          // Remount per open/target so the fields start from the right values
          // and no stale validation carries over.
          key={`${open ? "open" : "closed"}-${editingItem?.key ?? initialDescription ?? "new"}`}
          currency={currency}
          currencySymbol={currencySymbol}
          editingItem={editingItem}
          initialDescription={initialDescription}
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
  initialDescription,
  onCancel,
  onSubmit,
}: {
  currency: string;
  currencySymbol: string;
  editingItem: LineItemDraft | null;
  initialDescription?: string;
  onCancel: () => void;
  onSubmit: (values: LineItemValues) => void;
}) {
  const form = useAppForm({
    defaultValues: (editingItem
      ? {
          description: editingItem.description,
          type: editingItem.type,
          hsn: editingItem.hsn,
          gstRate: editingItem.gstRate,
          unitPrice: editingItem.unitPrice,
          quantity: editingItem.quantity,
          saveAsSku: editingItem.saveAsSku ?? false,
        }
      : { ...EMPTY, description: initialDescription ?? EMPTY.description }) as LineItemValues,
    onSubmit: ({ value }) => onSubmit(value),
  });
  const values = useStore(form.store, (state) => state.values);
  const [showGst, setShowGst] = useState(!!editingItem?.gstRate);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const suggestions = useLineItemSuggestions(currency);

  /**
   * Picking a suggestion fills several fields at once. That is not the
   * merchant editing them, so it doesn't validate them (an untouched field
   * stays quiet); a field already showing an error is re-checked so a fill
   * that fixes it clears the message.
   */
  const fillFromSuggestion = (next: Partial<LineItemValues>) => {
    for (const [name, value] of Object.entries(next) as [keyof LineItemValues, never][]) {
      form.setFieldValue(name, value, { dontValidate: true, dontUpdateMeta: true });
      if (form.getFieldMeta(name)?.errors.length) void form.validateField(name, "change");
    }
  };

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

  const isService = values.type === "SERVICE";

  return (
    <form.AppForm>
      <form.Form className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* The submit button used to be disabled until all four were filled,
              which said nothing about *which* was missing — and the one most
              often missed is the item type, whose two radios read as optional
              when nothing is selected. So the button always acts. */}
          <form.AppField name="type" validators={{ onChange: rules(required("Item type")) }}>
            {(field) => (
              <field.CustomField<string> id="line-item-type" label="Item type">
                {({ value, invalid, onChange }) => (
                  <RadioGroup
                    value={value}
                    onValueChange={onChange}
                    aria-invalid={invalid || undefined}
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
                        <RadioGroupItem
                          value={option.value}
                          id={`line-item-type-${option.value}`}
                        />
                        {option.label}
                      </label>
                    ))}
                  </RadioGroup>
                )}
              </field.CustomField>
            )}
          </form.AppField>

          {/* `modal` was how this popover got a scrollable list: it lives inside a
            Dialog, flux's PopoverContent portals to document.body — outside the
            Dialog's subtree — and the Dialog's react-remove-scroll lock cancels
            the wheel out there. flux 0.3.3 fixes that for every popover
            (ScrollLockTakeover in PopoverContent), so `modal` is no longer needed
            for scrolling. Kept because it also keeps the suggestion list as its
            own layer; drop it if this should stop trapping focus. */}
          <Popover
            modal
            open={suggestionsOpen && matches.length > 0}
            onOpenChange={setSuggestionsOpen}
          >
            <PopoverAnchor asChild>
              <div>
                <form.AppField
                  name="description"
                  validators={{ onChange: rules(required("Item name")) }}
                >
                  {(field) => (
                    <field.TextField
                      id="line-item-name"
                      label="Item name"
                      autoFocus
                      autoComplete="off"
                      inputClassName="shadow-none"
                      placeholder="e.g. Logo design, Consulting fee…"
                      onFocus={() => setSuggestionsOpen(true)}
                      onValueChange={() => setSuggestionsOpen(true)}
                    />
                  )}
                </form.AppField>
              </div>
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
                      fillFromSuggestion({
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
            <form.AppField name="unitPrice" validators={{ onChange: rules(required("Rate")) }}>
              {(field) => (
                <field.CustomField<string> id="line-item-rate" label="Rate">
                  {({ id, value, invalid, onChange, onBlur }) => (
                    <InputGroup className="shadow-none">
                      <InputGroupAddon>
                        <InputGroupText>{currencySymbol}</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id={id}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={value}
                        onBlur={onBlur}
                        onChange={(e) => onChange(e.target.value)}
                        aria-invalid={invalid || undefined}
                      />
                    </InputGroup>
                  )}
                </field.CustomField>
              )}
            </form.AppField>

            <form.AppField name="quantity" validators={{ onChange: rules(required("Quantity")) }}>
              {(field) => (
                <field.TextField
                  id="line-item-qty"
                  label="Quantity"
                  inputMode="numeric"
                  inputClassName="shadow-none"
                />
              )}
            </form.AppField>
          </div>

          {/* Required only while "Save to SKU catalogue" is on, so the * follows
              that toggle and the rule reads the toggle and the type at check time. */}
          <form.AppField
            name="hsn"
            validators={{
              onChange: ({ value, fieldApi }) =>
                hsnError(
                  value,
                  fieldApi.form.getFieldValue("saveAsSku"),
                  fieldApi.form.getFieldValue("type")
                ),
            }}
          >
            {(field) => (
              <field.TextField
                id="line-item-hsn"
                label={isService ? "SAC code" : "HSN code"}
                required={!!values.saveAsSku}
                inputMode="numeric"
                inputClassName="shadow-none"
                placeholder={isService ? "e.g. 998314" : "e.g. 8471"}
              />
            )}
          </form.AppField>

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
                    if (!checked) form.setFieldValue("gstRate", "");
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
                      onClick={() => form.setFieldValue("gstRate", option.value)}
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
                onCheckedChange={(checked) => {
                  form.setFieldValue("saveAsSku", checked);
                  // The tax-code rule follows the toggle: re-check it if it is
                  // already showing, or if the merchant has edited it.
                  const hsnMeta = form.getFieldMeta("hsn");
                  if (hsnMeta?.isTouched || hsnMeta?.errors.length) {
                    void form.validateField("hsn", "change");
                  }
                }}
                aria-label="Save item to SKU catalogue"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-border px-6 py-4">
          {/* Never disabled: a dead button cannot say why it is dead. Pressing it
              with something missing is what surfaces the messages above. */}
          <form.SubmitButton size="md" className="w-full">
            {editingItem ? "Save changes" : "Add item"}
          </form.SubmitButton>
          <Button type="button" variant="secondary" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

/** Re-exported so the section can render the same "no items" affordance. */
export { EMPTY as EMPTY_LINE_ITEM };
