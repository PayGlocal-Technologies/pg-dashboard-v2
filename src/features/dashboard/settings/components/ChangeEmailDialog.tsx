"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  OtpInput,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  EMAIL_OTP_LENGTH,
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  MAX_EMAIL_OTP_ATTEMPTS,
} from "@/features/dashboard/settings/constants";
import { parseChangeEmailFailure, validateNewEmail } from "@/features/dashboard/settings/helper";
import { useChangeEmail } from "@/features/dashboard/settings/hooks";

/** One screen per server-gated step, in the order the API enforces. `sending`
 *  covers the initiate call fired on open; `stopped` is the dead end, which the
 *  flow reaches two different ways — see StopReason. */
type Step = "sending" | "verify-old" | "enter-new-email" | "verify-new" | "done" | "stopped";

/** Why the flow stopped, and therefore what the merchant has to do next.
 *  `signed-out` — three wrong codes; the API ended the login session, so the
 *  only way on is to log in again. `restart` — a 403 (a step called out of
 *  order, e.g. the flow was left open too long) or a failed initiate; the login
 *  session is intact and they can simply try again. */
type StopReason = "signed-out" | "restart";

interface ChangeEmailDialogProps {
  /** The merchant's current email, shown on the first OTP screen. */
  currentEmail: string;
  onOpenChange: (open: boolean) => void;
  /** The change is committed and the session is gone — send the merchant to log
   *  in again with the new address. */
  onCompleted: (newEmail: string) => void;
  /** The session was ended without the change going through (three wrong
   *  codes). Also a log-in-again path, but nothing was updated. */
  onSessionEnded: () => void;
}

/** Seconds left on a resend cooldown. Ticks from a timeout callback, never from
 *  the effect body, per the app's hook purity rules. */
function useResendCooldown(): { secondsLeft: number; start: () => void } {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  return { secondsLeft, start: () => setSecondsLeft(EMAIL_OTP_RESEND_COOLDOWN_SECONDS) };
}

/**
 * Change-email wizard for the Personal details Email row, over the six
 * /gcc/v3/iam/users/contact/change endpoints (see services.ts).
 *
 * The server owns the state: each step only succeeds when the previous one just
 * did, so this component walks forward on success responses rather than
 * tracking eligibility itself. Two endings are terminal for the login session —
 * a committed change, and three wrong codes.
 *
 * The caller must mount this only while open (`{editing && <ChangeEmailDialog/>}`),
 * so each open starts from a fresh `sending` state.
 */
