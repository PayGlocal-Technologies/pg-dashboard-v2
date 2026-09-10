"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { ZohoConnectBadge } from "@/features/dashboard/zoho-integration/components/ZohoConnectBadge";

/**
 * Confirms a pull-sync.
 *
 * There is nothing to choose here any more: a merchant's Zoho account is
 * linked to exactly one PACB MID, so the sync goes where the connection is and
 * the dialog's job is to say which account that is before it runs.
 */
export function ZohoSyncDialog({
  open,
  onOpenChange,
  onSync,
  isSyncing,
  mid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: () => void;
  isSyncing: boolean;
  /** The connected MID, or null when nothing is linked yet. */
  mid: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28rem]">
        <div className="flex flex-col items-center gap-2 text-center">
          <ZohoConnectBadge centerIcon="refresh" />
          <DialogTitle className="mt-1 text-base font-bold tracking-tight">
            Sync from Zoho
          </DialogTitle>
          <p className="max-w-[22rem] text-[13px] leading-relaxed text-muted-foreground">
            {mid ? (
              <>
                Your Zoho data will be synced to mid{" "}
                <span className="font-semibold text-foreground tabular-nums">{mid}</span>
              </>
            ) : (
              "Connect a mid to Zoho before syncing."
            )}
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
            variant="primary"
            size="sm"
            className="flex-1"
            isLoading={isSyncing}
            disabled={!mid}
            onClick={onSync}
          >
            Sync now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
