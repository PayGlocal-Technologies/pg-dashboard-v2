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
import type { LineItemDraft } from "@/features/dashboard/create-invoice/types";

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

  const matches = useMemo(() => {
    const query = values.description.trim().toLowerCase();
    if (!query) return [];
    return suggestions.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 6);
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
          className="flex items-center gap-5"
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

      <Popover open={suggestionsOpen && matches.length > 0} onOpenChange={setSuggestionsOpen}>
        <PopoverAnchor asChild>
          <Field>
            <FieldLabel htmlFor="line-item-name">Item name</FieldLabel>
            <Input
              id="line-item-name"
              autoFocus
              autoComplete="off"
              placeholder="e.g. Logo design, Consulting fee…"
              value={values.description}
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
          className="w-[var(--radix-popover-trigger-width)] p-1"
          // Keep focus in the input so typing continues to filter.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {matches.map((match) => (
            <Button
              key={match.name}
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => {
                patch({
                  description: match.name,
                  unitPrice: match.unitPrice ?? values.unitPrice,
                  hsn: match.hsn ?? values.hsn,
                  type: match.type ?? values.type,
                });
                setSuggestionsOpen(false);
              }}
            >
              <span className="truncate">{match.name}</span>
              {match.unitPrice && (
                <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                  {currencySymbol}
                  {match.unitPrice}
                </span>
              )}
            </Button>
          ))}
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
