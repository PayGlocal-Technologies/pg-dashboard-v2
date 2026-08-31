"use client";

import { FormSection } from "@/features/dashboard/sku-management/components/item-form/FormSection";
import { SkuMediaUpload } from "@/features/dashboard/sku-management/components/SkuMediaUpload";
import type { SkuItemFormApi } from "@/features/dashboard/sku-management/components/item-form/useSkuItemForm";

/** The item's product image — one, which is what the catalogue stores.
 *  Unvalidated: an item may ship without artwork. */
export function MediaSection({
  form,
  savedImageUrl,
}: {
  form: SkuItemFormApi;
  /** The image the item already has, so discarding a replacement restores it
   *  rather than emptying the slot. See SkuMediaUpload. */
  savedImageUrl?: string;
}) {
  return (
    <FormSection title="Media" className="gap-2">
      <form.Field name="image">
        {(field) => (
          <SkuMediaUpload
            id="sku-media"
            value={field.state.value}
            onChange={(next) => field.handleChange(next)}
            savedImageUrl={savedImageUrl}
          />
        )}
      </form.Field>
    </FormSection>
  );
}
