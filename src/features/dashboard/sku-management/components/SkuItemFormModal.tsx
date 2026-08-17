"use client";

import { useRef } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupInput,
  InputGroupText,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useBreakpoint,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/utils/format";
import {
  SKU_CURRENCY_OPTIONS,
  SKU_TAX_CODE,
  SKU_TAX_CODE_FALLBACK,
  SKU_TYPE_OPTIONS,
} from "@/features/dashboard/sku-management/constants";
import {
  emptySkuItemForm,
  validateCurrency,
  validateHsnSac,
  validateName,
  validateProductCost,
  validateSellingPrice,
  validateType,
} from "@/features/dashboard/sku-management/schemas";
import { SkuMediaUpload } from "@/features/dashboard/sku-management/components/SkuMediaUpload";
import type { SkuItemFormValues, SkuProductType } from "@/features/dashboard/sku-management/types";

/** Red asterisk before a required field's label — the same marker the Create
 *  MCA Link form uses, so required-ness reads identically across the product. */
function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}

/** Section heading inside the form. Groups fields by proximity rather than
 *  boxing each one, so the modal stays compact. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
      {children}
    </p>
  );
}

interface SkuItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled values for Edit; omit for a blank Add form. */
  initialValues?: SkuItemFormValues;
  /** "add" gets the Save-and-add-another affordance; "edit" doesn't. */
  mode?: "add" | "edit";
  /** Called with validated values. `keepOpen` distinguishes Add item from
   *  Save and add another, so the caller doesn't need two callbacks. */
  onSubmit: (values: SkuItemFormValues, keepOpen: boolean) => void;
}

