"use client";

import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { currencySymbol } from "@/lib/utils/format";
import { SKU_CURRENCY_OPTIONS } from "@/features/dashboard/sku-management/constants";
import {
  validateCurrency,
  validateProductCost,
  validateSellingPrice,
} from "@/features/dashboard/sku-management/schemas";
import {
  FormSection,
  RequiredMark,
} from "@/features/dashboard/sku-management/components/item-form/FormSection";
import { PriceInput } from "@/features/dashboard/sku-management/components/item-form/PriceInput";
import type { SkuItemFormApi } from "@/features/dashboard/sku-management/components/item-form/useSkuItemForm";
import type { SkuCurrency } from "@/features/dashboard/sku-management/types";

/**
 * What the item costs and sells for, in one currency. Boxed, because the three
 * fields only mean anything together: a price without its currency is a bare
 * number, and the margin between the two only reads if they share one.
 */
export function PricingSection({ form }: { form: SkuItemFormApi }) {
  return (
    <FormSection title="Pricing" boxed>
      <form.Subscribe selector={(state) => state.values.currency}>
        {(currency) => {
          // The chosen currency decorates both amounts; it never converts
          // them. Null until one is chosen, which is what hides the symbol
          // rather than guessing at a default.
          const symbol = currency ? currencySymbol(currency) : null;

          return (
            // Three across where there's room, stacking on mobile in the order
            // currency → selling price → product cost.
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
                      onValueChange={(v) => field.handleChange(v as SkuCurrency)}
                    >
                      <SelectTrigger
                        id="sku-currency"
                        aria-invalid={field.state.meta.errors.length > 0}
                        className="w-full"
                      >
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKU_CURRENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span className="font-medium">{option.value}</span>
                              <span className="text-muted-foreground">{option.country}</span>
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
    </FormSection>
  );
}
