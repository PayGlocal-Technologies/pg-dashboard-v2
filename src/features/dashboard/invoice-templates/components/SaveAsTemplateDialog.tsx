"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { TEMPLATE_NAME_MAX_LENGTH } from "@/features/dashboard/invoice-templates/constants";
import type { InvoiceTemplateSnapshot } from "@/features/dashboard/invoice-templates/types";

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
  isNameTaken,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What will be stored. Used for the summary; null while the form is empty. */
  snapshot: InvoiceTemplateSnapshot | null;
  /**
   * The shared duplicate-name rule, from the templates hook.
   *
   * A predicate rather than a list of names this dialog compares itself. It
   * used to take `existingNames` and lower-case both sides, which is the same
   * rule as `isNameTakenIn` right up until a stored name has a stray trailing
   * space — that one trims, this one did not, so the same name was a duplicate
   * to the rename controls and not to this dialog. See the Names block in
   * helpers.ts: one implementation, no re-derivation.
   */
  isNameTaken: (name: string) => boolean;
  /** True while the POST is in flight. */
  isSaving: boolean;
  onSave: (name: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Save as template</DialogTitle>
        <SaveBody
          // Remount per open so the field never reopens holding the last name.
          key={open ? "open" : "closed"}
          snapshot={snapshot}
          isNameTaken={isNameTaken}
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
  isNameTaken,
  isSaving,
  onCancel,
  onSave,
}: {
  snapshot: InvoiceTemplateSnapshot | null;
  isNameTaken: (name: string) => boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const isDuplicate = isNameTaken(trimmed);
  const error = !trimmed
    ? "Give the template a name."
    : isDuplicate
      ? "A template with that name already exists."
      : null;

  const captured = snapshot
    ? [
        `${snapshot.lineItems.length} line item${snapshot.lineItems.length === 1 ? "" : "s"}`,
        `Currency (${snapshot.currency || "not set"})`,
        "Discount and tax",
        "Memo, notes and LUT",
        "Branding: theme and colours",
        snapshot.isRecurring ? "Recurring schedule" : "Due-date term",
      ]
    : [];

  const excluded = [
    "Client",
    "Invoice number",
    "Issue and due dates",
    "Receiving account",
    "Declaration",
  ];

  return (
    <div className="mt-4">
      <Field>
        <FieldLabel htmlFor="template-name">Template name</FieldLabel>
        <Input
          id="template-name"
          autoFocus
          maxLength={TEMPLATE_NAME_MAX_LENGTH}
          placeholder="e.g. Monthly retainer, Design sprint"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {touched && error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldDescription>Only you and your team see this name.</FieldDescription>
        )}
      </Field>

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

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!!error || !snapshot || isSaving}
          leftIcon={<Icon name="bookmark" className="h-3.5 w-3.5" />}
          onClick={() => onSave(trimmed)}
        >
          {isSaving ? "Saving…" : "Save template"}
        </Button>
      </div>
    </div>
  );
}
