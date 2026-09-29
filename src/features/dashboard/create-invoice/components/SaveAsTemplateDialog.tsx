"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useAppForm } from "@/components/form/AppForm";
import { check, required, rules } from "@/components/form/rules";
import { TEMPLATE_NAME_MAX_LENGTH } from "@/features/dashboard/create-invoice/constants";
import type { InvoiceTemplateSnapshot } from "@/features/dashboard/create-invoice/types";

/**
 * Names a new template.
 *
 * The list of what travels and what does not is on screen rather than in a help
 * article, because "save as template" is otherwise a promise of unknown size:
 * a merchant who assumes the client came along will send the next invoice to the
 * wrong company. Both columns are generated from the snapshot being saved, so
 * they cannot drift from what `toTemplateSnapshot` actually captured.
 */
export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  snapshot,
  existingNames,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What will be stored. Used for the summary; null while the form is empty. */
  snapshot: InvoiceTemplateSnapshot | null;
  /** Rejected as duplicates, case-insensitively. */
  existingNames: string[];
  /** True while the POST is in flight. */
  isSaving: boolean;
  onSave: (name: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-md flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>Save as template</DialogTitle>
        </div>
        <SaveBody
          // Remount per open so the field never reopens holding the last name.
          key={open ? "open" : "closed"}
          snapshot={snapshot}
          existingNames={existingNames}
          isSaving={isSaving}
          onCancel={() => onOpenChange(false)}
          // Deliberately does not close: saving is a request now, and the caller
          // closes this on success. Closing here would report a template saved
          // before the server had accepted it, and a failure would then have
          // nowhere to land but a toast over an empty screen.
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

function SaveBody({
  snapshot,
  existingNames,
  isSaving,
  onCancel,
  onSave,
}: {
  snapshot: InvoiceTemplateSnapshot | null;
  existingNames: string[];
  isSaving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const isDuplicate = (name: string) =>
    existingNames.some((existing) => existing.toLowerCase() === name.trim().toLowerCase());

  const form = useAppForm({
    defaultValues: { name: "" },
    onSubmit: ({ value }) => onSave(value.name.trim()),
  });

  const captured = snapshot
    ? [
        `${snapshot.lineItems.length} line item${snapshot.lineItems.length === 1 ? "" : "s"}`,
        `Currency (${snapshot.currency || "not set"})`,
        "Discount and tax",
        "Receiving account",
        "Memo, notes and LUT",
        "Branding: theme and colours",
        snapshot.isRecurring ? "Recurring schedule" : "Due-date term",
      ]
    : [];

  const excluded = ["Client", "Invoice number", "Issue and due dates", "Declaration"];

  return (
    <form.AppForm>
      <form.Form className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <form.AppField
            name="name"
            validators={{
              onChange: rules(
                required("Template name"),
                check(
                  (name: string) => isDuplicate(name) && "A template with that name already exists."
                )
              ),
            }}
          >
            {(field) => (
              <field.TextField
                id="template-name"
                label="Template name"
                autoFocus
                maxLength={TEMPLATE_NAME_MAX_LENGTH}
                placeholder="e.g. Monthly retainer, Design sprint"
                description="Only you and your team see this name."
              />
            )}
          </form.AppField>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Saved
              </p>
              <ul className="space-y-1">
                {captured.map((label) => (
                  <li key={label} className="flex items-start gap-1.5 text-[12px] text-foreground">
                    <Icon name="check" className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Decided per invoice
              </p>
              <ul className="space-y-1">
                {excluded.map((label) => (
                  <li
                    key={label}
                    className="flex items-start gap-1.5 text-[12px] text-muted-foreground"
                  >
                    <Icon name="x" className="mt-0.5 h-3 w-3 shrink-0" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          {/* The name never disables Save: an empty or duplicate name shows under
            the field. Only an empty invoice gates it, since there is nothing
            to save. */}
          <form.SubmitButton
            disabledReason={snapshot ? null : "Add a line item or note first"}
            pending={isSaving}
            leftIcon={<Icon name="bookmark" className="h-3.5 w-3.5" />}
          >
            {isSaving ? "Saving…" : "Save template"}
          </form.SubmitButton>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
