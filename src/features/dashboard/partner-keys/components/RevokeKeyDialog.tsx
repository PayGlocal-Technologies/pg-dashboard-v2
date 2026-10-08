"use client";

import {
  Button,
  Callout,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { PartnerKey } from "@/features/dashboard/partner-keys/mock-data";

/** Revoking can't be undone and stops live traffic on the key, so it is
 *  confirmed with the key named and the consequence spelled out. */
export function RevokeKeyDialog({
  row,
  onOpenChange,
  onConfirm,
}: {
  row: PartnerKey | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <div className="flex items-start gap-3 px-6 pt-6 pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <Icon name="ban" size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight">Revoke this key?</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px]">
              This can&apos;t be undone.
            </DialogDescription>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-muted-foreground">Key ID</p>
            <p className="mt-0.5 truncate font-mono text-[13px] text-foreground">{row?.kid}</p>
          </div>
          <Callout variant="warning">
            <Icon name="alert-triangle" size={16} aria-hidden className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-relaxed">
              Live transactions that use this key will stop working, and the key can&apos;t be
              reinstated. Generate a replacement first if you still need one.
            </p>
          </Callout>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="shadow-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Revoke key
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
