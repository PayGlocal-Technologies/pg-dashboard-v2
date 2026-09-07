"use client";

import { useEffect, useRef, useState } from "react";
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
import { useChangeEmail, useEncryptionReady } from "@/features/dashboard/settings/hooks";

/** One screen per server-gated step, in the order the API enforces. `sending`
 *  covers waiting on the encryption key and the initiate call fired on open;
 *  `stopped` is the dead end, which the flow reaches two different ways — see
 *  StopReason. */
type Step = "sending" | "verify-old" | "enter-new-email" | "verify-new" | "done" | "stopped";

/** Why the flow stopped, and therefore what the merchant has to do next.
 *  `signed-out` — three wrong codes, or a 403; either way the login session is
 *  gone and the only way on is to log in again. `restart` — the server no
 *  longer counts an earlier step as cleared (a 401 on a non-OTP call, e.g. the
 *  dialog was left open across a logout elsewhere) or initiate failed outright;
 *  the login session is intact and reopening the dialog starts a clean flow. */
type StopReason = "signed-out" | "restart";

interface ChangeEmailDialogProps {
  /** The merchant's current email, shown on the first OTP screen. */
  currentEmail: string;
  onOpenChange: (open: boolean) => void;
  /** The change committed. The session survives it, so this is only a "close
   *  and tell them" hook — there is nothing to sign out of or redirect to. The
   *  new address is passed for the confirmation copy; the data behind the
   *  screen has already been refreshed by useChangeEmail. */
  onCompleted: (newEmail: string) => void;
  /** The login session itself ended (three wrong codes, or a 403) with nothing
   *  updated. The only path on is a fresh login. */
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
 * The server owns the sequencing — each step checks that the previous one
 * happened — so this component walks forward on success responses rather than
 * tracking eligibility itself. That check is a stored fact about the account,
 * not a narrowed session, so having this dialog open costs the rest of the
 * dashboard nothing and a committed change leaves the merchant logged in. The
 * one terminal ending left is three wrong codes, which does end the session.
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
  const encryption = useEncryptionReady();

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
  const initiated = useRef(false);

  // Step 1 fires as soon as the encryption key is in hand: there is nothing for
  // the merchant to fill in for it, but its body still goes up encrypted, so it
  // cannot run before the key resolves. The ref keeps it to one call even
  // though the effect re-runs as `encryption` settles. setState happens in the
  // async callbacks, not the effect body, so this stays within the app's hook
  // rules.
  //
  // No cancellation flag on purpose. It would have to be set from this effect's
  // cleanup, and under StrictMode's mount/unmount/remount the cleanup runs
  // while the one call this ref allows is still in flight — the remount then
  // hits the ref and registers no new cleanup, so the flag stays set and the
  // response is dropped on the floor, leaving the dialog spinning on "sending"
  // forever whatever the server said. The ref alone already guarantees a single
  // call, and a setState after a real unmount is a no-op in React 18+.
  useEffect(() => {
    if (encryption !== "ready" || initiated.current) return;
    initiated.current = true;

    void api
      .initiate()
      .then((message) => {
        setNotice(message);
        setStep("verify-old");
        cooldown.start();
      })
      .catch((err: unknown) => {
        setError(parseChangeEmailFailure(err).message);
        setStopReason("restart");
        setStep("stopped");
      });
    // Keyed on the encryption gate only; the dialog is mounted fresh on every
    // open, and `api`/`cooldown` are new objects on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encryption]);

  const stop = (reason: StopReason, message: string): void => {
    setError(message);
    setStopReason(reason);
    setStep("stopped");
  };

  /**
   * Every call funnels through here so one place owns the busy flag and the
   * failure branching.
   *
   * `isOtpSubmit` marks the two calls where a 401 means "wrong code" rather
   * than "out of order" — the API uses the one status for both, and only the
   * caller knows which endpoint it just hit. The server ends the session on the
   * third wrong code; the count here only buys a warning before that happens,
   * and a clearer final screen.
   */
  async function run<T>(
    action: () => Promise<T>,
    onDone: (result: T) => void,
    options: { isOtpSubmit?: boolean } = {}
  ): Promise<void> {
    setIsBusy(true);
    setError(null);
    try {
      onDone(await action());
    } catch (err) {
      const failure = parseChangeEmailFailure(err);

      // 403 is reserved for "not logged in at all" — the session is gone, so
      // there is nothing to retry in place.
      if (failure.status === 403) {
        stop("signed-out", failure.message);
        return;
      }

      if (failure.status === 401) {
        // Not an OTP submit, so this is the sequencing check: the server no
        // longer treats the earlier step as cleared for this account.
        if (!options.isOtpSubmit) {
          stop("restart", failure.message);
          return;
        }
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
      ({ message, committed }) => {
        // A 2xx is not the confirmation: only the EMAIL_CHANGE_COMPLETED status
        // is. Without it the email did not change, and telling the merchant it
        // did is worse than showing them whatever the server said.
        if (!committed) {
          setError(message || "Your email was not changed. Please try again.");
          return;
        }
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
          {/* Rendered rather than folded into `step`, so no state is set from
              the effect body. Without the key the OTP and the address would go
              up in the clear, so the flow does not start at all. */}
          {encryption === "failed" && step === "sending" && (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Icon name="shield-alert" size={18} />
                </span>
                <div>
                  <DialogTitle>Can&apos;t start right now</DialogTitle>
                  <DialogDescription>
                    We couldn&apos;t set up a secure connection to change your email. Reload the
                    page and try again — your email is unchanged.
                  </DialogDescription>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={close}>
                  Close
                </Button>
              </div>
            </>
          )}

          {encryption !== "failed" && step === "sending" && (
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
              {/* The commit can't be undone, and it's what the next sign-in will
                  ask for — worth saying before they click. */}
              <p className="text-xs text-muted-foreground">
                This can&apos;t be undone. You&apos;ll stay signed in, and will use your new email
                to sign in from now on.
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
                    We&apos;ve emailed a confirmation to both addresses. You&apos;re still signed
                    in — use the new address next time you sign in.
                  </DialogDescription>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => onCompleted(newEmail.trim())}>
                  Done
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
                      : "Your email is unchanged and you're still signed in. Close this and start again when you're ready."}
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
