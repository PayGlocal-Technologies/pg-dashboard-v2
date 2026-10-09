"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { buildDisplayFieldsRequest } from "@/features/dashboard/static-link/helpers";
import type {
  StaticLinkCollectedField,
  StaticLinkDisplayFieldsRequest,
} from "@/features/dashboard/static-link/types";

export const toRequiredKeys = (fields: StaticLinkCollectedField[]): string[] =>
  fields.filter((field) => field.required).map((field) => field.fieldKey);

/**
 * The details-to-collect checklist, shared by the Configure popover and the
 * Edit Static Link dialog: a ticked row is required at checkout, and a row
 * PayGlocal has pinned shows ticked, disabled and locked.
 */
export function CollectedFieldsChecklist({
  fields,
  requiredKeys,
  onToggle,
  className,
}: {
  fields: StaticLinkCollectedField[];
  requiredKeys: string[];
  onToggle: (field: StaticLinkCollectedField) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Your link doesn&apos;t collect any details yet.
        </p>
      ) : (
        fields.map((field) => {
          const id = `static-link-field-${field.fieldKey}`;
          const row = (
            <div className="flex items-center gap-2.5">
              <Checkbox
                id={id}
                checked={field.platformLocked || requiredKeys.includes(field.fieldKey)}
                disabled={field.platformLocked}
                onCheckedChange={() => onToggle(field)}
              />
              <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
                {field.label}
              </Label>
              {field.platformLocked && (
                <Icon name="lock" className="h-3 w-3 text-muted-foreground" aria-hidden />
              )}
            </div>
          );
          return field.platformLocked ? (
            <Tooltip key={field.fieldKey}>
              <TooltipTrigger asChild>{row}</TooltipTrigger>
              <TooltipContent>PayGlocal requires this detail</TooltipContent>
            </Tooltip>
          ) : (
            <div key={field.fieldKey}>{row}</div>
          );
        })
      )}
    </div>
  );
}

/**
 * "Configure": what the checkout asks a customer for before they pay through
 * the static link (pg-dashboard's CollectedFieldsDropdown).
 *
 * Ticking a row makes that detail required; it does not add or remove the
 * field, since the checkout's field set is the platform's and a merchant can
 * only move the required flag. Rows PayGlocal has pinned show ticked and
 * disabled. Edits are held until Save, so one PUT covers the panel, and only
 * the rows that changed are sent.
 */
export function CollectedFieldsPopover({
  fields,
  isSaving,
  disabled,
  onSave,
}: {
  fields: StaticLinkCollectedField[];
  isSaving: boolean;
  disabled?: boolean;
  onSave: (body: StaticLinkDisplayFieldsRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [requiredKeys, setRequiredKeys] = useState<string[]>([]);

  // Each opening starts from the server's answer, so abandoned ticks don't
  // linger and a save's refetch is what the next opening shows.
  const handleOpenChange = (next: boolean) => {
    if (next) setRequiredKeys(toRequiredKeys(fields));
    setOpen(next);
  };

  const toggle = (field: StaticLinkCollectedField) => {
    if (field.platformLocked) return;
    setRequiredKeys((keys) =>
      keys.includes(field.fieldKey)
        ? keys.filter((key) => key !== field.fieldKey)
        : [...keys, field.fieldKey]
    );
  };

  const save = () => {
    const displayFields = buildDisplayFieldsRequest(fields, requiredKeys);
    setOpen(false);
    // Nothing moved: an empty merge would still bump the link's updated time.
    if (displayFields.length) onSave({ displayFields });
  };

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      leftIcon={<Icon name="settings" className="h-3.5 w-3.5" />}
      className="text-[12.5px]"
    >
      Configure
    </Button>
  );

  if (disabled) {
    return (
      <Tooltip>
        {/* The span keeps the tooltip alive: a disabled button fires no
            pointer events of its own. */}
        <TooltipTrigger asChild>
          <span tabIndex={0}>{trigger}</span>
        </TooltipTrigger>
        <TooltipContent>Available once PayGlocal has set up your link</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <p className="text-sm font-semibold text-foreground">Details to collect</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Ticked details are required before a customer can pay. Some are set by PayGlocal and
          cannot be changed.
        </p>

        <CollectedFieldsChecklist
          fields={fields}
          requiredKeys={requiredKeys}
          onToggle={toggle}
          className="mt-3"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" isLoading={isSaving} onClick={save}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
