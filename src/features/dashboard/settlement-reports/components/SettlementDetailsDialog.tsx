"use client";

import { useState, type ReactNode } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";

const DETAILS_TITLE = "Settlement details";
const BANK_CHANGE_SUPPORT_EMAIL = "merchant.support@payglocal.in";

interface DetailRowProps {
  icon: IconName;
  label: string;
  value: string;
  status: string;
  action?: ReactNode;
}

function DetailRow({ icon, label, value, status, action }: DetailRowProps) {
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
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Opens the merchant's default mail client with a prefilled request to
 * PayGlocal support, current bank account is included for reference, the
 * body leaves space for the merchant to fill in the updated details rather
 * than us collecting/storing sensitive bank account data ourselves. */
function buildBankChangeMailtoUrl(currentBankAccount: string): string {
  const subject = "Request for bank account change";
  const body = [
    "Hi Team,",
    "",
    "I would like to request a change to the bank account linked to my settlements.",
    "",
    `Current bank account on file: ${currentBankAccount}`,
    "",
    "Updated bank account details:",
    "Account holder name: ",
    "Bank name: ",
    "Account number: ",
    "IFSC code: ",
    "",
    "Thanks,",
  ].join("\n");

  return `mailto:${BANK_CHANGE_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(buildBankChangeMailtoUrl(bankAccount), "_self")}
                  leftIcon={<Icon name="mail" className="h-3.5 w-3.5" />}
                  className="whitespace-nowrap"
                >
                  Request bank account change
                </Button>
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
