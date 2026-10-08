"use client";

import { useState } from "react";
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui";
import { MfaVerifyStep } from "@/features/mfa/components/MfaVerifyStep";
import { useMfa } from "@/features/mfa/hooks";
import { mandateActionUrl, useMandateAction } from "@/features/dashboard/manage-mandates/hooks";
import { toCompactDate } from "@/features/dashboard/manage-mandates/helpers";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

/** Tomorrow as "YYYY-MM-DD": pg-dashboard only allows dates after today. */
function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Pause, pg-dashboard's PauseMandateModal: pick the mandate's new start date,
 * verify with a one-time code for the pause call, then pause.
 */
function PauseMandateFlow({ row, onClose }: { row: Mandate; onClose: () => void }) {
  const [step, setStep] = useState<"date" | "verify">("date");
  const [startDate, setStartDate] = useState("");
  // Once, on open: "tomorrow" is relative to now, which render can't read.
  const [minDate] = useState(tomorrowIso);
  const mfa = useMfa(row.mid, mandateActionUrl("pause", row.mid));
  const { run, isPending } = useMandateAction("pause");

  if (step === "verify") {
    return (
      <MfaVerifyStep
        mfa={mfa}
        title="Verify it's you"
        verifyLabel="Verify and pause"
        isSubmitting={isPending}
        onVerified={() => run(row, { startDate: toCompactDate(startDate) }, onClose)}
        onCancel={onClose}
      />
    );
  }

  return (
    <>
      <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
        <DialogTitle>Pause mandate</DialogTitle>
        <DialogDescription>
          <span className="tabular-nums">{row.maskedMandateId}</span> on {row.mid}
        </DialogDescription>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        <Field>
          <FieldLabel htmlFor="mandate-start-date">Mandate start date</FieldLabel>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            min={minDate}
            placeholder="Select a date"
          />
          <FieldDescription>Must be after today.</FieldDescription>
        </Field>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!startDate}
          isLoading={mfa.isSending}
          onClick={() => mfa.send("OTP_AUTHN", () => setStep("verify"))}
        >
          Continue
        </Button>
      </div>
    </>
  );
}

export function PauseMandateDialog({
  row,
  onOpenChange,
}: {
  row: Mandate | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Keyed so each open starts from the date step with nothing typed. */}
        {row && <PauseMandateFlow key={row.id} row={row} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