export function ChangeEmailDialog({
  currentEmail,
  onOpenChange,
  onCompleted,
  onSessionEnded,
}: ChangeEmailDialogProps) {
  const api = useChangeEmail();

  const [step, setStep] = useState<Step>("sending");
  const [stopReason, setStopReason] = useState<StopReason>("restart");
  const [oldOtp, setOldOtp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newOtp, setNewOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  /** Wrong codes at the current OTP step, reset when a new code is requested or
   *  a new step begins. Warning only — the server enforces the limit. */
  const [wrongCodes, setWrongCodes] = useState(0);
  const cooldown = useResendCooldown();

  // Step 1 fires as soon as the dialog opens: there is nothing for the merchant
  // to fill in for it. setState happens in the async callback, not the effect
  // body, so this stays within the app's hook rules.
  useEffect(() => {
    let cancelled = false;
    void api
      .initiate()
      .then((message) => {
        if (cancelled) return;
        setNotice(message);
        setStep("verify-old");
        cooldown.start();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(parseChangeEmailFailure(err).message);
        setStopReason("restart");
        setStep("stopped");
      });
    return () => {
      cancelled = true;
    };
    // Runs once per mount; the dialog is mounted fresh on every open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = (reason: StopReason, message: string): void => {
    setError(message);
    setStopReason(reason);
    setStep("stopped");
  };

  /**
   * Every call funnels through here so one place owns the busy flag and the
   * failure branching.
   *
   * `isOtpSubmit` marks the two calls where a 401 means "wrong code". The
   * server ends the session on the third one, after which the next call would
   * 403 anyway — the count here only buys a warning before that happens, and a
   * clearer final screen.
   */
  async function run(
    action: () => Promise<string>,
    onDone: (message: string) => void,
    options: { isOtpSubmit?: boolean } = {}
  ): Promise<void> {
    setIsBusy(true);
    setError(null);
    try {
      const message = await action();
      onDone(message);
    } catch (err) {
      const failure = parseChangeEmailFailure(err);

      // 403: the server has no live step for this session. Nothing to do but
      // start over — the login session itself is still fine.
      if (failure.status === 403) {
        stop("restart", failure.message);
        return;
      }

      if (failure.status === 401 && options.isOtpSubmit) {
        const used = wrongCodes + 1;
        setWrongCodes(used);
        const left = MAX_EMAIL_OTP_ATTEMPTS - used;
        if (left <= 0) {
          stop("signed-out", failure.message);
          return;
        }
        setError(`${failure.message} ${left} ${left === 1 ? "attempt" : "attempts"} left.`);
        return;
      }

      setError(failure.message);
    } finally {
      setIsBusy(false);
    }
  }

  const submitOldOtp = (code: string): void => {
    void run(
      () => api.verifyOld(code),
      () => {
        setOldOtp("");
        setWrongCodes(0);
        setNotice(null);
        setStep("enter-new-email");
      },
      { isOtpSubmit: true }
    );
  };

  // Why the address can't be submitted yet, or null when it can. Gates the Send
  // code button; the same message surfaces under the field on blur so a disabled
  // button always has a visible reason next to it.
  const newEmailIssue = validateNewEmail(newEmail, currentEmail);

  const submitNewEmail = (): void => {
    if (newEmailIssue) {
      setError(newEmailIssue);
      return;
    }
    void run(
      () => api.sendNewOtp(newEmail.trim()),
      (message) => {
        setNotice(message);
        setStep("verify-new");
        cooldown.start();
      }
    );
  };

  const submitNewOtp = (code: string): void => {
    void run(
      () => api.verifyNew(code, newEmail.trim()),
      () => {
        setNotice(null);
        setStep("done");
      },
      { isOtpSubmit: true }
    );
  };

  const resend = (): void => {
    const action =
      step === "verify-old" ? () => api.resendOld() : () => api.resendNew(newEmail.trim());
    void run(action, (message) => {
      setNotice(message);
      setWrongCodes(0); // a new code, a fresh set of tries
      cooldown.start();
    });
  };

  const close = (): void => onOpenChange(false);

  const resendRow = (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {cooldown.secondsLeft > 0
          ? `You can request a new code in ${cooldown.secondsLeft}s.`
          : "Didn't get the code?"}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={resend}
        disabled={isBusy || cooldown.secondsLeft > 0}
      >
        Resend code
      </Button>
    </div>
  );

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          {step === "sending" && (
            <div className="flex items-center gap-3 py-4">
              <Icon name="loader" className="h-4 w-4 animate-spin text-muted-foreground" />
              <div>
                <DialogTitle className="text-base">Change email address</DialogTitle>
                <DialogDescription>
                  Sending a verification code to your current email…
                </DialogDescription>
              </div>
            </div>
          )}

          {step === "verify-old" && (
            <>
              <div>
                <DialogTitle>Verify your current email</DialogTitle>
                <DialogDescription>
                  We&apos;ve sent a {EMAIL_OTP_LENGTH}-digit code to{" "}
                  <span className="font-medium text-foreground">{currentEmail}</span>. Enter it to
                  continue.
                </DialogDescription>
              </div>
              <Field>
                <FieldLabel>Verification code</FieldLabel>
                <OtpInput
                  value={oldOtp}
                  onChange={setOldOtp}
                  onComplete={submitOldOtp}
                  length={EMAIL_OTP_LENGTH}
                  invalid={!!error}
                  disabled={isBusy}
                  autoFocus
                />
                <FieldError>{error}</FieldError>
              </Field>
              {resendRow}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close} disabled={isBusy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => submitOldOtp(oldOtp)}
                  isLoading={isBusy}
                  disabled={oldOtp.length !== EMAIL_OTP_LENGTH}
                >
                  Verify
                </Button>
              </div>
            </>
          )}

          {step === "enter-new-email" && (
            /* A real form so Enter submits, as merchants expect in a one-field
               step. */
            <form
              className="space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submitNewEmail();
              }}
            >
              <div>
                <DialogTitle>Enter your new email</DialogTitle>
                <DialogDescription>
                  We&apos;ll send a code to this address to confirm you can receive mail there.
                </DialogDescription>
              </div>
              <Field>
                <FieldLabel htmlFor="new-email">New email address</FieldLabel>
                <Input
                  id="new-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="name@company.com"
                  value={newEmail}
                  aria-invalid={!!error}
                  // Typing clears the message; it comes back on blur or submit,
                  // so the merchant isn't corrected mid-keystroke.
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => {
                    if (newEmail.trim()) setError(validateNewEmail(newEmail, currentEmail));
                  }}
                  disabled={isBusy}
                  autoFocus
                />
                <FieldError>{error}</FieldError>
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close} disabled={isBusy}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isBusy} disabled={!!newEmailIssue}>
                  Send code
                </Button>
              </div>
            </form>
          )}

          {step === "verify-new" && (
            <>
              <div>
                <DialogTitle>Verify your new email</DialogTitle>
                <DialogDescription>
                  We&apos;ve sent a {EMAIL_OTP_LENGTH}-digit code to{" "}
                  <span className="font-medium text-foreground">{newEmail.trim()}</span>. Entering
                  it changes your account email.
                </DialogDescription>
              </div>
              <Field>
                <FieldLabel>Verification code</FieldLabel>
                <OtpInput
                  value={newOtp}
                  onChange={setNewOtp}
                  onComplete={submitNewOtp}
                  length={EMAIL_OTP_LENGTH}
                  invalid={!!error}
                  disabled={isBusy}
                  autoFocus
                />
                <FieldError>{error}</FieldError>
              </Field>
              {/* The commit ends the session — say so before they click. */}
              <p className="text-xs text-muted-foreground">
                You&apos;ll be signed out once the change is confirmed, and will need to sign in
                again with your new email.
              </p>
              {resendRow}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close} disabled={isBusy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => submitNewOtp(newOtp)}
                  isLoading={isBusy}
                  disabled={newOtp.length !== EMAIL_OTP_LENGTH}
                >
                  Confirm change
                </Button>
              </div>
            </>
          )}

          {step === "done" && (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="check-circle" size={18} />
                </span>
                <div>
                  <DialogTitle>Email updated</DialogTitle>
                  <DialogDescription>
                    Your account email is now{" "}
                    <span className="font-medium text-foreground">{newEmail.trim()}</span>.
                    We&apos;ve emailed a confirmation to both addresses. For security you&apos;ve
                    been signed out — sign in again with your new email.
                  </DialogDescription>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => onCompleted(newEmail.trim())}>
                  Go to login
                </Button>
              </div>
            </>
          )}

          {step === "stopped" && (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Icon name="shield-alert" size={18} />
                </span>
                <div>
                  <DialogTitle>Verification stopped</DialogTitle>
                  <DialogDescription>
                    {error ?? "This verification is no longer valid."}{" "}
                    {stopReason === "signed-out"
                      ? "For security, your email is unchanged and you've been signed out — sign in again to retry."
                      : "Your email is unchanged. Close this and start again when you're ready."}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex justify-end">
                {stopReason === "signed-out" ? (
                  <Button type="button" onClick={onSessionEnded}>
                    Go to login
                  </Button>
                ) : (
                  <Button type="button" onClick={close}>
                    Close
                  </Button>
                )}
              </div>
            </>
          )}

          {notice && step !== "done" && step !== "stopped" && (
            <p className="text-xs text-muted-foreground">{notice}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
