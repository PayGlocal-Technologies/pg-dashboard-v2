"use client";

import {
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  SKU_TAX_CODE,
  SKU_TAX_CODE_FALLBACK,
  SKU_TYPE_OPTIONS,
} from "@/features/dashboard/sku-management/constants";
import {
  validateHsnSac,
  validateName,
  validateType,
} from "@/features/dashboard/sku-management/schemas";
import {
  FormSection,
  RequiredMark,
} from "@/features/dashboard/sku-management/components/item-form/FormSection";
import type { SkuItemFormApi } from "@/features/dashboard/sku-management/components/item-form/useSkuItemForm";
import type { SkuProductType } from "@/features/dashboard/sku-management/types";

/** What the item is: its name, what kind of thing it is, and the tax code it
 *  files under. */
export function ItemInformationSection({ form }: { form: SkuItemFormApi }) {
  return (
    <FormSection>
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
              {/* Names the field for both kinds of catalogue item; the table
                  still shows it under the Product column. */}
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

      {/* Type and the tax code share a row on desktop and stack on mobile —
          they're one thought: what this is, and how it's coded. */}
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
                  // follow the type, so its error is re-evaluated now rather
                  // than waiting for another blur on that field.
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
    </FormSection>
  );
}
