"use client";

import { Button } from "@/components/ui";

/**
 * The form's actions. "Save and add another" sits opposite the pair as a
 * link-style action, so it reads as a secondary route through the same form
 * rather than a third button competing with the primary CTA. It's absent in
 * edit mode, where there is no next item to add.
 */
export function ItemFormFooter({
  submitLabel,
  showAddAnother,
  onSaveAndAddAnother,
  onCancel,
}: {
  submitLabel: string;
  showAddAnother: boolean;
  onSaveAndAddAnother: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {showAddAnother ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0"
          onClick={onSaveAndAddAnother}
        >
          Save and add another
        </Button>
      ) : (
        // Placeholder so the Cancel/submit pair stays pinned right under the
        // layout's justify-between, with or without the link beside it.
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
    </>
  );
}
