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
      <DialogContent className="max-w-sm">
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
