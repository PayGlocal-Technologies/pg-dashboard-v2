"use client";

import { useState } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger, Separator } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

/**
 * One row of the menu. A ghost Button flattened into a full-width menu item —
 * the same treatment the Status filter flyout gives its options.
 */
function MenuAction({
  icon,
  label,
  destructive = false,
  onSelect,
}: {
  icon: IconName;
  label: string;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onSelect}
      className={cn(
        "h-auto min-h-0 w-full justify-start rounded-md px-2 py-2 text-[12.5px] font-normal",
        "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5",
        // Icon and label share one colour: lucide glyphs stroke with
        // currentColor, so the destructive item's icon turns red with its text
        // rather than needing its own class.
        destructive
          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
          : "text-foreground"
      )}
    >
      <Icon name={icon} className="h-3.5 w-3.5 shrink-0" />
      {label}
    </Button>
  );
}

interface SkuRowActionsProps {
  product: SkuProduct;
  /** Archived rows swap Edit/Archive for Unarchive; Delete is on both. */
  archived: boolean;
  onEdit: (product: SkuProduct) => void;
  onArchive: (product: SkuProduct) => void;
  onUnarchive: (product: SkuProduct) => void;
  onDelete: (product: SkuProduct) => void;
  className?: string;
}

/**
 * The row's overflow menu.
 *
 * Deliberately built to mirror EditablePriceCell, the popover on this page
 * that has always worked: a flux `Button` as an `asChild` trigger, with its
 * open state held locally. Earlier revisions of this menu used `IconButton`
 * as the trigger and lifted the open state up to SkuTable, and never opened;
 * those are the two things that differ from the working component, so neither
 * is used here.
 *
 * Local state also means Radix alone decides what's open: clicking a second
 * row's button is an outside press for the first row's menu, which dismisses
 * it, so only one is ever open without a shared id to coordinate them.
 *
 * Rendered through DataTable's `rowAction` slot on desktop (pinned to the
 * right edge, revealed on row hover, not a column) and in the card's action
 * corner on mobile — same component and handlers in both.
 */
export function SkuRowActions({
  product,
  archived,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  className,
}: SkuRowActionsProps) {
  const [open, setOpen] = useState(false);

  // Every item closes the menu before acting, so the one that opens a dialog
  // (Delete) doesn't leave a popover stacked underneath it.
  const select = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Flux's secondary Button, squared off to an icon-only control — the
            same fill, border, and shadow as other secondary actions, at the
            32px height the compact table controls use. Icon-only, so it needs
            its own aria-label. */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Actions for ${product.name}`}
          aria-haspopup="menu"
          className={cn(
            "h-8 w-8 min-h-0 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-foreground",
            "[&>span]:flex [&>span]:items-center [&>span]:justify-center",
            className
          )}
        >
          <Icon name="more-horizontal" className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      {/* Portaled and collision-aware by default: it escapes the table
          container's and the card's clipping, flips above the button near the
          bottom of the viewport, and shifts inward near the right edge. */}
      <PopoverContent align="end" collisionPadding={8} className="w-44 p-1">
        {archived ? (
          <MenuAction
            icon="archive-restore"
            label="Unarchive item"
            onSelect={select(() => onUnarchive(product))}
          />
        ) : (
          <>
            <MenuAction
              icon="pencil"
              label="Edit item"
              onSelect={select(() => onEdit(product))}
            />
            <MenuAction
              icon="archive"
              label="Archive item"
              onSelect={select(() => onArchive(product))}
            />
          </>
        )}

        {/* Delete is fenced off from the reversible actions above it, so it
            can't be hit by momentum on the way down the list. */}
        <Separator className="my-1" />

        <MenuAction
          icon="trash-2"
          label="Delete item"
          destructive
          onSelect={select(() => onDelete(product))}
        />
      </PopoverContent>
    </Popover>
  );
}
