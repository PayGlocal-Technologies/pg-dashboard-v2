"use client";

import { useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { DUE_TERM_OPTIONS } from "@/features/dashboard/create-invoice/constants";
import { TEMPLATE_NAME_MAX_LENGTH } from "@/features/dashboard/invoice-templates/constants";
import { formatEpochDay } from "@/features/dashboard/invoice-templates/helpers";
import { TemplateThumbnail } from "@/features/dashboard/invoice-templates/components/TemplateThumbnail";
import type { InvoiceThemePalette } from "@/features/dashboard/create-invoice/hooks";
import type { InvoiceTemplate } from "@/features/dashboard/invoice-templates/types";

/**
 * One saved template.
 *
 * Two departures from the row it replaces in the manage dialog:
 *
 *  - It shows what the template holds. A thumbnail, the item count and total,
 *    the currency, the term, the receiving account. The dialog offered one
 *    generated line ("3 items · USD · due 30 days"), which is the same string
 *    for two retainers billing two different clients.
 *  - Edit is the whole card, not an icon. Opening a template is the reason
 *    someone is on this page; rename, duplicate and delete are maintenance and
 *    live in the overflow, where their relative weight is honest.
 */
export function TemplateCard({
  template,
  palette,
  today,
  isMutating,
  isActive,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  isNameTaken,
}: {
  template: InvoiceTemplate;
  palette: InvoiceThemePalette;
  today: string;
  /** True only while THIS template has a request in flight. */
  isMutating: boolean;
  /** True when an invoice open elsewhere is built from this template. */
  isActive?: boolean;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isNameTaken: (name: string) => boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(template.name);

  const trimmed = draftName.trim();
  const renameError = !trimmed
    ? "Give the template a name."
    : isNameTaken(trimmed)
      ? "Another template already has that name."
      : null;

  const startRename = () => {
    setDraftName(template.name);
    setRenaming(true);
  };

  const commitRename = () => {
    if (renameError) return;
    onRename(trimmed);
    setRenaming(false);
  };

  const itemCount = template.snapshot.lineItems.length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
      <TemplateThumbnail template={template} palette={palette} today={today} />

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {renaming ? (
            /* The name edits in place, under the card it belongs to, rather
               than replacing the row — the description and dates are exactly
               the context you would use to pick a better name. */
            <div>
              <Input
                autoFocus
                maxLength={TEMPLATE_NAME_MAX_LENGTH}
                aria-label={`Rename ${template.name}`}
                aria-invalid={!!renameError}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="h-8 text-[13px]"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!!renameError || isMutating}
                  onClick={commitRename}
                >
                  {isMutating ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(false)}>
                  Cancel
                </Button>
              </div>
              {renameError && <p className="mt-1 text-[11.5px] text-destructive">{renameError}</p>}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {/* `title` because the name truncates: two templates differing
                    only in their tails are otherwise indistinguishable.
                    `[&>span]:min-w-0` lets flux's own children wrapper shrink,
                    which is what makes the truncate take effect. */}
                <Button
                  type="button"
                  variant="link"
                  onClick={onOpen}
                  title={template.name}
                  className="h-auto min-w-0 justify-start p-0 text-left text-[14px] font-semibold text-foreground hover:text-primary [&>span]:min-w-0 [&>span]:truncate"
                >
                  {template.name}
                </Button>
                {isActive && <StatusBadge variant="info" label="In use" size="sm" />}
              </div>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {template.description}
              </p>
            </>
          )}
        </div>

        {!renaming && (
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
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={onOpen}>
                <Icon name="expand" className="mr-2 h-3.5 w-3.5" />
                Edit template
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate}>
                <Icon name="copy" className="mr-2 h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={startRename}>
                <Icon name="pencil" className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* No confirm. Deleting is undoable for five seconds, which
                  costs nothing on the correct deletions and is a better
                  answer than a speed bump on all of them. */}
              <DropdownMenuItem
                onSelect={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Icon name="trash-2" className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-3 text-[11.5px]">
        <Fact label="Items" value={`${itemCount}`} />
        <Fact label="Currency" value={template.snapshot.currency || "Not set"} />
        <Fact
          label="Payment term"
          value={
            DUE_TERM_OPTIONS.find((option) => option.id === template.snapshot.dueTermId)?.label ??
            "Per invoice"
          }
        />
        <Fact
          label="Last used"
          value={template.lastUsedAt ? formatEpochDay(template.lastUsedAt) : "Never"}
        />
      </dl>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
