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
import { formatDate } from "@/lib/utils/format";
import type { InvoiceTemplate } from "@/features/dashboard/create-invoice/types";

/**
 * "Start from a template".
 *
 * Nova's template card, above the first section of the form. Two departures,
 * both because this one is wired to a form that already has content in it:
 *
 *  - Applying a template over a part-filled invoice asks first. Nova overwrites
 *    silently, which is survivable in a mock and is not here: this editor
 *    autosaves 1.2s later, so a mis-click is persisted before it can be undone.
 *  - The empty state offers to save the current invoice, because a merchant with
 *    no templates yet has no reason to look in the header's dropdown for the one
 *    action that would give them one.
 */
export function InvoiceTemplatePicker({
  templates,
  isReady,
  activeTemplateId,
  hasContent,
  onApply,
  onDetach,
  onManage,
  onSaveCurrent,
}: {
  templates: InvoiceTemplate[];
  isReady: boolean;
  /** The template this invoice was built from, if any. */
  activeTemplateId: string | null;
  /** True when the form already holds items or notes worth protecting. */
  hasContent: boolean;
  onApply: (template: InvoiceTemplate) => void;
  /** Unlinks from the active template. Never touches the invoice's contents. */
  onDetach: () => void;
  onManage: () => void;
  onSaveCurrent: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<InvoiceTemplate | null>(null);

  const active = templates.find((template) => template.id === activeTemplateId) ?? null;

  const choose = (template: InvoiceTemplate) => {
    setPickerOpen(false);
    if (hasContent) {
      setPendingTemplate(template);
      return;
    }
    onApply(template);
  };

  const confirmApply = () => {
    if (pendingTemplate) onApply(pendingTemplate);
    setPendingTemplate(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
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
            className="h-auto p-0"
            onClick={onManage}
          >
            Manage templates
          </Button>
        )}
      </div>

      {!isReady ? (
        <Shimmer className="h-[3.25rem] w-full rounded-lg" />
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-4 py-4">
          <p className="text-[12.5px] text-muted-foreground">
            No templates yet. Save an invoice&apos;s items, terms and branding once, then start from
            it next time.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasContent}
            leftIcon={<Icon name="bookmark" className="h-3.5 w-3.5" />}
            onClick={onSaveCurrent}
          >
            {hasContent ? "Save this invoice as a template" : "Add items to save a template"}
          </Button>
        </div>
      ) : (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              // The chevron rides in `rightIcon` so flux renders it as a real
              // sibling of the children wrapper; `[&>span]:min-w-0` is what lets
              // that wrapper shrink, so a long template name truncates instead
              // of pushing the chevron out of the button.
              className="h-auto w-full justify-between px-3.5 py-2.5 text-left [&>span]:min-w-0 [&>span]:flex-1"
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
                  {active ? active.name : "No template"}
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
            {/* Detach. Sits at the top of the list, ticked when nothing is
                active, so the whole popover reads as one radio group whose first
                option is "none" — which is where a reader looks for it.

                It clears the link and nothing else: the items, totals, notes and
                branding stay exactly as they are. That is why it needs no
                confirmation, unlike applying a template over live content. */}
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
              // flux's Button wraps ALL its children in one plain <span>, so
              // `justify-between` on the button itself would only ever see that
              // one wrapper and a block child inside it would break the line.
              // Anything needing internal layout therefore passes exactly one
              // child that carries the flex, and `[&>span]` lets the wrapper
              // shrink so the name can truncate. Same shape as
              // PaymentDetailsSection's account rows.
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

      <Dialog
        open={!!pendingTemplate}
        onOpenChange={(open) => {
          if (!open) setPendingTemplate(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>Apply &ldquo;{pendingTemplate?.name}&rdquo;?</DialogTitle>
          <p className="mt-2 text-[13px] text-muted-foreground">
            This replaces the items, totals, receiving account, notes and branding on this invoice
            with the template&apos;s. The client, invoice number and dates stay as they are.
          </p>
          {pendingTemplate && (
            <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
              {pendingTemplate.description}
              {pendingTemplate.createdAt &&
                ` · saved ${formatDate(pendingTemplate.createdAt, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}`}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPendingTemplate(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={confirmApply}>
              Apply template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
