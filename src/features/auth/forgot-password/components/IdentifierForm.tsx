"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { Button, Field, FieldError, FieldLabel, Input } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { useEncryptPayload } from "@/features/auth/hooks";
import { useForgotPassword } from "@/stores/useForgotPassword";
import { identifierSchema } from "@/features/auth/login/schemas";
import { usePost } from "@/lib/api/hooks";
import { forgotPasswordSendOtpApi } from "@/features/auth/forgot-password/services";
import type { ForgotPasswordScreenProps } from "@/features/auth/forgot-password/types";
import type { AuthEnvelope } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

/** Step 1: collect the identifier and send a reset OTP. */
export function IdentifierForm({ setScreen }: ForgotPasswordScreenProps) {
  const encryptPayload = useEncryptPayload();
  const { mutate, isPending } = usePost<AuthEnvelope, EncryptedPayload>(forgotPasswordSendOtpApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const setIdentifier = useForgotPassword((s) => s.setIdentifier);
  const setMaskedEmail = useForgotPassword((s) => s.setMaskedEmail);
  const setMaskedPhoneNumber = useForgotPassword((s) => s.setMaskedPhoneNumber);
  const setOtpInitiateTimestamp = useForgotPassword((s) => s.setOtpInitiateTimestamp);

  const form = useForm({
    defaultValues: { identifier: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const validation = identifierSchema.safeParse(value);
      if (!validation.success) return;
      const payload = { identifier: value.identifier };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          if (res.status === "OTP_SENT") {
            setIdentifier(value.identifier);
            const data = res.data as { maskedEmail?: string; maskedPhoneNumber?: string } | undefined;
            if (data?.maskedEmail) setMaskedEmail(data.maskedEmail);
            if (data?.maskedPhoneNumber) setMaskedPhoneNumber(data.maskedPhoneNumber);
            setOtpInitiateTimestamp(Date.now());
            setScreen("resetOtp");
          } else if ((res.status as string) === "USERNAME_REQUIRED") {
            setIdentifier(value.identifier);
            setScreen("username");
          }
        },
        onError: (err) => setApiError(err.message),
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-5"
      noValidate
    >
      <AuthHeading title="Reset your password">
        Enter your account email, phone, or username and we&apos;ll send you a verification code.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="identifier"
        validators={{
          onBlur: ({ value }) => {
            const r = identifierSchema.shape.identifier.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="identifier">Email, phone, or username</FieldLabel>
            <Input
              id="identifier"
              autoComplete="username"
              autoFocus
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="you@company.com"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <Button type="submit" size="lg" isLoading={isPending} className="w-full">
        Send code
      </Button>
      <Link
        href="/login"
        className="block text-center text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Back to sign in
      </Link>
    </form>
  );
}
