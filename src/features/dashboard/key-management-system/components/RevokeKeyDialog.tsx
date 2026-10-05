"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { MerchantKey } from "@/features/dashboard/key-management-system/types";

/** Confirms a revoke, with pg-dashboard's warning: it is permanent and stops live traffic. */
export function RevokeKeyDialog({
  row,
  isRevoking,
  onOpenChange,
  onConfirm,
}: {
  row: MerchantKey | null;
  isRevoking: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (row: MerchantKey) => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-100 gap-0 p-0">
        {row && (
          <>
            <div className="flex items-start gap-3 px-6 py-5 pr-14">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                <Icon name="alert-triangle" size={16} aria-hidden />
              </span>
              <div className="min-w-0">
                <DialogTitle>Revoke this key?</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can&apos;t reinstate it, and live transactions that use it will stop working.
                </p>
                <p
                  className="mt-2 truncate font-mono text-[11.5px] text-foreground"
                  title={row.kid ?? ""}
                >
                  {row.kid}
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
                isLoading={isRevoking}
                onClick={() => onConfirm(row)}
              >
                Revoke key
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
