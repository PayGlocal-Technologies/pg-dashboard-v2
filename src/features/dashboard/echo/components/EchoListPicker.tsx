"use client";

import { useState } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { sectionsOf } from "@/features/dashboard/echo/helper";
import type { EchoListChunk } from "@/features/dashboard/echo/types";
import { cn } from "@/lib/utils";

type Props = {
  chunk: EchoListChunk;
  disabled?: boolean;
  onPick: (id: string, title: string) => void;
};

/**
 * The `interactive.type: "list"` control: one button labelled
 * `action.button`, which opens a sectioned picker of rows.
 *
 * WhatsApp opens this as a bottom sheet; a popover is the dashboard's
 * equivalent and works in both the 320px side panel and the full page. Row
 * counts are open-ended (one row per merchant account, one per product), so
 * the list scrolls inside a capped height rather than growing the popover.
 */
export function EchoListPicker({ chunk, disabled, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const sections = sectionsOf(chunk);
  const label = chunk.interactive.action?.button || "Choose an option";

  if (sections.length === 0) return null;

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="w-full justify-between text-[13px] font-medium"
          rightIcon={<Icon name="chevron-down" size={14} />}
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(22rem,calc(100vw-2rem))] max-h-[min(24rem,60vh)] overflow-y-auto p-1"
      >
        {sections.map((section, sectionIndex) => {
          // Section titles are sometimes a single space (the MCA currency
          // selector ships `title: " "`), which should read as no heading
          // rather than an empty row of padding.
          const heading = section.title?.trim();
          return (
            <div key={`${heading ?? "section"}-${sectionIndex}`} className={cn(sectionIndex > 0 && "mt-1")}>
              {heading ? (
                <p className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {heading}
                </p>
              ) : null}
              {section.rows.map((row) => (
                <Button
                  key={row.id}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    onPick(row.id, row.title);
                  }}
                  className="h-auto min-h-0 w-full justify-start rounded-lg px-2 py-2 text-left [&>span]:block [&>span]:w-full"
                >
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {row.title || row.id}
                  </span>
                  {row.description ? (
                    <span className="mt-0.5 block truncate text-[11.5px] font-normal text-muted-foreground">
                      {row.description}
                    </span>
                  ) : null}
                </Button>
              ))}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
