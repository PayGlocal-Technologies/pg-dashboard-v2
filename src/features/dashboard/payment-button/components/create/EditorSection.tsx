"use client";

import type { ReactNode } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger, Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

/** Tinted icon tile + title + one supporting line — every section's heading. */
function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description?: string;
}) {
  return (
    // A title with a supporting line top-aligns to the tile; a bare title
    // (Advanced options) centres on it instead of riding its top edge.
    <div className={cn("flex gap-3 text-left", description ? "items-start" : "items-center")}>
      {/* Same tile the invoice editor's sections lead with (BillerSection). */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

/** An always-open group of fields on its own card. */
export function EditorSection({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-5 px-6 py-6">
      <SectionHeading icon={icon} title={title} description={description} />
      {children}
    </Card>
  );
}

/**
 * A card that collapses to its heading. Must sit inside an `<Accordion>`; the
 * card chrome is on the AccordionItem so a closed section is just its heading
 * row, the ClientFormModal FormSection arrangement. `last:border-b` cancels
 * AccordionItem's own `last:border-b-0`, which is for stacked-row accordions.
 */
export function CollapsibleEditorSection({
  value,
  icon,
  title,
  description,
  children,
}: {
  value: string;
  icon: IconName;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm last:border-b"
    >
      <AccordionTrigger className="px-6 py-5 hover:no-underline">
        <SectionHeading icon={icon} title={title} description={description} />
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <div className="flex flex-col gap-4 border-t border-border px-6 py-5">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}
