"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  OtpInput,
} from "@/components/ui";

// TODO(integration): no real OTP/verification-link endpoints exist yet for
// changing a signed-in user's own email/phone, this whole flow is mocked:
// "123456" is accepted as the correct code at every OTP step.
const MOCK_OTP_LENGTH = 6;
const MOCK_OTP_CODE = "123456";

export type ContactType = "email" | "phone";

type Step = "verify-identity" | "enter-new-value" | "verify-new-contact" | "email-link-sent";

interface EditContactDialogProps {
  type: ContactType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only called once the NEW phone number's own OTP is verified. Email
   * never calls this, a real email change only takes effect once the
   * merchant clicks the link we (mock) sent them, which this dialog can't
   * simulate. */
  onConfirm: (newValue: string) => void;
}

const CONTACT_LABEL: Record<ContactType, string> = {
  email: "email address",
  phone: "phone number",
};

/** Edit flow for the Personal details Email/Phone rows: verify identity
 * with a code sent to the CURRENT registered contact info, enter the new
 * value, then (phone only) verify a second code sent to the NEW number
 * before it takes effect. Email instead ends with a "check your inbox"
 * message, since a real email change only applies once the merchant clicks
 * the verification link, not something this mock can simulate. */
export function EditContactDialog({ type, open, onOpenChange, onConfirm }: EditContactDialogProps) {
  const [step, setStep] = useState<Step>("verify-identity");
  const [identityOtp, setIdentityOtp] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newValueOtp, setNewValueOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const label = CONTACT_LABEL[type];

  function reset() {
    setStep("verify-identity");
    setIdentityOtp("");
    setNewValue("");
    setNewValueOtp("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function verifyIdentity(code: string) {
    if (code !== MOCK_OTP_CODE) {
      setError("Incorrect code. Try again.");
      return;
    }
    setError(null);
    setStep("enter-new-value");
  }

  function submitNewValue() {
    if (!newValue.trim()) {
      setError(`Please enter your new ${label}.`);
      return;
    }
    setError(null);
    setStep(type === "email" ? "email-link-sent" : "verify-new-contact");
  }

  function verifyNewContact(code: string) {
    if (code !== MOCK_OTP_CODE) {
      setError("Incorrect code. Try again.");
      return;
    }
    onConfirm(newValue);
    toast.success("Phone number updated");
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "verify-identity" && (
          <>
            <DialogTitle>Verify it&apos;s you</DialogTitle>
            <DialogDescription>
              We&apos;ve sent a {MOCK_OTP_LENGTH}-digit code to your registered email and phone
              number. Enter it below to continue.
            </DialogDescription>
            <Field>
              <FieldLabel>Verification code</FieldLabel>
              <OtpInput
                value={identityOtp}
                onChange={setIdentityOtp}
                onComplete={verifyIdentity}
                length={MOCK_OTP_LENGTH}
                invalid={!!error}
                autoFocus
              />
              <FieldError>{error}</FieldError>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={() => verifyIdentity(identityOtp)}>
                Verify
              </Button>
            </div>
          </>
        )}

        {step === "enter-new-value" && (
          <>
            <DialogTitle>
              {type === "email" ? "Update email address" : "Update phone number"}
            </DialogTitle>
            <DialogDescription>Enter your new {label} below.</DialogDescription>
            <Field>
              <FieldLabel>New {label}</FieldLabel>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Enter your new ${label}`}
                autoFocus
              />
              <FieldError>{error}</FieldError>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={submitNewValue}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "verify-new-contact" && (
          <>
            <DialogTitle>Verify your new phone number</DialogTitle>
            <DialogDescription>
              We&apos;ve sent a {MOCK_OTP_LENGTH}-digit code to {newValue}. Enter it below to
              confirm the change.
            </DialogDescription>
            <Field>
              <FieldLabel>Verification code</FieldLabel>
              <OtpInput
                value={newValueOtp}
                onChange={setNewValueOtp}
                onComplete={verifyNewContact}
                length={MOCK_OTP_LENGTH}
                invalid={!!error}
                autoFocus
              />
              <FieldError>{error}</FieldError>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={() => verifyNewContact(newValueOtp)}>
                Verify
              </Button>
            </div>
          </>
        )}

        {step === "email-link-sent" && (
          <>
            <DialogTitle>Check your inbox</DialogTitle>
            <DialogDescription>
              We&apos;ve sent a verification link to {newValue}. Please check your inbox and click
              the link to confirm this change.
            </DialogDescription>
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
