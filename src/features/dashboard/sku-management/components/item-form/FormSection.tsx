"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Red asterisk before a required field's label — the marker the Create MCA
 *  Link form uses, so required-ness reads the same across the product. */
export function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}

interface FormSectionProps {
  /** Small uppercase heading. Omitted for groups whose fields already name
   *  themselves clearly enough (the item's own details). */
  title?: string;
  /**
   * Draws the section on its own subtle surface. Reserved for groups that
   * genuinely read as one unit — Pricing, whose three fields are meaningless
   * apart — rather than applied to every section, which would turn the modal
   * into a stack of boxes and flatten the hierarchy it's meant to create.
   */
  boxed?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * One group of fields in the item form. The single place the modal's section
 * rhythm is defined — heading treatment, the gap between fields, and the
 * optional container — so sections stay consistent with each other and a new
 * one is a component drop rather than a set of classes copied from a
 * neighbour.
 */
export function FormSection({ title, boxed = false, className, children }: FormSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        boxed && "rounded-xl border border-border bg-muted/30 p-3.5",
        className
      )}
    >
      {title && (
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
