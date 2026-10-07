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
import { TEMPLATE_NAME_MAX_LENGTH } from "@/features/dashboard/invoice-links/create/constants";

/**
 * Names a new template, listing what it will and will not carry so nobody
 * assumes the clients came along. The invoice-link counterpart of
 * create-invoice's SaveAsTemplateDialog; the lists differ because this editor
 * has no branding, bank account or recurrence to save.
 */
export function SaveTemplateDialog({
  open,
  onOpenChange,
  itemCount,
  currency,
  hasDueDate,
  existingNames,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  currency: string;
  hasDueDate: boolean;
  /** Rejected as duplicates, case-insensitively. */
  existingNames: string[];
  isSaving: boolean;
  /** Does not close the dialog: the caller closes it once the server accepts. */
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
          itemCount={itemCount}
          currency={currency}
          hasDueDate={hasDueDate}
          existingNames={existingNames}
          isSaving={isSaving}
          onCancel={() => onOpenChange(false)}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

function SaveBody({
  itemCount,
  currency,
  hasDueDate,
  existingNames,
  isSaving,
  onCancel,
  onSave,
}: {
  itemCount: number;
  currency: string;
  hasDueDate: boolean;
  existingNames: string[];
  isSaving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const isDuplicate = existingNames.some(
    (existing) => existing.toLowerCase() === trimmed.toLowerCase()
  );
  const error = !trimmed
    ? "Give the template a name."
    : isDuplicate
      ? "A template with that name already exists."
      : null;

  const captured = [
    `${itemCount} line item${itemCount === 1 ? "" : "s"}`,
    `Currency (${currency || "not set"})`,
    "Discount",
    "Memo and note",
    ...(hasDueDate ? ["Payment term (days until due)"] : []),
  ];

  const excluded = ["Clients", "Invoice number", ...(hasDueDate ? [] : ["Due date"])];

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <Field>
          <FieldLabel htmlFor="invoice-link-template-name">Template name</FieldLabel>
          <Input
            id="invoice-link-template-name"
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
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!!error || isSaving}
          leftIcon={<Icon name="bookmark" className="h-3.5 w-3.5" />}
          onClick={() => onSave(trimmed)}
        >
          {isSaving ? "Saving…" : "Save template"}
        </Button>
      </div>
    </>
  );
}
