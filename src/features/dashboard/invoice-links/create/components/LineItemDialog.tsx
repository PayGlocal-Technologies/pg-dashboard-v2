"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  RadioGroup,
  RadioGroupItem,
  Switch,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { validateLineItem } from "@/features/dashboard/invoice-links/create/helpers";
import type { InvoiceLineItem } from "@/features/dashboard/invoice-links/create/types";

export type LineItemValues = Omit<InvoiceLineItem, "key">;

const EMPTY: LineItemValues = {
  description: "",
  itemCode: "",
  ppu: "",
  qty: "1",
  tax: "",
  itemType: undefined,
};

const ITEM_TYPE_OPTIONS = [
  { label: "Good", value: "GOOD" },
  { label: "Service", value: "SERVICE" },
] as const;

/** Quick picks for the line's tax. Any other rate can be typed. */
const TAX_RATE_CHIPS = ["5", "12", "18", "28"] as const;

type FieldKey = "itemType" | "description" | "ppu" | "qty" | "itemCode" | "tax";
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Form order, which is also the order a failed submit walks to pick focus. */
const FIELD_ORDER: FieldKey[] = ["itemType", "description", "ppu", "qty", "itemCode", "tax"];

const FIELD_IDS: Record<FieldKey, string> = {
  itemType: "link-item-type-GOOD",
  description: "link-item-name",
  ppu: "link-item-rate",
  qty: "link-item-qty",
  itemCode: "link-item-code",
  tax: "link-item-tax",
};

/**
 * The row rules invoice links already enforce (validateLineItem), plus Good /
 * Service. The type is required because the templates API reads it as an enum
 * and rejects a blank one; on the invoice itself it only decides whether the
 * code is labelled HSN or SAC.
 */
function validate(values: LineItemValues): FieldErrors {
  const errors: FieldErrors = { ...validateLineItem({ key: "", ...values }) };
  if (!values.itemType) errors.itemType = "Pick whether this is a good or a service.";
  // The catalogue rejects an item with no tax code, and its import runs after
  // the invoice link is already created, so ask now — create-invoice's rule.
  if (values.saveAsSku && !values.itemCode.trim()) {
    errors.itemCode =
      values.itemType === "SERVICE"
        ? "Enter a SAC code to save this to your catalogue."
        : "Enter an HSN code to save this to your catalogue.";
  }
  return errors;
}

/**
 * Add or edit an invoice-link line item.
 *
 * Laid out like create-invoice's AddLineItemDialog, over the invoice-link item
 * instead: the tax is this line's own percentage (`gstPercentage` on the wire),
 * not a fixed GST slab, so it is a free rate with quick picks. Nothing here
 * saves to the SKU catalogue: the invoice-link payload has no field for it.
 *
 * A line linked to a catalogue SKU stays linked only while its name, code and
 * price are the catalogue's; changing any of them here makes it the merchant's
 * own line, the same rule the inline Rate field follows.
 */
