"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";

/**
 * Confirmation for the destructive and duplicating row actions.
 *
 * pg-dashboard guards both Delete and Duplicate with an antd popConfirm; flux
 * has no popconfirm, so this is the equivalent as a small dialog. Delete is
 * genuinely destructive and Duplicate silently creates a second invoice, which
 * is why production confirms both and so does this.
 */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isDestructive,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* One layer above every other dialog (flux puts each overlay at z-100,
          content at z-101): opened from inside another dialog, as payment
          links' Deactivate is, its dim-and-blur overlay must cover that
          dialog too, not slide in underneath it. */}
      <DialogContent className="z-[111] max-w-sm" overlayClassName="z-[110]">
        <DialogTitle>{title}</DialogTitle>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{description}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDestructive ? "danger" : "primary"}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
