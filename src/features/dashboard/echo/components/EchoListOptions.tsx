"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ECHO_MENU_ICONS } from "@/features/dashboard/echo/constants";
import { sectionsOf } from "@/features/dashboard/echo/helper";
import type { EchoListChunk } from "@/features/dashboard/echo/types";
import { cn } from "@/lib/utils";

type Props = {
  chunk: EchoListChunk;
  disabled?: boolean;
  onPick: (id: string, title: string) => void;
  /**
   * Drops the section title. Set for the opening turn, where the hero's own
   * "Try asking" caption already heads the list and the server's "Main Menu"
   * under it just says the same thing twice.
   */
  hideHeading?: boolean;
};

/**
 * The `interactive.type: "list"` control, rendered as the options themselves.
 *
 * WhatsApp shows this as a button that opens a bottom sheet, and this used to
 * mirror that with a popover — which meant the main menu, the first thing Echo
 * ever shows, was four choices hidden behind a "Choose an option" dropdown.
 *
 * ONE row style for every list in the conversation, opening turn included.
 * Styling the welcome menu as cards and every later menu as a plain grey list
 * meant the same four rows changed appearance the moment the merchant tapped
 * one — the screen looked like it had been replaced rather than advanced.
 *
 * `action.button` is dropped deliberately: it is the label for a sheet
 * trigger, and with the rows inline there is no trigger for it to label. The
 * body text above already says what to do.
 */
export function EchoListOptions({ chunk, disabled, onPick, hideHeading }: Props) {
  const sections = sectionsOf(chunk);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-2">
      {sections.map((section, sectionIndex) => {
        // Section titles are sometimes a single space (the MCA currency
        // selector ships `title: " "`), which should read as no heading rather
        // than an empty row of padding.
        const heading = hideHeading ? undefined : section.title?.trim();

        // All-or-nothing per list. The menus have known ids and read well with
        // icons; a list of merchant accounts or currencies has ids this map
        // will never cover, and a column of identical fallback glyphs beside
        // twenty rows is worse than no column at all.
        const showIcons = section.rows.every((row) => ECHO_MENU_ICONS[row.id]);

        return (
          <div
            key={`${heading ?? "section"}-${sectionIndex}`}
            className={cn("space-y-1.5", sectionIndex > 0 && "pt-1")}
          >
            {heading ? (
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {heading}
              </p>
            ) : null}
            {section.rows.map((row) => (
              // flux's Button wraps all children in one plain <span>, hence
              // the `[&>span]` unwrap so the label column, icon and chevron
              // lay out as a row rather than as inline content.
              <Button
                key={row.id}
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => onPick(row.id, row.title)}
                className={cn(
                  "h-auto min-h-0 w-full rounded-xl border-border/70 bg-card/80 p-0 text-left shadow-sm",
                  "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5 [&>span]:px-3.5 [&>span]:py-2.5",
                  "hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                {showIcons ? (
                  <Icon name={ECHO_MENU_ICONS[row.id]} className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {row.title || row.id}
                  </span>
                  {row.description ? (
                    <span className="mt-0.5 block truncate text-[11.5px] font-normal text-muted-foreground">
                      {row.description}
                    </span>
                  ) : null}
                </span>
                <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
