"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";

const DETAILS_TITLE = "Settlement details";

interface DetailRowProps {
  icon: IconName;
  label: string;
  value: string;
  status: string;
}

function DetailRow({ icon, label, value, status }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon name={icon} size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{status}</p>
        </div>
      </div>
    </div>
  );
}

interface SettlementDetailsDialogProps {
  cycleValue: string;
  cycleFrequency: string;
  bankAccount: string;
  bankAccountStatus: string;
}

export function SettlementDetailsDialog({
  cycleValue,
  cycleFrequency,
  bankAccount,
  bankAccountStatus,
}: SettlementDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        leftIcon={<Icon name="info" className="h-3.5 w-3.5" />}
      >
        Details
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-125 gap-0 p-0">
          <div className="border-b border-border px-5 py-4 pr-12">
            <DialogTitle>{DETAILS_TITLE}</DialogTitle>
          </div>
          <div className="divide-y divide-border px-1 py-1">
            <DetailRow icon="refresh" label="Cycle" value={cycleValue} status={cycleFrequency} />
            <DetailRow
              icon="building-2"
              label="Bank account"
              value={bankAccount}
              status={bankAccountStatus}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
