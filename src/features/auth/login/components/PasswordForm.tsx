"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { Button, Field, FieldError, FieldLabel, PasswordInput, Separator } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { useEncryptPayload } from "@/features/auth/hooks";
import { getRedirectionPath } from "@/features/auth/helpers";
import { useLogin } from "@/stores/useLogin";
import { passwordSchema } from "@/features/auth/login/schemas";
import { usePost } from "@/lib/api/hooks";
import { verifyPasswordApi, resendOtpApi, usernameOtpApi } from "@/features/auth/login/services";
import { sendMessage } from "@/lib/utils/sendMessage";
import type { LoginScreenProps } from "@/features/auth/login/types";
import type { AuthEnvelope, AuthedData } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

/** Step 2a: verify the password; may escalate to email 2FA. */
export function PasswordForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const { mutate: verifyPassword, isPending } = usePost<AuthEnvelope<AuthedData>, EncryptedPayload>(
    verifyPasswordApi
  );
  const { mutate: sendOtp, isPending: sendingOtp } = usePost<AuthEnvelope, EncryptedPayload>(
    usernameOtpApi
  );
  const { mutate: resendOtp, isPending: resendingOtp } = usePost<AuthEnvelope, EncryptedPayload>(
    resendOtpApi
  );
  const [apiError, setApiError] = useState<string | null>(null);

  const identifier = useLogin((s) => s.identifier);
  const maskedEmail = useLogin((s) => s.maskedEmail);
  const userCreationType = useLogin((s) => s.userCreationType);
  const isWebsiteLogin = useLogin((s) => s.isWebsiteLogin);
  const setEmailOtpInitiateTimestamp = useLogin((s) => s.setEmailOtpInitiateTimestamp);
  const setIsPhoneNumberOtpLogin = useLogin((s) => s.setIsPhoneNumberOtpLogin);

  const form = useForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const payload = { identifier, password: value.password };
      const encryptedPayload = await encryptPayload(payload);
      verifyPassword(encryptedPayload, {
        onSuccess: (res) => {
          if (res.status === "AUTHENTICATED_EMAIL_MFA_REQUIRED") {
            setEmailOtpInitiateTimestamp(Date.now());
            setScreen("twoFA");
          } else if (res.status === "AUTHENTICATED") {
            if (isWebsiteLogin) {
              sendMessage({ type: "WEBSITE_LOGIN_SUCCESS", status: res.status, userCreationType });
            } else {
              window.location.href = getRedirectionPath(userCreationType);
            }
          } else if (res.status === "AUTHENTICATION_FOR_PHONE_NUMBER_CAPTURE") {
            setScreen("phoneNumber");
          }
        },
        onError: (err) => setApiError(err.message),
      });
    },
  });

  const handleUseOtp = async () => {
    setApiError(null);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
    const payload = { identifier };
    const encryptedPayload = await encryptPayload(payload);
    const otpFn = isEmail ? resendOtp : sendOtp;
    otpFn(encryptedPayload, {
      onSuccess: (res) => {
        if (res.status === "AUTHENTICATED_EMAIL_MFA_REQUIRED") {
          setIsPhoneNumberOtpLogin(false);
          setEmailOtpInitiateTimestamp(Date.now());
          setScreen("otp");
        }
      },
      onError: (err) => {
        if (!isEmail) setApiError(err.message);
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
      <AuthHeading title="Enter your password">
        {maskedEmail ? `Signing in as ${maskedEmail}` : `Signing in as ${identifier}`}
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => {
            const r = passwordSchema.shape.password.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              {isWebsiteLogin ? (
                <button
                  type="button"
                  onClick={() => sendMessage({ type: "WEBSITE_FORGOT_PASSWORD" })}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              ) : (
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              autoFocus
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="Enter your password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <Button type="submit" size="lg" isLoading={isPending} className="w-full">
        Continue
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">OR</span>
        <Separator className="flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        isLoading={sendingOtp || resendingOtp}
        onClick={() => void handleUseOtp()}
        className="w-full"
      >
        Sign in with email OTP instead
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
