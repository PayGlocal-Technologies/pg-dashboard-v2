"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { withBasePath } from "@/constants/basePath";
import { formatEpochDay } from "@/features/dashboard/invoice-templates/helpers";
import { TEMPLATE_NAME_MAX_LENGTH } from "@/features/dashboard/invoice-templates/constants";
import type { InvoiceTemplate } from "@/features/dashboard/invoice-templates/types";

/**
 * Quick template maintenance, from inside the invoice editor.
 *
 * This dialog used to be the ONLY place templates lived, which is why "Edit"
 * here meant "navigate to a fresh invoice with the template applied" and why
 * the only thing it could actually change was a name. Templates now have their
 * own page, so this is the shortcut rather than the home: rename, duplicate and
 * delete, plus a way out to the full editor.
 *
 * It stays a dialog on purpose. Routing a merchant away from a half-filled
 * invoice to rename a template would cost them their work, so both ways out of
 * here — one template's editor, and the templates page — open in a new tab.
 */
export function ManageTemplatesDialog({
  open,
  onOpenChange,
  templates,
  isReady,
  isMutatingId,
  activeTemplateId,
  onRename,
  onDuplicate,
  onDelete,
  isNameTaken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: InvoiceTemplate[];
  /**
   * False while the list is still loading.
   *
   * Without this the dialog rendered its empty state during the fetch, and from
   * a cold cache that is what a merchant saw first: "No templates available",
   * confidently, about templates they had.
   */
  isReady: boolean;
  /**
   * Whether this template has a request in flight.
   *
   * Per template rather than one global flag, so deleting one no longer greys
   * out the actions on every other row.
   */
  isMutatingId: (templateId: string) => boolean;
  /** The template the open invoice was built from, if any. */
  activeTemplateId: string | null;
  onRename: (templateId: string, name: string) => void;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  isNameTaken: (name: string, exceptId: string | null) => boolean;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  /**
   * The row asking to be confirmed before it is deleted.
   *
   * The templates page can offer delete with no confirmation because it holds
   * the request for DELETE_UNDO_MS and puts an Undo in the toast. This dialog
   * cannot: it hands straight off to the caller's `onDelete`, which issues the
   * request immediately, so the only thing standing between a mis-click and a
   * template the merchant has to rebuild is this. Inline on the row rather than
   * a second modal stacked over the list — over a list of rows, a nested modal
   * leaves it unclear which one is about to go.
   */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const reset = () => {
    setRenamingId(null);
    setRenameValue("");
    setPendingDeleteId(null);
  };

  const renameError =
    renamingId && renameValue.trim() && isNameTaken(renameValue, renamingId)
      ? "Another template already has that name."
      : null;

  const commitRename = () => {
    const name = renameValue.trim();
    if (!renamingId || !name || renameError) return;
    onRename(renamingId, name);
    reset();
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
        <DialogDescription>
          Rename, duplicate or delete a saved template. To change what a template contains, open it
          on the templates page.
        </DialogDescription>

        {!isReady ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <Shimmer key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          /* The old copy here said templates were "automatically added" when you
             create an invoice. They never were: saving one is always an explicit
             choice, and a merchant who believed otherwise would wait forever. */
          <EmptyState
            className="mt-4"
            title="No templates yet"
            description="Set up an invoice's items, notes and branding, then choose Save as template from the Generate menu."
          />
        ) : (
          <div className="mt-4 max-h-[22rem] divide-y divide-border overflow-y-auto">
            {templates.map((template) => {
              const isRenaming = renamingId === template.id;
              const isMutating = isMutatingId(template.id);
              const isActive = template.id === activeTemplateId;
              const isConfirmingDelete = pendingDeleteId === template.id;

              if (isRenaming) {
                return (
                  <div key={template.id} className="py-3 first:pt-0 last:pb-0">
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
                        disabled={!renameValue.trim() || !!renameError || isMutating}
                        onClick={commitRename}
                      >
                        {isMutating ? "Saving…" : "Save"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={reset}>
                        Cancel
                      </Button>
                    </div>
                    {/* The row's own detail stays visible above, so the context
                        you would rename against does not vanish mid-edit. */}
                    <p className="mt-1 truncate text-[11.5px] text-muted-foreground">
                      {template.description}
                    </p>
                    {renameError && (
                      <p className="mt-1 text-[11.5px] text-destructive">{renameError}</p>
                    )}
                  </div>
                );
              }

              return (
                <div key={template.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p
                      title={template.name}
                      className="truncate text-[13.5px] font-medium text-foreground"
                    >
                      {template.name}
                      {isActive && (
                        <span className="ml-2 text-[11px] font-normal text-primary">
                          Used by this invoice
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {template.description}
                    </p>
                    {/* Recency, not frequency. The API records `lastUsedAt` and
                        no counter, and for a picker "used last week" is a better
                        prompt than "used nine times in March". */}
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {template.lastUsedAt
                        ? `Last used ${formatEpochDay(template.lastUsedAt)}`
                        : "Never used"}
                      {formatEpochDay(template.savedAt) &&
                        ` · saved ${formatEpochDay(template.savedAt)}`}
                    </p>
                  </div>

                  {isConfirmingDelete ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[12px] text-muted-foreground">Delete?</span>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => {
                          setPendingDeleteId(null);
                          onDelete(template.id);
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Actions for ${template.name}`}
                          className="h-7 w-7 shrink-0 p-0"
                          disabled={isMutating}
                        >
                          <Icon name="more-horizontal" className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          // A new tab, not a navigation: editing a template is a
                          // side trip, and the merchant has a half-filled invoice
                          // behind this dialog. withBasePath because window.open
                          // is handed to the browser as-is — Next only prefixes
                          // /app-v2 for framework navigation. See basePath.ts.
                          onSelect={() =>
                            window.open(
                              withBasePath(`/invoice-template/${template.id}`),
                              "_blank",
                              "noopener"
                            )
                          }
                        >
                          <Icon name="expand" className="mr-2 h-3.5 w-3.5" />
                          Edit contents
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDuplicate(template.id)}>
                          <Icon name="copy" className="mr-2 h-3.5 w-3.5" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setPendingDeleteId(null);
                            setRenamingId(template.id);
                            setRenameValue(template.name);
                          }}
                        >
                          <Icon name="pencil" className="mr-2 h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setPendingDeleteId(template.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Icon name="trash-2" className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end border-t border-border pt-4">
          {/* A new tab, like "Edit contents" above and for the same reason:
              there is a half-filled invoice behind this dialog. It autosaves,
              so a same-tab navigation would usually be survivable — but "would
              usually be" is not a promise worth making about someone's work
              when a tab costs nothing. withBasePath because window.open is
              handed to the browser as-is; Next only prefixes /app-v2 for
              framework navigation. See basePath.ts. */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            rightIcon={<Icon name="arrow-up-right" className="h-3.5 w-3.5" />}
            onClick={() =>
              window.open(withBasePath("/mca-invoices/templates"), "_blank", "noopener")
            }
          >
            Open templates page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
