"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useMandateAction } from "@/features/dashboard/manage-mandates/hooks";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

/**
 * Confirms a disable before sending it. pg-dashboard disabled on the first
 * click; a mandate stops collecting once disabled, so this asks first, laid
 * out as Payment Button's DisablePaymentButtonDialog.
 */
export function DisableMandateDialog({
  row,
  onOpenChange,
}: {
  row: Mandate | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { run, isPending } = useMandateAction("disable");

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-100 gap-0 p-0">
        {row && (
          <>
            <div className="flex items-start gap-3 px-6 py-5 pr-14">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <Icon name="alert-triangle" size={16} aria-hidden />
              </span>
              <div>
                <DialogTitle>Disable mandate?</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  No further payments will be collected on{" "}
                  <span className="font-mono">{row.maskedMandateId}</span>.
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
                isLoading={isPending}
                onClick={() => run(row, {}, () => onOpenChange(false))}
              >
                Disable mandate
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
