"use client";

import { useEffect, useState } from "react";
import {
  Button,
  DialogDescription,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  OtpInput,
} from "@/components/ui";
import { PillToggle } from "@/components/common/PillToggle";
import {
  MFA_METHODS,
  MFA_OTP_LENGTH,
  MFA_RESEND_AFTER_SECONDS,
} from "@/features/mfa/constants";
import type { MfaControls } from "@/features/mfa/hooks";
import type { MfaMethod } from "@/features/mfa/types";

/** "8:20", for the resend countdown. */
function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Seconds left before Resend unlocks; ticks once a second while counting. */
function useResendCountdown(sentAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  const deadline = sentAt === null ? 0 : sentAt + MFA_RESEND_AFTER_SECONDS * 1000;
  useEffect(() => {
    if (sentAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sentAt]);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/**
 * The verify step of a protected action, laid out as a dialog step: a header
 * band, the code field, then a footer band with the actions. The parent sends
 * the first code (so a failed send
 * never opens this step) and makes the protected call once `onVerified` runs.
 *
 * Switching method sends a fresh code by that method, as pg-dashboard does.
 */
export function MfaVerifyStep({
  mfa,
  title,
  verifyLabel = "Verify",
  isSubmitting = false,
  onVerified,
  onCancel,
}: {
  mfa: MfaControls;
  title: string;
  verifyLabel?: string;
  /** The protected call is in flight after a successful verify. */
  isSubmitting?: boolean;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<MfaMethod>("OTP_AUTHN");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const secondsLeft = useResendCountdown(mfa.sentAt);
  const sentTo = MFA_METHODS.find((m) => m.value === method)?.sentTo ?? "you";

  const submit = (code: string) => {
    if (code.length < MFA_OTP_LENGTH || mfa.isVerifying || isSubmitting) return;
    setError(null);
    mfa.verify(method, code, {
      onVerified,
      onFailed: (message) => {
        setOtp("");
        setError(message);
      },
    });
  };

  const switchMethod = (next: MfaMethod) => {
    setMethod(next);
    setOtp("");
    setError(null);
    mfa.send(next);
  };

  return (
    <>
      <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          We&apos;ve sent a {MFA_OTP_LENGTH}-digit code to {sentTo}. Enter it to continue.
        </DialogDescription>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        <Field>
          <FieldLabel>Send code by</FieldLabel>
          <PillToggle
            ariaLabel="Verification method"
            options={MFA_METHODS}
            value={method}
            onChange={switchMethod}
            className="w-fit self-start"
          />
        </Field>

        <Field>
          <FieldLabel>Verification code</FieldLabel>
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={submit}
            length={MFA_OTP_LENGTH}
            invalid={!!error}
            autoFocus
          />
          <FieldError>{error}</FieldError>
          <p className="text-[12.5px] text-muted-foreground">
            {secondsLeft > 0 ? (
              <>Didn&apos;t get it? You can resend in {formatCountdown(secondsLeft)}</>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                disabled={mfa.isSending}
                onClick={() => mfa.send(method)}
                className="h-auto p-0 text-[12.5px]"
              >
                Resend code
              </Button>
            )}
          </p>
        </Field>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          isLoading={mfa.isVerifying || isSubmitting}
          disabled={otp.length < MFA_OTP_LENGTH}
          onClick={() => submit(otp)}
        >
          {verifyLabel}
        </Button>
      </div>
    </>
  );
}
