"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { PaymentButton } from "@/features/dashboard/payment-button/types";

/**
 * Confirms a disable, which pg-dashboard also asks before ("Are you sure you
 * want to disable Payment Button?"). Laid out as DeactivateMemberDialog: the
 * warning tile and copy, then Cancel / the destructive action on a footer band.
 */
export function DisablePaymentButtonDialog({
  row,
  isDisabling,
  onOpenChange,
  onConfirm,
}: {
  row: PaymentButton | null;
  isDisabling?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (row: PaymentButton) => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-100 gap-0 p-0">
        {row && (
          <>
            <div className="flex items-start gap-3 px-6 py-5 pr-14">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Icon name="alert-triangle" size={16} aria-hidden />
              </span>
              <div>
                <DialogTitle>Disable payment button?</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{row.buttonId}</span> will stop accepting payments on
                  every page it is embedded on.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isDisabling}
                onClick={() => {
                  onConfirm(row);
                  onOpenChange(false);
                }}
              >
                Disable button
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
