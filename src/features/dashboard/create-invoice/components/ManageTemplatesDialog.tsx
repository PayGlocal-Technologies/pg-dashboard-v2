"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  EmptyState,
  Input,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/utils/format";
import { TEMPLATE_NAME_MAX_LENGTH } from "@/features/dashboard/create-invoice/constants";
import type { InvoiceTemplate } from "@/features/dashboard/create-invoice/types";

/**
 * Rename and delete saved templates.
 *
 * Delete confirms inline, on the row, rather than in a second dialog stacked on
 * this one: a template is cheap to lose but annoying to rebuild, and a nested
 * modal over a list makes it unclear which row is about to go.
 */
export function ManageTemplatesDialog({
  open,
  onOpenChange,
  templates,
  onRename,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: InvoiceTemplate[];
  onRename: (templateId: string, name: string) => void;
  onDelete: (templateId: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // The most-used template, ignoring any that have never been applied. Null when
  // nothing has been used yet, so a fresh list carries no meaningless badge.
  const mostUsedId = templates.reduce<string | null>((topId, template) => {
    if (template.usageCount <= 0) return topId;
    const top = templates.find((candidate) => candidate.id === topId);
    return !top || template.usageCount > top.usageCount ? template.id : topId;
  }, null);

  const startRename = (template: InvoiceTemplate) => {
    setPendingDeleteId(null);
    setRenamingId(template.id);
    setRenameValue(template.name);
  };

  /**
   * True when another template already answers to this name.
   *
   * The save dialog has always rejected duplicates; rename did not, so the one
   * guard could be walked straight around — and two identically named templates
   * make the picker a coin toss.
   */
  const isDuplicateName = (name: string, exceptId: string | null): boolean =>
    templates.some(
      (template) =>
        template.id !== exceptId && template.name.toLowerCase() === name.trim().toLowerCase()
    );

  const renameError =
    renamingId && renameValue.trim() && isDuplicateName(renameValue, renamingId)
      ? "Another template already has that name."
      : null;

  const commitRename = () => {
    const name = renameValue.trim();
    if (!renamingId || !name || renameError) return;
    onRename(renamingId, name);
    setRenamingId(null);
    setRenameValue("");
  };

  const reset = () => {
    setRenamingId(null);
    setRenameValue("");
    setPendingDeleteId(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogTitle>Manage templates</DialogTitle>

        {templates.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No templates yet"
            description="Save an invoice as a template and it will appear here."
          />
        ) : (
          <div className="mt-4 divide-y divide-border">
            {templates.map((template) => {
              const isRenaming = renamingId === template.id;
              const isDeleting = pendingDeleteId === template.id;

              return (
                <div key={template.id} className="py-3 first:pt-0 last:pb-0">
                  {isRenaming ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          maxLength={TEMPLATE_NAME_MAX_LENGTH}
                          aria-label={`Rename ${template.name}`}
                          aria-invalid={!!renameError}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") reset();
                          }}
                          className="h-8 flex-1 text-[13px]"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={!renameValue.trim() || !!renameError}
                          onClick={commitRename}
                        >
                          Save
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={reset}>
                          Cancel
                        </Button>
                      </div>
                      {renameError && (
                        <p className="mt-1 text-[11.5px] text-destructive">{renameError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[13.5px] font-medium text-foreground">
                            {template.name}
                          </p>
                          {template.id === mostUsedId && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Most used
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {template.description}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          Saved{" "}
                          {formatDate(template.createdAt, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {template.usageCount > 0 &&
                            ` · used ${template.usageCount} time${template.usageCount === 1 ? "" : "s"}`}
                        </p>
                      </div>

                      {isDeleting ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[12px] text-muted-foreground">Delete?</span>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              onDelete(template.id);
                              setPendingDeleteId(null);
                            }}
                          >
                            Delete
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Keep
                          </Button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Rename ${template.name}`}
                            className="h-7 w-7 p-0"
                            onClick={() => startRename(template)}
                          >
                            <Icon name="pencil" className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${template.name}`}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setPendingDeleteId(template.id)}
                          >
                            <Icon name="trash-2" className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
