"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { ZohoConnectBadge } from "@/features/dashboard/zoho-integration/components/ZohoConnectBadge";

/**
 * Confirms a pull-sync, and first asks which account it applies to when the
 * merchant holds several PACB MIDs and none of them is the one currently
 * selected. Mirrors pg-dashboard's SyncModal, whose sync is always scoped to
 * exactly one MID.
 */
export function ZohoSyncDialog({
  open,
  onOpenChange,
  onSync,
  isSyncing,
  pacbMids,
  selectedMid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: (mid: string) => void;
  isSyncing: boolean;
  pacbMids: string[];
  selectedMid: string;
}) {
  const [chosenMid, setChosenMid] = useState("");

  const hasMultipleMids = pacbMids.length > 1;
  const needsMidSelection = hasMultipleMids && !pacbMids.includes(selectedMid);
  const resolvedMid = selectedMid || chosenMid || pacbMids[0] || "";

  function close() {
    setChosenMid("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setChosenMid("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[28rem]">
        <div className="flex flex-col items-center gap-2 text-center">
          <ZohoConnectBadge centerIcon="refresh" />
          <DialogTitle className="mt-1 text-base font-bold tracking-tight">
            Sync from Zoho
          </DialogTitle>

          {needsMidSelection ? (
            <div className="w-full space-y-1.5 text-left">
              <p className="text-[13px] text-muted-foreground">
                Choose the account to sync your Zoho data into.
              </p>
              <Select value={chosenMid} onValueChange={setChosenMid}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a merchant ID" />
                </SelectTrigger>
                <SelectContent>
                  {pacbMids.map((mid) => (
                    <SelectItem key={mid} value={mid} className="tabular-nums">
                      {mid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="max-w-[22rem] text-[13px] leading-relaxed text-muted-foreground">
              {hasMultipleMids ? (
                <>
                  Your Zoho data will be synced to mid{" "}
                  <span className="font-semibold text-foreground tabular-nums">{selectedMid}</span>
                </>
              ) : (
                "Your Zoho data will be synced to this account."
              )}
            </p>
          )}
        </div>

        <div className="flex gap-2.5">
          <Button variant="outline" size="sm" className="flex-1" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            isLoading={isSyncing}
            disabled={!resolvedMid || (needsMidSelection && !chosenMid)}
            onClick={() => resolvedMid && onSync(resolvedMid)}
          >
            Sync now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
