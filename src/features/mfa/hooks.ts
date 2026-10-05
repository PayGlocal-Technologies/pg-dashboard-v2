"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePost } from "@/lib/api/hooks";
import { mfaTriggerApi, mfaVerifyApi } from "@/features/mfa/services";
import { MFA_OTP_FIELD } from "@/features/mfa/constants";
import type {
  MfaMethod,
  MfaResponse,
  MfaTriggerBody,
  MfaVerifyBody,
} from "@/features/mfa/types";

export interface MfaControls {
  /** Sends a code by `method`; `onSent` runs once the server has sent it. */
  send: (method: MfaMethod, onSent?: () => void) => void;
  /** Checks a code. `onVerified` only on a truthy `data`, as pg-dashboard does. */
  verify: (
    method: MfaMethod,
    otp: string,
    handlers: { onVerified: () => void; onFailed: (message: string) => void }
  ) => void;
  isSending: boolean;
  isVerifying: boolean;
  /** When the last code went out (epoch ms), for the resend countdown. */
  sentAt: number | null;
}

/**
 * Step-up verification for one action, pg-dashboard's MfaForm flow: send a
 * code for `resource` (the URL of the call it authorises), verify it, then the
 * caller makes the call itself. Neither request touches any cached query.
 */
export function useMfa(mid: string, resource: string): MfaControls {
  const [sentAt, setSentAt] = useState<number | null>(null);
  const { mutate: trigger, isPending: isSending } = usePost<MfaResponse, MfaTriggerBody>(
    mfaTriggerApi(mid),
    { invalidateQueries: false }
  );
  const { mutate: check, isPending: isVerifying } = usePost<MfaResponse, MfaVerifyBody>(
    mfaVerifyApi(mid),
    { invalidateQueries: false }
  );

  const send: MfaControls["send"] = (method, onSent) =>
    trigger(
      { otpEnum: method, resource },
      {
        onSuccess: (res) => {
          setSentAt(Date.now());
          toast.success(res?.message || "OTP sent successfully");
          onSent?.();
        },
        onError: (error) => toast.error(error.message || "OTP could not be triggered"),
      }
    );

  const verify: MfaControls["verify"] = (method, otp, { onVerified, onFailed }) =>
    check(
      { resource, otpEnum: method, [MFA_OTP_FIELD[method]]: otp },
      {
        onSuccess: (res) =>
          res?.data ? onVerified() : onFailed("That code didn't work. Check it and try again."),
        onError: (error) => onFailed(error.message || "That code didn't work."),
      }
    );

  return { send, verify, isSending, isVerifying, sentAt };
}
