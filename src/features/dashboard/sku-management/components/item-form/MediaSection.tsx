"use client";

import { FormSection } from "@/features/dashboard/sku-management/components/item-form/FormSection";
import { SkuMediaUpload } from "@/features/dashboard/sku-management/components/SkuMediaUpload";
import type { SkuItemFormApi } from "@/features/dashboard/sku-management/components/item-form/useSkuItemForm";

/** The item's product images, the first of which becomes what the table
 *  shows. Unvalidated: an item may ship without artwork. */
export function MediaSection({ form }: { form: SkuItemFormApi }) {
  return (
    <FormSection title="Media" className="gap-2">
      <form.Field name="images">
        {(field) => (
          <SkuMediaUpload
            id="sku-media"
            value={field.state.value}
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
    </FormSection>
  );
}