export function SkuItemFormModal({
  open,
  onOpenChange,
  initialValues,
  mode = "add",
  onSubmit,
}: SkuItemFormModalProps) {
  const { isMobile } = useBreakpoint();

  const title = mode === "edit" ? "Edit item" : "Add item";
  const submitLabel = mode === "edit" ? "Save changes" : "Add item";

  const body = (
    <SkuItemFormBody
      key={
        // Remounts the form whenever the modal opens on a different item (or
        // reopens on a blank one), which is what discards a previous session's
        // half-typed values and validation state. Cheaper and harder to get
        // wrong than resetting every field in an effect.
        open ? (initialValues ? `edit-${initialValues.name}` : "add") : "closed"
      }
      title={title}
      submitLabel={submitLabel}
      showAddAnother={mode === "add"}
      initialValues={initialValues}
      onCancel={() => onOpenChange(false)}
      onSubmit={onSubmit}
    />
  );

  // Drawer on mobile, Dialog above it — the same responsive modal pairing
  // UploadInvoiceModal uses, so a form sheet behaves the same wherever it
  // appears in the product.
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} side="bottom">
        <DrawerContent className="flex max-h-[90vh] flex-col rounded-t-2xl p-0">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,48rem)] w-[min(100%-1.5rem,34rem)] max-w-none flex-col",
          "gap-0 overflow-hidden rounded-2xl p-0"
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function SkuItemFormBody({
  title,
  submitLabel,
  showAddAnother,
  initialValues,
  onCancel,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  showAddAnother: boolean;
  initialValues?: SkuItemFormValues;
  onCancel: () => void;
  onSubmit: (values: SkuItemFormValues, keepOpen: boolean) => void;
}) {
  // Which button started the submit. A ref, not state: it's read inside the
  // submit handler in the same tick it's written, and re-rendering on it would
  // be pointless.
  const keepOpenRef = useRef(false);

  const form = useForm({
    defaultValues: initialValues ?? emptySkuItemForm(),
    onSubmit: ({ value, formApi }) => {
      onSubmit(value, keepOpenRef.current);
      if (keepOpenRef.current) {
        // Save and add another: back to a blank form, ready to type into.
        formApi.reset(emptySkuItemForm());
      }
    },
  });

  const submitWith = (keepOpen: boolean) => {
    keepOpenRef.current = keepOpen;
    void form.handleSubmit();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitWith(false);
      }}
      className="flex min-h-0 flex-col"
      noValidate
    >
      {/* Header — the Dialog/Drawer's own close button sits at the top right,
          so the title row only carries the title. */}
      <div className="flex-shrink-0 border-b border-border px-5 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">{title}</h2>
      </div>

      {/* Only this middle band scrolls, so the footer actions stay reachable
          however tall the media strip grows. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        {/* ── Item information ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <form.Field
            name="name"
            validators={{
              onBlur: ({ value }) => validateName(value),
              onSubmit: ({ value }) => validateName(value),
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="sku-name">
                  {/* Names the field for both kinds of catalogue item; the
                      table still shows it under the Product column. */}
                  <RequiredMark /> Product/Service Name
                </FieldLabel>
                <Input
                  id="sku-name"
                  placeholder="e.g. Consulting services"
                  aria-invalid={field.state.meta.errors.length > 0}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>

          {/* Type and the tax code share a row on desktop and stack on mobile
              — they're one thought (what this is, and how it's coded). */}
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="type"
              validators={{
                onChange: ({ value }) => validateType(value),
                onSubmit: ({ value }) => validateType(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="sku-type">
                    <RequiredMark /> Type
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => {
                      field.handleChange(v as SkuProductType);
                      // The tax code's label, placeholder, and necessity all
                      // follow the type, so its error is re-evaluated here
                      // rather than waiting for another blur on that field.
                      form.validateField("hsnSac", "change");
                    }}
                  >
                    <SelectTrigger
                      id="sku-type"
                      aria-invalid={field.state.meta.errors.length > 0}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKU_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.type}>
              {(type) => {
                const scheme =
                  type === "GOODS" || type === "SERVICES"
                    ? SKU_TAX_CODE[type]
                    : SKU_TAX_CODE_FALLBACK;
                return (
                  <form.Field
                    name="hsnSac"
                    validators={{
                      onBlur: ({ value }) => validateHsnSac(value, form.getFieldValue("type")),
                      onSubmit: ({ value }) => validateHsnSac(value, form.getFieldValue("type")),
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="sku-hsn-sac">
                          {/* Named for the scheme that actually applies once a
                              type is chosen; the table column stays HSN/SAC. */}
                          <RequiredMark /> {scheme.label}
                        </FieldLabel>
                        <Input
                          id="sku-hsn-sac"
                          inputMode="numeric"
                          placeholder={scheme.placeholder}
                          aria-invalid={field.state.meta.errors.length > 0}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    )}
                  </form.Field>
                );
              }}
            </form.Subscribe>
          </div>
        </div>

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
          <SectionLabel>Pricing</SectionLabel>

          <form.Subscribe selector={(state) => state.values.currency}>
            {(currency) => {
              const symbol = currency ? currencySymbol(currency) : null;
              return (
                // Three across where there's room, stacking on mobile in the
                // order currency → selling price → product cost.
                <div className="grid gap-3 sm:grid-cols-3">
                  <form.Field
                    name="currency"
                    validators={{
                      onChange: ({ value }) => validateCurrency(value),
                      onSubmit: ({ value }) => validateCurrency(value),
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="sku-currency">
                          <RequiredMark /> Currency
                        </FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(v) => field.handleChange(v as typeof field.state.value)}
                        >
                          <SelectTrigger
                            id="sku-currency"
                            aria-invalid={field.state.meta.errors.length > 0}
                            // SelectTrigger already line-clamps its value span,
                            // but a flex child defaults to min-width:auto and
                            // so refuses to shrink below its content — which is
                            // why "AED United Arab Emirates" was pushing past
                            // the trigger in this third-width column instead of
                            // clipping. min-w-0 lets that clamp take effect.
                            className="w-full [&>span]:min-w-0"
                          >
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {SKU_CURRENCY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {/* The code never truncates and the country
                                    always does: whichever is dropped, the row
                                    still has to identify the currency. */}
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="shrink-0 font-medium">{option.value}</span>
                                  <span className="truncate text-muted-foreground">
                                    {option.country}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="sellingPrice"
                    validators={{
                      onBlur: ({ value }) => validateSellingPrice(value),
                      onSubmit: ({ value }) => validateSellingPrice(value),
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="sku-selling-price">
                          <RequiredMark /> Selling price
                        </FieldLabel>
                        <PriceInput id="sku-selling-price" symbol={symbol} field={field} />
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="productCost"
                    validators={{
                      onBlur: ({ value }) => validateProductCost(value),
                      onSubmit: ({ value }) => validateProductCost(value),
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="sku-product-cost">Product cost</FieldLabel>
                        <PriceInput id="sku-product-cost" symbol={symbol} field={field} />
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    )}
                  </form.Field>
                </div>
              );
            }}
          </form.Subscribe>
        </div>

        {/* ── Media ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Media</SectionLabel>
          <form.Field name="images">
            {(field) => (
              <SkuMediaUpload
                id="sku-media"
                value={field.state.value}
                onChange={(next) => field.handleChange(next)}
              />
            )}
          </form.Field>
        </div>

        {/* ── Description ──────────────────────────────────────────────── */}
        <form.Field name="description">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="sku-description">Description</FieldLabel>
              <Textarea
                id="sku-description"
                rows={3}
                placeholder="Optional notes that appear with the item on invoices"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </Field>
          )}
        </form.Field>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────
          Save and add another sits opposite the pair, as a link-style action,
          so it reads as a secondary route through the same form rather than a
          third button competing with the primary CTA. */}
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3.5">
        {showAddAnother ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            onClick={() => submitWith(true)}
          >
            Save and add another
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * A price field with its currency shown alongside, sharing one control. The
 * symbol is read-only — the Currency select above owns which currency applies,
 * and both prices follow it, so this is deliberately not flux's
 * CurrencyAmountInput (which pairs each amount with its own selector).
 */
function PriceInput({
  id,
  symbol,
  field,
}: {
  id: string;
  symbol: string | null;
  // The field API's full generic signature is enormous and changes with the
  // form's shape; only these three members are used here.
  field: {
    state: { value: string; meta: { errors: unknown[] } };
    handleChange: (value: string) => void;
    handleBlur: () => void;
  };
}) {
  return (
    // No height override: InputGroup's own h-11 is the same token Input and
    // SelectTrigger use, so the three pricing controls line up with each other
    // and with Product/Service Name and the tax code above them.
    <InputGroup>
      {symbol && (
        <InputGroupText className="shrink-0 pl-3 text-[13px] font-medium text-foreground">
          {symbol}
        </InputGroupText>
      )}
      <InputGroupInput
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0.00"
        aria-invalid={field.state.meta.errors.length > 0}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        className={cn(
          "bg-transparent text-[13px] tabular-nums",
          // Stepper arrows crowd a field this narrow.
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          symbol ? "pl-1.5" : "pl-3"
        )}
      />
    </InputGroup>
  );
}
