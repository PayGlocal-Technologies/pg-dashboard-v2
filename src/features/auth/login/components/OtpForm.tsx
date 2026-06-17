"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button, Field, FieldError, FieldLabel, OtpInput, Separator } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { ResendOtpMessage } from "@/features/auth/components/ResendOtpMessage";
import { useEncryptPayload } from "@/features/auth/hooks";
import { getRedirectionPath } from "@/features/auth/helpers";
import { useLogin } from "@/stores/useLogin";
import { sendMessage } from "@/lib/utils/sendMessage";
import { OTP_LENGTH, otpSchema } from "@/features/auth/login/schemas";
import { usePost } from "@/lib/api/hooks";
import { verifyOtpApi, resendOtpApi, resendPhoneNumberOtpApi } from "@/features/auth/login/services";
import { useGlobalTenant } from "@/features/auth/hooks";
import type { LoginScreenProps } from "@/features/auth/login/types";
import type { AuthEnvelope, AuthedData } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

/** Step 2b: verify the email/phone login OTP. */
export function OtpForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const isGlobal = useGlobalTenant();
  const { mutate: verifyOtp, isPending } = usePost<AuthEnvelope<AuthedData>, EncryptedPayload>(
    verifyOtpApi(isGlobal)
  );
  const { mutate: resendOtp } = usePost<AuthEnvelope, EncryptedPayload>(resendOtpApi);
  const { mutate: resendPhoneOtp } = usePost<AuthEnvelope, EncryptedPayload>(
    resendPhoneNumberOtpApi
  );
  const [apiError, setApiError] = useState<string | null>(null);

  const identifier = useLogin((s) => s.identifier);
  const maskedEmail = useLogin((s) => s.maskedEmail);
  const maskedPhoneNumber = useLogin((s) => s.maskedPhoneNumber);
  const hasPassword = useLogin((s) => s.hasPassword);
  const isPhone = useLogin((s) => s.isPhoneNumberOtpLogin);
  const emailTs = useLogin((s) => s.emailOtpInitiateTimestamp);
  const smsTs = useLogin((s) => s.smsOtpInitiateTimestamp);
  const userCreationType = useLogin((s) => s.userCreationType);
  const isWebsiteLogin = useLogin((s) => s.isWebsiteLogin);
  const setEmailOtpInitiateTimestamp = useLogin((s) => s.setEmailOtpInitiateTimestamp);
  const setSmsOtpInitiateTimestamp = useLogin((s) => s.setSmsOtpInitiateTimestamp);

  const target = isPhone ? maskedPhoneNumber || "your phone" : maskedEmail || identifier;

  const form = useForm({
    defaultValues: { otp: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const validation = otpSchema.safeParse(value);
      if (!validation.success) return;

      const payload = {
        identifier,
        ...(isPhone ? { phoneOtp: value.otp } : { emailOtp: value.otp }),
      };
      const encryptedPayload = await encryptPayload(payload);
      verifyOtp(encryptedPayload, {
        onSuccess: (res) => {
          if (res.status === "AUTHENTICATED" || res.status === "OTP_VERIFIED") {
            if (isWebsiteLogin) {
              sendMessage({ type: "WEBSITE_LOGIN_SUCCESS", status: res.status, userCreationType });
            } else {
              window.location.href = getRedirectionPath(userCreationType);
            }
          } else if (res.status === "AUTHENTICATED_FOR_CHANGE_PASSWORD") {
            setScreen("changePassword");
          } else if (res.status === "AUTHENTICATION_FOR_PHONE_NUMBER_CAPTURE") {
            setScreen("phoneNumber");
          } else if (res.status === "AUTHENTICATED_FOR_SELF_ONBOARDING") {
            window.location.href = "/gl-gcc/self-onboarding";
          }
        },
        onError: (err) => setApiError(err.message),
      });
    },
  });

  const handleResend = async () => {
    setApiError(null);
    const payload = { identifier };
    const encryptedPayload = await encryptPayload(payload);
    const cb = {
      onSuccess: () => {
        if (isPhone) setSmsOtpInitiateTimestamp(Date.now());
        else setEmailOtpInitiateTimestamp(Date.now());
      },
      onError: (err: Error) => setApiError(err.message),
    };
    if (isPhone) resendPhoneOtp(encryptedPayload, cb);
    else resendOtp(encryptedPayload, cb);
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
      <AuthHeading title="Enter the code we sent">
        We sent a {OTP_LENGTH}-digit code to {target}.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="otp"
        validators={{
          onChange: ({ value }) => {
            const r = otpSchema.shape.otp.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel>{isPhone ? "Phone OTP" : "Email OTP"}</FieldLabel>
            <OtpInput
              value={field.state.value}
              onChange={field.handleChange}
              onComplete={() => void form.handleSubmit()}
              length={OTP_LENGTH}
              invalid={field.state.meta.errors.length > 0}
              autoFocus
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <ResendOtpMessage
        startTime={isPhone ? smsTs : emailTs}
        message="Didn't receive it?"
        onResend={() => void handleResend()}
      />
      <Button type="submit" size="lg" isLoading={isPending} className="w-full">
        Verify &amp; continue
      </Button>

      {hasPassword && !isPhone && (
        <>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setScreen("password")}
            className="w-full"
          >
            Sign in with password instead
          </Button>
        </>
      )}
    </form>
  );
}
