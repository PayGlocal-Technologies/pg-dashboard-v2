"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

interface DeleteSkuDialogProps {
  /** The product awaiting confirmation, or null when nothing is pending.
   *  Driving both the content and the open state from one value means the
   *  dialog can never render a stale product name mid-close. */
  product: SkuProduct | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (product: SkuProduct) => void;
}

/**
 * Confirmation step in front of a permanent delete — the menu item only ever
 * opens this, never deletes. Uses flux's Dialog with the `danger` Button
 * variant, the design system's destructive affordance.
 */
export function DeleteSkuDialog({ product, onOpenChange, onConfirm }: DeleteSkuDialogProps) {
  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100%-1.5rem,26rem)] max-w-none gap-0 rounded-2xl p-5">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Icon name="alert-triangle" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-[15px] font-semibold text-foreground">
              Delete this item?
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              {/* The name is quoted rather than interpolated bare so a product
                  called e.g. "Desk Organiser Tray" reads as one object in the
                  sentence. */}
              <span className="font-medium text-foreground">
                {product?.name ?? "This item"}
              </span>{" "}
              will be permanently deleted, along with its pricing and tax
              details. This can&apos;t be undone — archive it instead if you
              only want it out of the active list.
            </DialogDescription>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => product && onConfirm(product)}
          >
            Delete item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
