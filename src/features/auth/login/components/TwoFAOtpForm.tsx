"use client";

import { useState } from "react";
import { Button, FieldLabel, OtpInput } from "@/components/ui";
import { useAppForm } from "@/components/form/AppForm";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { ResendOtpMessage } from "@/features/auth/components/ResendOtpMessage";
import { useEncryptPayload } from "@/features/auth/hooks";
import { getRedirectionPath } from "@/features/auth/helpers";
import { useLogin } from "@/stores/useLogin";
import { OTP_LENGTH, otpSchema } from "@/features/auth/login/schemas";
import { usePost } from "@/lib/api/hooks";
import { verifyChangePasswordOtpApi, resendOtpApi } from "@/features/auth/login/services";
import type { LoginScreenProps } from "@/features/auth/login/types";
import type { AuthEnvelope, AuthedData } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

/** Step 3 (MFA): email 2FA after a password login. May lead to change-password. */
export function TwoFAOtpForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const { mutate: verifyTwoFa, isPending } = usePost<AuthEnvelope<AuthedData>, EncryptedPayload>(
    verifyChangePasswordOtpApi
  );
  const { mutate: resendOtp } = usePost<AuthEnvelope, EncryptedPayload>(resendOtpApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const identifier = useLogin((s) => s.identifier);
  const maskedEmail = useLogin((s) => s.maskedEmail);
  const userCreationType = useLogin((s) => s.userCreationType);
  const emailTs = useLogin((s) => s.emailOtpInitiateTimestamp);
  const setEmailOtpInitiateTimestamp = useLogin((s) => s.setEmailOtpInitiateTimestamp);

  const form = useAppForm({
    defaultValues: { otp: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const validation = otpSchema.safeParse(value);
      if (!validation.success) return;
      const payload = { identifier, emailOtp: value.otp };
      const encryptedPayload = await encryptPayload(payload);
      verifyTwoFa(encryptedPayload, {
        onSuccess: (res) => {
          if (res.status === "AUTHENTICATED_FOR_CHANGE_PASSWORD") {
            setScreen("changePassword");
          } else if (res.status === "AUTHENTICATED" || res.status === "OTP_VERIFIED") {
            window.location.href = getRedirectionPath(userCreationType);
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
    resendOtp(encryptedPayload, {
      onSuccess: () => setEmailOtpInitiateTimestamp(Date.now()),
      onError: (err) => setApiError(err.message),
    });
  };

  return (
    <form.AppForm>
      <form.Form className="space-y-5">
        <AuthHeading title="Two-factor verification">
          For extra security, enter the {OTP_LENGTH}-digit code sent to {maskedEmail || identifier}.
        </AuthHeading>
        <AuthError message={apiError} />

        <form.AppField
          name="otp"
          validators={{
            onChange: ({ value }) => {
              const r = otpSchema.shape.otp.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <field.CustomField<string>>
              {({ value, invalid, onChange }) => (
                <>
                  <FieldLabel>Email OTP</FieldLabel>
                  <OtpInput
                    value={value}
                    onChange={onChange}
                    onComplete={() => void form.handleSubmit()}
                    length={OTP_LENGTH}
                    invalid={invalid}
                    autoFocus
                  />
                </>
              )}
            </field.CustomField>
          )}
        </form.AppField>

        <ResendOtpMessage
          startTime={emailTs}
          message="Didn't receive it?"
          onResend={() => void handleResend()}
        />
        <form.SubmitButton size="lg" isLoading={isPending} className="w-full">
          Verify
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
