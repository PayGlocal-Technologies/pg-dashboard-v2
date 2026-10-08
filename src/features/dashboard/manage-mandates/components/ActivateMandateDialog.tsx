"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { MfaVerifyStep } from "@/features/mfa/components/MfaVerifyStep";
import { useMfa } from "@/features/mfa/hooks";
import { mandateActionUrl, useMandateAction } from "@/features/dashboard/manage-mandates/hooks";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

/**
 * Activate a paused mandate: pg-dashboard verifies with a one-time code for
 * the activate call, then activates. The code goes out only when the merchant
 * asks for it here, never just from opening the menu.
 */
function ActivateMandateFlow({ row, onClose }: { row: Mandate; onClose: () => void }) {
  const [step, setStep] = useState<"confirm" | "verify">("confirm");
  const mfa = useMfa(row.mid, mandateActionUrl("activate", row.mid));
  const { run, isPending } = useMandateAction("activate");

  if (step === "verify") {
    return (
      <MfaVerifyStep
        mfa={mfa}
        title="Verify it's you"
        verifyLabel="Verify and activate"
        isSubmitting={isPending}
        onVerified={() => run(row, {}, onClose)}
        onCancel={onClose}
      />
    );
  }

  return (
    <>
      <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
        <DialogTitle>Activate mandate?</DialogTitle>
        <DialogDescription>
          <span className="tabular-nums">{row.maskedMandateId}</span> will collect payments on its
          schedule again. We&apos;ll send you a code to confirm it&apos;s you.
        </DialogDescription>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          isLoading={mfa.isSending}
          onClick={() => mfa.send("OTP_AUTHN", () => setStep("verify"))}
        >
          Send code
        </Button>
      </div>
    </>
  );
}

export function ActivateMandateDialog({
  row,
  onOpenChange,
}: {
  row: Mandate | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {row && <ActivateMandateFlow key={row.id} row={row} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
