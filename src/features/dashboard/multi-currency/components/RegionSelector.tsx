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
   *  `"md"` where the list is the page's own primary control. */
  size?: ButtonProps["size"];
  className?: string;
}

/**
 * Vertical list of receiving regions, one row per account, exactly one
 * selected. Lifted verbatim out of ShareAccountDetailsModal's embedded preview
 * so the MCA v2 page and that modal render the same rows rather than each
 * hand-rolling a list — flag, region name, and a chevron marking the selected
 * row.
 *
 * Rows are flux-ui Buttons, not a hand-rolled list: `secondary` is the design
 * system's own selected surface and `ghost` its resting one, so the selected
 * state here is the same one every other selectable control in the product
 * uses. The chevron only appears on the selected row — it points at the
 * details panel the row is currently driving, so showing it on every row
 * would read as six separate affordances instead of one pointer.
 */
export function RegionSelector({
  accounts,
  selectedAccountId,
  onSelect,
  label,
  size = "sm",
  className,
}: RegionSelectorProps) {
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
              "w-full justify-start gap-2 [&>span]:flex-1 [&>span]:text-left",
              // `secondary` already carries the selected surface; the primary
              // tint on top is what makes the selected region readable at a
              // glance in a list where every row shares the same shape.
              isSelected && "text-primary font-semibold"
            )}
            leftIcon={
              <CountryFlagAvatar
                iso2={account.iso2}
                countryName={account.countryName}
                className="h-5 w-5"
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
