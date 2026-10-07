"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
// Presentational date formatting, borrowed the same way ChipField is.
import { formatEpochDay } from "@/features/dashboard/create-invoice/helpers";
import type { InvoiceLinkTemplate } from "@/features/dashboard/invoice-links/create/types";

/**
 * "Start from a template", the invoice-link copy of the MCA editor's template
 * card (create-invoice's InvoiceTemplatePicker), over the same template store.
 *
 * Always shown, even with no templates saved, so a merchant knows the feature
 * exists; that empty state offers the first save, as the MCA editor's does.
 * Choosing hands the template up; the parent decides whether to confirm first
 * (ApplyTemplateConfirm below), because "Edit" in the manage dialog reaches the
 * same apply and must ask the same question.
 */
export function TemplatePicker({
  templates,
  isReady,
  isApplying,
  activeTemplateId,
  onChoose,
  onDetach,
  onManage,
  canSave,
  onSave,
}: {
  templates: InvoiceLinkTemplate[];
  isReady: boolean;
  /** True while the chosen template is being read fresh from the server. */
  isApplying: boolean;
  activeTemplateId: string | null;
  onChoose: (template: InvoiceLinkTemplate) => void;
  /** Unlinks from the active template. Never touches the invoice's contents. */
  onDetach: () => void;
  onManage: () => void;
  /** Whether the invoice holds anything worth saving as a template yet. */
  canSave: boolean;
  /** Opens the editor's "Save as template" dialog, from the empty state. */
  onSave: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const active = templates.find((template) => template.id === activeTemplateId) ?? null;


  const choose = (template: InvoiceLinkTemplate) => {
    setPickerOpen(false);
    onChoose(template);
  };

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="layout-template" className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">Template</h2>
        </div>

        {templates.length > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-[13px] font-medium"
            onClick={onManage}
          >
            Manage templates
          </Button>
        )}
      </div>

      {!isReady ? (
        <Shimmer className="h-13 w-full rounded-lg" />
      ) : templates.length === 0 ? (
        // Shown rather than hidden, so a merchant learns templates exist
        // before they have one. Saving opens the same dialog as the header
        // menu's "Save as template"; until there is something worth saving,
        // it says what to do first instead of offering a button that can only
        // decline.
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-foreground">No templates saved yet</p>
            <p className="text-[12px] text-muted-foreground">
              {canSave
                ? "Save this invoice as a template to reuse its items, currency and notes next time."
                : "Add line items, then save this invoice as a template to reuse them next time."}
            </p>
          </div>
          {canSave && (
            <Button type="button" variant="outline" size="sm" onClick={onSave}>
              Save as template
            </Button>
          )}
        </div>
      ) : (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isApplying}
              className="h-auto w-full justify-between px-3.5 py-2.5 text-left shadow-none [&>span]:min-w-0 [&>span]:flex-1"
              rightIcon={
                <Icon
                  name="chevron-down"
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              }
            >
              <span className="block min-w-0">
                <span className="block truncate text-[13.5px] font-medium text-foreground">
                  {isApplying ? "Applying template…" : active ? active.name : "No template"}
                </span>
                <span className="block truncate text-[12px] font-normal text-muted-foreground">
                  {active
                    ? active.description
                    : `Starting from scratch · ${templates.length} saved`}
                </span>
              </span>
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-[22rem] p-1.5">
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start px-2.5 py-2 text-left [&>span]:min-w-0 [&>span]:flex-1"
              onClick={() => {
                setPickerOpen(false);
                onDetach();
              }}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="block min-w-0">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    No template
                  </span>
                  <span className="block truncate text-[11.5px] font-normal text-muted-foreground">
                    Unlink, keeping everything on this invoice
                  </span>
                </span>
                <Icon
                  name="check"
                  className={cn(
                    "h-4 w-4 shrink-0 text-primary",
                    activeTemplateId ? "opacity-0" : "opacity-100"
                  )}
                />
              </span>
            </Button>

            <Separator className="my-1" />

            {templates.map((template) => (
              <Button
                key={template.id}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start px-2.5 py-2 text-left [&>span]:min-w-0 [&>span]:flex-1"
                onClick={() => choose(template)}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="block min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {template.name}
                    </span>
                    <span className="block truncate text-[11.5px] font-normal text-muted-foreground">
                      {template.description}
                    </span>
                  </span>
                  <Icon
                    name="check"
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      template.id === activeTemplateId ? "opacity-100" : "opacity-0"
                    )}
                  />
                </span>
              </Button>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/**
 * "Apply over what is already here?" Shown only when the invoice has content,
 * because applying replaces the line items.
 */
export function ApplyTemplateConfirm({
  template,
  onCancel,
  onConfirm,
}: {
  template: InvoiceLinkTemplate | null;
  onCancel: () => void;
  onConfirm: (template: InvoiceLinkTemplate) => void;
}) {
  const pendingTemplate = template;
  return (
    <Dialog
      open={!!pendingTemplate}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogTitle>Apply &ldquo;{pendingTemplate?.name}&rdquo;?</DialogTitle>
        <p className="mt-2 text-[13px] text-muted-foreground">
          This replaces the line items, currency, discount, memo and note on this invoice with the
          template&apos;s, and sets the due date from its payment term. The clients and the invoice
          number stay as they are.
        </p>
        {pendingTemplate && (
          <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
            {pendingTemplate.description}
            {formatEpochDay(pendingTemplate.savedAt) &&
              ` · saved ${formatEpochDay(pendingTemplate.savedAt)}`}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => pendingTemplate && onConfirm(pendingTemplate)}
          >
            Apply template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
