"use client";

import { Field, FieldLabel, Textarea } from "@/components/ui";
import { FormSection } from "@/features/dashboard/sku-management/components/item-form/FormSection";
import type { SkuItemFormApi } from "@/features/dashboard/sku-management/components/item-form/useSkuItemForm";

/** Optional notes carried through to invoices. No section heading — the
 *  field's own label already names it, and a second heading above one field
 *  would read as a group that isn't there. */
export function DescriptionSection({ form }: { form: SkuItemFormApi }) {
  return (
    <FormSection>
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
    </FormSection>
  );
}
