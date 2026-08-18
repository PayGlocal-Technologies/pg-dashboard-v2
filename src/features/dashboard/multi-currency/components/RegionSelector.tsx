"use client";

import { Button, type ButtonProps } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

interface RegionSelectorProps {
  accounts: VirtualAccount[];
  /** id of the currently selected account — always exactly one. */
  selectedAccountId: string;
  onSelect: (account: VirtualAccount) => void;
  /** Accessible name for the list, e.g. "Select a region to preview". */
  label: string;
  /** Row height. `"sm"` for the compact list embedded in the share modal,
   *  `"md"` where the list is the page's own primary control. Ignored by the
   *  `"cards"` variant, whose height comes from its own padding. */
  size?: ButtonProps["size"];
  /**
   * How the regions are laid out.
   *
   * - `"list"` (default) — a vertical stack of rows, for a fixed-width column
   *   or the share modal's preview.
   * - `"cards"` — a horizontally scrolling row of flag-over-name tiles, for
   *   narrow viewports where a full-height vertical list would push the
   *   account details far below the fold.
   */
  variant?: "list" | "cards";
  className?: string;
}

/**
 * The receiving regions, exactly one selected — a vertical list of rows by
 * default, or a horizontally scrolling row of tiles under `variant="cards"`.
 * Lifted verbatim out of ShareAccountDetailsModal's embedded preview so the
 * MCA v2 page and that modal render the same rows rather than each
 * hand-rolling a list — flag, region name, and a chevron marking the selected
 * row.
 *
 * Rows are flux-ui Buttons, not a hand-rolled list: `ghost` is the design
 * system's resting surface and `secondary` its selected one, so the selection
 * here is indicated exactly the way every other selectable control in the
 * product indicates it. Both call sites sit the list on a card-coloured
 * surface, which is why the selected row is the filled one — a bordered white
 * row on a white card would read as a nested card instead of a selection.
 *
 * The chevron only appears on the selected row: it points at the details panel
 * that row is currently driving, so showing it on every row would read as six
 * separate affordances instead of one pointer.
 */
export function RegionSelector({
  accounts,
  selectedAccountId,
  onSelect,
  label,
  size = "sm",
  variant = "list",
  className,
}: RegionSelectorProps) {
  if (variant === "cards") {
    return (
      // p-1 (4px, uniform): overflow-x-auto also clips the vertical axis per
      // the CSS overflow spec, so without a small inset this would shave the
      // selected tile's ring and every tile's rounded corners.
      <div
        className={cn("scrollbar-none flex gap-3 overflow-x-auto p-1", className)}
        role="list"
        aria-label={label}
      >
        {accounts.map((account) => {
          const isSelected = account.id === selectedAccountId;
          return (
            <Button
              key={account.id}
              type="button"
              role="listitem"
              aria-current={isSelected}
              // Inverted against the list variant's pairing, because the
              // surface underneath is: these tiles sit on the page itself, so
              // the selected one lifts off it in card white with a primary
              // ring while the resting ones stay filled. In the list variant
              // the rows sit on a white Card, where that would read as a
              // nested card instead of a selection.
              variant={isSelected ? "outline" : "secondary"}
              // flux-ui's Button lays leftIcon / label / rightIcon out as
              // three direct flex children; flex-col is what stacks the flag
              // above the region name. h-auto/min-h-0 drop the size variant's
              // fixed row height so the padding here defines the tile instead.
              className={cn(
                "h-auto min-h-0 w-36 shrink-0 flex-col items-start gap-3 rounded-xl px-4 py-4",
                "[&>span]:w-full [&>span]:truncate [&>span]:text-left",
                isSelected && "border-primary font-semibold text-primary ring-1 ring-primary"
              )}
              leftIcon={
                <CountryFlagAvatar
                  iso2={account.iso2}
                  countryName={account.countryName}
                  className="h-6 w-8 rounded-md"
                />
              }
              // No chevron: it points rightward at the details panel a row
              // drives, which is only true of the list variant sitting beside
              // that panel. Here the details sit below, not to the side.
              onClick={() => onSelect(account)}
            >
              {account.countryName}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)} role="list" aria-label={label}>
      {accounts.map((account) => {
        const isSelected = account.id === selectedAccountId;
        return (
          <Button
            key={account.id}
            type="button"
            role="listitem"
            aria-current={isSelected}
            variant={isSelected ? "secondary" : "ghost"}
            size={size}
            // flux-ui's Button lays leftIcon / label / rightIcon out as three
            // direct flex children, so the chevron would otherwise sit
            // immediately after the region name. Letting the label span take
            // the free space pushes it to the far right of the row instead.
            className={cn(
              "w-full justify-start gap-2.5 [&>span]:flex-1 [&>span]:text-left",
              // `secondary` already carries the selected surface; the primary
              // tint on top is what makes the selected region readable at a
              // glance in a list where every row shares the same shape.
              isSelected && "text-primary font-semibold"
            )}
            // Rectangular, not the circular avatar the account cards use:
            // flags read as flags at this size, and it's the same shape
            // CountryFlag gives every flag elsewhere in the product. Going
            // through CountryFlagAvatar rather than CountryFlag is what keeps
            // the globe fallback for regions with no flag on the CDN (Rest of
            // the World, and the EU entry on some environments).
            leftIcon={
              <CountryFlagAvatar
                iso2={account.iso2}
                countryName={account.countryName}
                className="h-5 w-7 rounded-md"
              />
            }
            rightIcon={
              isSelected ? <Icon name="chevron-right" className="h-3.5 w-3.5" /> : undefined
            }
            onClick={() => onSelect(account)}
          >
            <span className="truncate">{account.countryName}</span>
          </Button>
        );
      })}
    </div>
  );
}
