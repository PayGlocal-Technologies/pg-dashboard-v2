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
import { Icon } from "@/components/icon";
import { ZohoConnectBadge } from "@/features/dashboard/zoho-integration/components/ZohoConnectBadge";
import type { IconName } from "@/components/icon";

/** What the merchant gets by linking, in production's wording and order. */
const BENEFITS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "refresh",
    title: "Auto-sync invoices from Zoho",
    description: "Invoices update automatically, nothing to upload.",
  },
  {
    icon: "repeat",
    title: "Zoho and PayGlocal reconciliation",
    description: "Paid status updates on both sides automatically.",
  },
  {
    icon: "download",
    title: "Download FIRA from Zoho",
    description: "Get FIRA for PayGlocal payments inside Zoho.",
  },
];

/**
 * Starts the OAuth round trip, and first asks which account the link belongs
 * to when the merchant holds several PACB MIDs.
 *
 * This is the only place in the flow that asks: a merchant has one Zoho
 * account, so the MID chosen here is the MID every later sync and disconnect
 * acts on, without asking again.
 */
export function ZohoConnectDialog({
  open,
  onOpenChange,
  onConnect,
  isConnecting,
  pacbMids,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (mid: string) => void;
  isConnecting: boolean;
  pacbMids: string[];
}) {
  const [chosenMid, setChosenMid] = useState("");

  const needsMidSelection = pacbMids.length > 1;
  const resolvedMid = chosenMid || pacbMids[0] || "";

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
      <DialogContent className="sm:max-w-[32rem]">
        <div className="flex flex-col items-center gap-2 text-center">
          <ZohoConnectBadge />
          <DialogTitle className="mt-1 text-base font-bold tracking-tight">
            Connect Zoho Books or Invoices
          </DialogTitle>
          <p className="text-[13px] text-muted-foreground">
            One connection keeps invoices, payments, and FIRA in sync.
          </p>
        </div>

        {needsMidSelection && (
          <div className="mt-1 space-y-1.5">
            <p className="text-[13px] font-semibold text-foreground">Select the mid to connect</p>
            <Select value={chosenMid} onValueChange={setChosenMid}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a mid" />
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
        )}

        <div className="mt-1 space-y-2.5 rounded-xl border border-border bg-muted/40 p-3.5">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card">
                <Icon name={benefit.icon} className="h-3.5 w-3.5 text-primary" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{benefit.title}</p>
                <p className="text-xs text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="shield-check" className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            Your data stays safe and protected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isConnecting}
              disabled={!resolvedMid || (needsMidSelection && !chosenMid)}
              onClick={() => resolvedMid && onConnect(resolvedMid)}
            >
              Connect securely
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
