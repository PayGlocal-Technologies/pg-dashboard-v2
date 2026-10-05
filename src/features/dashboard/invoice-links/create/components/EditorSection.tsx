"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * One section card of the editor.
 *
 * Mirrors the invoice-management editor's own section vocabulary
 * (create-invoice's LineItemsSection and NotesAndTermsSection): a rounded
 * bordered card, an 8×8 tinted icon chip, a 15px semibold title, and an
 * optional right-hand slot for a control that belongs to the section rather
 * than to a field inside it.
 *
 * `collapsible` gives the NotesAndTerms treatment — a ghost button header with
 * a rotating chevron — used for the sections where every field is optional, so
 * the page opens short and the merchant expands what they need. The subtitle
 * reports what is inside while it is shut, because collapsing a section with
 * typed content and saying nothing is how content gets lost.
 */
export function EditorSection({
  icon,
  title,
  subtitle,
  actions,
  collapsible = false,
  defaultOpen = true,
  forceOpen = false,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /**
   * Holds the section open regardless of the merchant's toggle — used when
   * validation puts an error inside it, so a message can never end up hidden
   * behind a shut header. Derived, not an effect that writes back to state.
   */
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const isOpen = expanded || forceOpen;

  const chip = (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon name={icon} className="h-4 w-4" />
    </span>
  );

  if (collapsible) {
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between rounded-none px-5 py-4 text-left"
          aria-expanded={isOpen}
          onClick={() => setExpanded(!isOpen)}
          rightIcon={
            <Icon
              name="chevron-down"
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
              aria-hidden
            />
          }
        >
          <span className="flex items-center gap-2.5">
            {chip}
            <span className="block">
              <span className="block text-[15px] font-semibold text-foreground">{title}</span>
              {subtitle ? (
                <span className="block text-[12px] font-normal text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
            </span>
          </span>
        </Button>

        {isOpen ? <div className="border-t border-border px-5 py-4">{children}</div> : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          {chip}
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
            {subtitle ? <p className="text-[12px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
      </div>

      {children}
    </div>
  );
}
