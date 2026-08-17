"use client";

import {
  Button,
  IconButton,
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

interface SkuRowActionsProps {
  product: SkuProduct;
  /** Archived rows get Unarchive/Delete instead of Edit/Archive/Delete. */
  archived: boolean;
  /** Open state is owned by the table, not by each menu, so opening one
   *  closes whichever other row's menu was open — Radix's outside-click would
   *  usually manage that on its own, but only while both are mounted, and the
   *  card list unmounts rows as pages change. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (product: SkuProduct) => void;
  onArchive: (product: SkuProduct) => void;
  onUnarchive: (product: SkuProduct) => void;
  onDelete: (product: SkuProduct) => void;
  className?: string;
}

/** One row of the menu — a ghost Button flattened into a full-width menu item,
 *  matching the option rows in the Status filter flyout. */
function MenuAction({
  icon,
  label,
  destructive = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto min-h-0 w-full justify-start rounded-md px-2 py-1.5 text-[12.5px] font-normal",
        "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2",
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

/**
 * The row-level overflow menu. Rendered through DataTable's `rowAction` slot on
 * desktop (a zero-width sticky cell pinned to the right edge, so it adds no
 * column and leaves the existing alignment untouched) and inside each card on
 * mobile. Both pass the same handlers, so an action behaves identically
 * wherever it's invoked.
 */
export function SkuRowActions({
  product,
  archived,
  open,
  onOpenChange,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  className,
}: SkuRowActionsProps) {
  // Every item closes the menu first: the ones that open a dialog (Delete)
  // would otherwise leave a popover stacked under it.
  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    // The pointerdown guard stops the native event before it reaches the
    // document, which is where the open menu's dismiss layer listens. Without
    // it, clicking this button while its own menu is open would both dismiss
    // (as an outside click) and toggle, and the two would cancel out. Clicks
    // also stop here before reaching any row-level handler.
    <span
      className="inline-flex"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Popover open={open} onOpenChange={onOpenChange}>
        {/* Anchor, not Trigger. PopoverTrigger owns the open/close click
            itself: it builds its handler by composing the child's onClick with
            its internal toggle and hands the result down through Slot, so
            whether the button opens depends on that composition surviving
            two layers of prop merging (Slot's, then IconButton's) — and here
            it wasn't. Anchor contributes positioning only, so the button is
            an ordinary button whose own onClick is the single thing that
            opens the menu, and there is nothing left in between to swallow
            it. The menu is still anchored to this exact button. */}
        <PopoverAnchor asChild>
          <IconButton
            type="button"
            aria-label={`Actions for ${product.name}`}
            aria-haspopup="menu"
            aria-expanded={open}
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(!open)}
            className={cn("text-muted-foreground hover:text-foreground", className)}
          >
            <Icon name="more-horizontal" className="h-4 w-4" />
          </IconButton>
        </PopoverAnchor>

        {/* Portaled by Radix, so it escapes the table container's and the
            card's overflow clipping and paints above both. collisionPadding
            keeps it clear of the viewport edges — near the bottom it flips
            above the trigger, near the right it shifts inward. */}
        <PopoverContent
          align="end"
          side="bottom"
          collisionPadding={8}
          // With no Trigger there is nothing for Radix to hand focus back to
          // on close, so it's told not to try rather than left to focus the
          // document body and scroll the table.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-44 p-1"
        >
          {archived ? (
            <>
              <MenuAction
                icon="archive-restore"
                label="Unarchive item"
                onClick={() => run(() => onUnarchive(product))}
              />
              <MenuAction
                icon="trash-2"
                label="Delete item"
                destructive
                onClick={() => run(() => onDelete(product))}
              />
            </>
          ) : (
            <>
              <MenuAction
                icon="pencil"
                label="Edit item"
                onClick={() => run(() => onEdit(product))}
              />
              <MenuAction
                icon="archive"
                label="Archive item"
                onClick={() => run(() => onArchive(product))}
              />
              <MenuAction
                icon="trash-2"
                label="Delete item"
                destructive
                onClick={() => run(() => onDelete(product))}
              />
            </>
          )}
        </PopoverContent>
      </Popover>
    </span>
  );
}
