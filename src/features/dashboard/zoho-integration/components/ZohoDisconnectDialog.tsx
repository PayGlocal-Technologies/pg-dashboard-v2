"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { ZohoConnectBadge } from "@/features/dashboard/zoho-integration/components/ZohoConnectBadge";

export function ZohoDisconnectDialog({
  open,
  onOpenChange,
  onDisconnect,
  isDisconnecting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28rem]">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* An unlinking, so the joining glyph is swapped for a severed one. */}
          <ZohoConnectBadge centerIcon="x" />
          <DialogTitle className="mt-1 text-base font-bold tracking-tight">
            Disconnect Zoho?
          </DialogTitle>
          <p className="max-w-[22rem] text-[13px] leading-relaxed text-muted-foreground">
            Invoice sync, reconciliation, and FIRA access in Zoho will all stop. You can reconnect
            anytime, your data stays safe.
          </p>
        </div>

        <div className="flex gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            isLoading={isDisconnecting}
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
