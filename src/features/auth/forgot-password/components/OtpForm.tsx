"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button, Field, FieldError, FieldLabel, OtpInput } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { ResendOtpMessage } from "@/features/auth/components/ResendOtpMessage";
import { useEncryptPayload } from "@/features/auth/hooks";
import { useForgotPassword } from "@/stores/useForgotPassword";
import { OTP_LENGTH } from "@/features/auth/login/schemas";
import { usePost } from "@/lib/api/hooks";
import {
  forgotPasswordSendOtpApi,
  forgotPasswordVerifyOtpApi,
} from "@/features/auth/forgot-password/services";
import type { ForgotPasswordScreenProps } from "@/features/auth/forgot-password/types";
import type { AuthEnvelope } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

/** Step 2: verify the reset OTP. Matches pg-dashboard: both email and phone OTP are submitted. */
export function OtpForm({ setScreen }: ForgotPasswordScreenProps) {
  const encryptPayload = useEncryptPayload();
  const { mutate: verifyOtp, isPending } = usePost<AuthEnvelope, EncryptedPayload>(
    forgotPasswordVerifyOtpApi
  );
  const { mutate: resendOtp } = usePost<AuthEnvelope, EncryptedPayload>(forgotPasswordSendOtpApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const identifier = useForgotPassword((s) => s.identifier);
  const maskedEmail = useForgotPassword((s) => s.maskedEmail);
  const maskedPhoneNumber = useForgotPassword((s) => s.maskedPhoneNumber);
  const otpTs = useForgotPassword((s) => s.otpInitiateTimestamp);
  const setOtpInitiateTimestamp = useForgotPassword((s) => s.setOtpInitiateTimestamp);

  const [isLocked, setIsLocked] = useState(false);

  const form = useForm({
    defaultValues: { emailOtp: "", mobileOtp: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      if (value.emailOtp.length !== OTP_LENGTH || value.mobileOtp.length !== OTP_LENGTH) return;
      const payload = { emailOtp: value.emailOtp, phoneOtp: value.mobileOtp };
      const encryptedPayload = await encryptPayload(payload);
      verifyOtp(encryptedPayload, {
        onSuccess: (res) => {
          if (res.status === "OTP_VERIFIED") setScreen("resetPassword");
        },
        onError: (err) => {
          if (err.message.toLowerCase().includes("locked")) setIsLocked(true);
          setApiError(err.message);
        },
      });
    },
  });

  const handleResend = async () => {
    setApiError(null);
    const payload = { identifier };
    const encryptedPayload = await encryptPayload(payload);
    resendOtp(encryptedPayload, {
      onSuccess: () => setOtpInitiateTimestamp(Date.now()),
      onError: (err) => {
        if (err.message.toLowerCase().includes("locked")) setIsLocked(true);
        setApiError(err.message);
      },
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-5"
      noValidate
    >
      <AuthHeading title="We&apos;ve sent you OTPs">
        Enter the {OTP_LENGTH}-digit codes sent to{" "}
        {maskedPhoneNumber ? `${maskedPhoneNumber} and ` : ""}
        {maskedEmail || identifier}.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="mobileOtp"
        validators={{
          onChange: ({ value }) =>
            value.length > 0 && value.length !== OTP_LENGTH ? "Enter the complete OTP" : undefined,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel>Mobile OTP</FieldLabel>
            <OtpInput
              value={field.state.value}
              onChange={field.handleChange}
              length={OTP_LENGTH}
              invalid={field.state.meta.errors.length > 0}
              autoFocus
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <form.Field
        name="emailOtp"
        validators={{
          onChange: ({ value }) =>
            value.length > 0 && value.length !== OTP_LENGTH ? "Enter the complete OTP" : undefined,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel>Email OTP</FieldLabel>
            <OtpInput
              value={field.state.value}
              onChange={field.handleChange}
              length={OTP_LENGTH}
              invalid={field.state.meta.errors.length > 0}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      {isLocked ? (
        <p className="text-sm text-destructive">
          Your account has been locked. Please try again later or contact support.
        </p>
      ) : (
        <ResendOtpMessage
          startTime={otpTs}
          message="Didn't receive it?"
          onResend={() => void handleResend()}
        />
      )}
      <Button type="submit" size="lg" isLoading={isPending} disabled={isLocked} className="w-full">
        Verify OTP
      </Button>
      <Button
        variant="ghost"
        type="button"
        onClick={() => setScreen("identifier")}
        className="w-full text-xs text-muted-foreground hover:text-foreground"
      >
        Use a different account
      </Button>
    </form>
  );
}
