"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { SkuProduct } from "@/features/dashboard/sku-management/types";

interface DuplicateSkuDialogProps {
  /** The product awaiting confirmation, or null when nothing is pending. One
   *  value drives both the content and the open state, so the dialog can never
   *  render a stale product name mid-close. */
  product: SkuProduct | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (product: SkuProduct) => void;
}

/**
 * Confirmation in front of Duplicate, matching pg-dashboard, which puts a
 * PopConfirm on the same action ("Duplicate this item? A copy of this item will
 * be added to your catalog.").
 *
 * It earns a confirmation despite being non-destructive because the result is
 * invisible from where the menu was opened: the copy lands at the top of the
 * unfiltered list, so on any type tab or later page a merchant would see nothing
 * happen and click again — and each click is a real row in their catalogue.
 *
 * Built as the neutral twin of DeleteSkuDialog: same dialog geometry, primary
 * rather than danger button, and an icon that reads as "copied" rather than
 * "careful".
 */
export function DuplicateSkuDialog({ product, onOpenChange, onConfirm }: DuplicateSkuDialogProps) {
  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100%-1.5rem,26rem)] max-w-none gap-0 rounded-2xl p-5">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="copy" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-[15px] font-semibold text-foreground">
              Duplicate this item?
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              A copy of{" "}
              <span className="font-medium text-foreground">{product?.name ?? "this item"}</span>{" "}
              will be added to your catalog, with the same pricing and tax details. It appears at
              the top of the list, so you may need to clear a tab or search to see it.
            </DialogDescription>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => product && onConfirm(product)}
          >
            Duplicate item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
