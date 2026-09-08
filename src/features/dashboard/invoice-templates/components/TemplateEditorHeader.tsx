"use client";

import { Button, Input } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { TEMPLATE_NAME_MAX_LENGTH } from "@/features/dashboard/invoice-templates/constants";

export type SaveState = "clean" | "dirty" | "saving" | "saved";

/**
 * The template editor's header.
 *
 * Deliberately not the invoice editor's. The invoice autosaves 1.2s after a
 * keystroke and its primary action issues a document; a template saves only
 * when asked and its primary action writes a reusable shape. Two objects with
 * opposite persistence rules must not look identical, which is why the save
 * state is spelled out here rather than left for the merchant to infer.
 *
 * The name lives in the header rather than in a save dialog at the end. It is
 * the template's one required field, so asking for it up front is honest, and
 * it means the header can say which template you are editing.
 */
export function TemplateEditorHeader({
  name,
  nameError,
  saveState,
  isNew,
  canSave,
  onNameChange,
  onSave,
  onSaveAsNew,
  onClose,
}: {
  name: string;
  /** Empty or duplicate. Blocks save and renders under the field. */
  nameError: string | null;
  saveState: SaveState;
  isNew: boolean;
  canSave: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  /** Forks an existing template instead of overwriting it. Absent when new. */
  onSaveAsNew: () => void;
  onClose: () => void;
}) {
  // Nothing typed, nothing saved: the name is empty because the merchant has
  // not got to it, not because they cleared it.
  const isPristine = isNew && saveState === "clean" && !name;

  const status =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "dirty"
          ? "Unsaved changes"
          : isNew
            ? "Not saved yet"
            : "No changes";

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-5 py-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Close"
        className="h-9 w-9 shrink-0 p-0"
        onClick={onClose}
      >
        <Icon name="x" className="h-4 w-4" />
      </Button>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {isNew ? "New template" : "Editing template"}
          </span>
          {/* Live region: the save state changes without the merchant moving
              focus, and it is the one thing on this page they must be able to
              trust without checking. */}
          <span aria-live="polite" className="text-[11px] text-muted-foreground">
            · {status}
          </span>
        </div>
        <Input
          value={name}
          maxLength={TEMPLATE_NAME_MAX_LENGTH}
          placeholder="e.g. Monthly retainer, Design sprint"
          aria-label="Template name"
          aria-invalid={!!nameError && !isPristine}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-8 max-w-[24rem] border-transparent bg-transparent px-1 text-[15px] font-semibold shadow-none hover:border-border focus:border-border"
        />
        {/* A disabled primary action always says why. On a pristine new
            template that reason is not a mistake yet, so it reads as a prompt
            rather than an error; once the merchant has typed, it is a real
            validation message. */}
        {nameError ? (
          <p
            className={cn(
              "px-1 text-[11.5px]",
              isPristine ? "text-muted-foreground" : "text-destructive"
            )}
          >
            {isPristine ? "Name your template to save it." : nameError}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!isNew && (
          /* Forking, not overwriting. An invoice that has outgrown its
             template becomes a new one this way, without the merchant having
             to duplicate first and edit second. */
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!canSave}
            onClick={onSaveAsNew}
          >
            Save as new
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!canSave}
          isLoading={saveState === "saving"}
          leftIcon={<Icon name="bookmark" className="h-3.5 w-3.5" />}
          onClick={onSave}
        >
          Save template
        </Button>
      </div>
    </header>
  );
}
