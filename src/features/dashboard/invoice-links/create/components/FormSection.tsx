"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * One numbered step of the editor's accordion.
 *
 * Upstream drives this form as a single-open accordion with a numbered badge
 * per section and an "Optional" tag on the ones that are
 * (create-mca-payment-invoice/components/forms). The step number comes from the
 * section's position *after* filtering, so hiding Shipping renumbers the rest —
 * which is why the index is passed in rather than hardcoded.
 */
export function FormSection({
  step,
  title,
  optional,
  open,
  onToggle,
  children,
}: {
  step: number;
  title: string;
  optional?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Bare <button> per CLAUDE.md's exemption: this is an accordion header,
          a full-width disclosure row, and <Button>'s variant padding and focus
          ring fight it. No flux component covers a disclosure header. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
            open ? "bg-primary text-primary-foreground" : "bg-foreground/80 text-background"
          )}
        >
          {step}
        </span>

        <span className="flex-1 text-[14px] font-semibold text-foreground">{title}</span>

        {optional ? (
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Optional
          </span>
        ) : null}

        <Icon
          name={open ? "chevron-down" : "chevron-right"}
          className="h-4 w-4 shrink-0 text-muted-foreground"
        />
      </button>

      {open ? <div className="border-t border-border px-4 py-4">{children}</div> : null}
    </div>
  );
}