export function LineItemDialog({
  open,
  onOpenChange,
  currencySymbol,
  editingItem,
  initialDescription,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencySymbol: string;
  /** null when adding. */
  editingItem: InvoiceLineItem | null;
  /** Seeds the name when opened from "Add "…"" for an unmatched search. */
  initialDescription?: string;
  onSubmit: (values: LineItemValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>{editingItem ? "Edit line item" : "Add line item"}</DialogTitle>
        </div>
        <LineItemBody
          // Remount per open/target so fields start from the right values and
          // no stale validation carries over.
          key={`${open ? "open" : "closed"}-${editingItem?.key ?? initialDescription ?? "new"}`}
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
  currencySymbol,
  editingItem,
  initialDescription,
  onCancel,
  onSubmit,
}: {
  currencySymbol: string;
  editingItem: InvoiceLineItem | null;
  initialDescription?: string;
  onCancel: () => void;
  onSubmit: (values: LineItemValues) => void;
}) {
  const [values, setValues] = useState<LineItemValues>(() => {
    if (!editingItem) return { ...EMPTY, description: initialDescription ?? "" };
    const { key: _key, ...rest } = editingItem;
    return rest;
  });
  const [showTax, setShowTax] = useState(Number(editingItem?.tax) > 0);
  const [errors, setErrors] = useState<FieldErrors>({});

  const patch = (next: Partial<LineItemValues>) => {
    setValues((prev) => ({ ...prev, ...next }));
    // Cleared as soon as the field is answered.
    setErrors((prev) => {
      const cleared = { ...prev };
      for (const key of Object.keys(next)) delete cleared[key as FieldKey];
      return cleared;
    });
  };

  const handleSubmit = () => {
    const found = validate(values);
    setErrors(found);
    const firstMissing = FIELD_ORDER.find((field) => found[field]);
    if (firstMissing) {
      document.getElementById(FIELD_IDS[firstMissing])?.focus();
      return;
    }

    const next: LineItemValues = {
      ...values,
      description: values.description.trim(),
      itemCode: values.itemCode.trim(),
      tax: showTax ? values.tax : "",
    };
    // Overriding what the catalogue says detaches the line from its SKU.
    if (
      next.skuId &&
      editingItem &&
      (next.description !== editingItem.description ||
        next.itemCode !== editingItem.itemCode ||
        next.ppu !== editingItem.ppu)
    ) {
      delete next.skuId;
    }
    onSubmit(next);
  };

  const isService = values.itemType === "SERVICE";

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <Field>
          <FieldLabel>
            Item type <span className="text-destructive">*</span>
          </FieldLabel>
          <RadioGroup
            value={values.itemType ?? ""}
            onValueChange={(next) => patch({ itemType: next })}
            aria-invalid={!!errors.itemType || undefined}
            // flex-row is explicit: RadioGroup defaults to flex-col.
            className="flex flex-row items-center gap-5"
          >
            {ITEM_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-[13.5px] font-medium text-foreground"
              >
                <RadioGroupItem value={option.value} id={`link-item-type-${option.value}`} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
          {errors.itemType && <FieldError>{errors.itemType}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="link-item-name">
            Item name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="link-item-name"
            autoFocus
            autoComplete="off"
            className="shadow-none"
            placeholder="e.g. Logo design, Consulting fee…"
            value={values.description}
            onChange={(e) => patch({ description: e.target.value })}
            aria-invalid={!!errors.description || undefined}
          />
          {errors.description && <FieldError>{errors.description}</FieldError>}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="link-item-rate">
              Rate <span className="text-destructive">*</span>
            </FieldLabel>
            <InputGroup className="shadow-none">
              <InputGroupAddon>
                <InputGroupText>{currencySymbol}</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="link-item-rate"
                inputMode="decimal"
                placeholder="0.00"
                value={values.ppu}
                onChange={(e) => patch({ ppu: e.target.value })}
                aria-invalid={!!errors.ppu || undefined}
              />
            </InputGroup>
            {errors.ppu && <FieldError>{errors.ppu}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="link-item-qty">
              Quantity <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="link-item-qty"
              inputMode="numeric"
              className="shadow-none"
              value={values.qty}
              onChange={(e) => patch({ qty: e.target.value })}
              aria-invalid={!!errors.qty || undefined}
            />
            {errors.qty && <FieldError>{errors.qty}</FieldError>}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="link-item-code">
            {isService ? "SAC code" : "HSN code"}
            {values.saveAsSku ? (
              <span className="text-destructive"> *</span>
            ) : (
              <span className="font-normal text-muted-foreground"> (optional)</span>
            )}
          </FieldLabel>
          <Input
            id="link-item-code"
            className="shadow-none"
            placeholder={isService ? "e.g. 998314" : "e.g. 8471"}
            value={values.itemCode}
            onChange={(e) => patch({ itemCode: e.target.value })}
            aria-invalid={!!errors.itemCode || undefined}
          />
          {errors.itemCode && <FieldError>{errors.itemCode}</FieldError>}
        </Field>

        <div className={cn(showTax && "border-b border-border")}>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-foreground">Add tax</p>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Optional
              </span>
            </div>
            <Switch
              checked={showTax}
              onCheckedChange={(checked) => {
                setShowTax(checked);
                if (!checked) patch({ tax: "" });
              }}
              aria-label="Toggle tax on this item"
            />
          </div>

          {showTax && (
            <div className="space-y-2 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                {TAX_RATE_CHIPS.map((rate) => (
                  <Button
                    key={rate}
                    type="button"
                    variant={values.tax === rate ? "primary" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => patch({ tax: rate })}
                  >
                    {rate}%
                  </Button>
                ))}
                <InputGroup className="w-28 shadow-none">
                  <InputGroupInput
                    id="link-item-tax"
                    inputMode="decimal"
                    placeholder="Other"
                    aria-label="Tax rate percent"
                    value={
                      TAX_RATE_CHIPS.includes(values.tax as (typeof TAX_RATE_CHIPS)[number])
                        ? ""
                        : values.tax
                    }
                    onChange={(e) => patch({ tax: e.target.value })}
                    aria-invalid={!!errors.tax || undefined}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>%</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              {errors.tax && <FieldError>{errors.tax}</FieldError>}
            </div>
          )}
        </div>

        {/* Not offered for a line already from the catalogue: it is there. */}
        {!values.skuId && (
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
                patch({ saveAsSku: checked });
                // Turning it off makes the code optional again.
                if (!checked) setErrors((prev) => ({ ...prev, itemCode: undefined }));
              }}
              aria-label="Save item to SKU catalogue"
            />
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border px-6 py-4">
        {/* Never disabled: pressing it with something missing is what names it. */}
        <Button type="button" variant="primary" className="w-full" onClick={handleSubmit}>
          {editingItem ? "Save changes" : "Add item"}
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}
