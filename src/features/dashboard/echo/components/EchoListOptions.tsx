"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  ECHO_MAIN_MENU_CONTENT_IDS,
  ECHO_MENU_DESCRIPTIONS,
  ECHO_MENU_ICONS,
  ECHO_MENU_PROMPTS,
} from "@/features/dashboard/echo/constants";
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
 *
 * Each row reads as a suggested prompt (a diagonal arrow, then the ask
 * itself) rather than a settings-menu entry (a category icon, then a
 * chevron): `ECHO_MENU_PROMPTS` supplies that phrasing for the ids it knows,
 * falling back to the server's own `row.title` for anything it doesn't (a
 * merchant's own accounts or currencies, say). Only the label shown changes —
 * `onPick` still receives the row's real id/title either way, so what the tap
 * sends the server is identical to before.
 *
 * One exception to that ONE row style: a section that is entirely the main
 * menu's own content categories (`ECHO_MAIN_MENU_CONTENT_IDS`) renders as a
 * 3-per-row icon grid instead — six short, equally-weighted choices read as a
 * menu of destinations rather than a list of things to ask, so it gets a
 * tile per choice (icon, category name, a one-line "what this means") rather
 * than a column of prompt cards. Every other section — an account list, a
 * currency picker, anything the server extends with an id this set does not
 * know — still gets the ordinary list, so the "advancing, not replaced"
 * guarantee above still holds for those.
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
        const isMainMenu =
          section.rows.length >= 4 &&
          section.rows.every((row) => ECHO_MAIN_MENU_CONTENT_IDS.includes(row.id));

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

            {isMainMenu ? (
              // grid-cols-2, not 3: with the real main menu's own count (four
              // items — Transactions, Settlements, Raise a Query, Accounts),
              // three columns left the last row a single lonely tile hugging
              // the left edge with dead space beside it. Two columns turns
              // that into a clean 2×2 — every tile's own w-full then fills
              // the wider column this gives it, rather than the three-wide
              // version's narrower ones.
              <div className="grid grid-cols-2 gap-2">
                {section.rows.map((row) => (
                  <Button
                    key={row.id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onPick(row.id, row.title)}
                    className={cn(
                      "h-auto min-h-0 w-full rounded-2xl border-border/70 bg-card p-0 text-left shadow-sm",
                      "[&>span]:flex [&>span]:h-full [&>span]:w-full [&>span]:flex-col [&>span]:items-start [&>span]:gap-1.5 [&>span]:px-2.5 [&>span]:py-3",
                      "hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon name={ECHO_MENU_ICONS[row.id]} className="h-3.5 w-3.5 text-primary" />
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-1 block text-[12px] font-semibold leading-snug text-foreground">
                        {row.title || row.id}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[10.5px] font-normal leading-snug text-muted-foreground">
                        {ECHO_MENU_DESCRIPTIONS[row.id] ?? row.description ?? ""}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              section.rows.map((row) => (
                // flux's Button wraps all children in one plain <span>, hence
                // the `[&>span]` unwrap so the arrow and label lay out as a
                // row rather than as inline content.
                <Button
                  key={row.id}
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onPick(row.id, row.title)}
                  className={cn(
                    "h-auto min-h-0 w-full rounded-2xl border-border/70 bg-card p-0 text-left shadow-sm",
                    "[&>span]:flex [&>span]:w-full [&>span]:items-start [&>span]:gap-2.5 [&>span]:px-4 [&>span]:py-3.5",
                    "hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <Icon name="arrow-up-right" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-snug text-foreground">
                      {ECHO_MENU_PROMPTS[row.id] ?? row.title ?? row.id}
                    </span>
                    {row.description ? (
                      <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
                        {row.description}
                      </span>
                    ) : null}
                  </span>
                </Button>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
