"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Button, Field, FieldError, FieldLabel, Input } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { useEncryptPayload } from "@/features/auth/hooks";
import { useForgotPassword } from "@/stores/useForgotPassword";
import { usePost } from "@/lib/api/hooks";
import { forgotPasswordSendOtpApi } from "@/features/auth/forgot-password/services";
import type { ForgotPasswordScreenProps } from "@/features/auth/forgot-password/types";
import type { AuthEnvelope } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

// Mirrors pg-dashboard's usernameValidator: 6–15 chars, lowercase-only, must
// start with a letter, must end with a letter or digit, no consecutive specials.
const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(6, "Username must be at least 6 characters")
    .max(15, "Username must be at most 15 characters")
    .regex(/^[a-z]/, "Username must start with a lowercase letter")
    .regex(/[a-z0-9]$/, "Username must end with a letter or number")
    .regex(/^[a-z0-9._-]+$/, "Only lowercase letters, numbers, ., _, - are allowed")
    .refine((v) => !(/[._-]{2}/).test(v), "Consecutive special characters are not allowed"),
});

/** Username disambiguation screen for the forgot-password flow. */
export function UsernameForm({ setScreen }: ForgotPasswordScreenProps) {
  const encryptPayload = useEncryptPayload();
  const { mutate, isPending } = usePost<AuthEnvelope, EncryptedPayload>(forgotPasswordSendOtpApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const setIdentifier = useForgotPassword((s) => s.setIdentifier);
  const setMaskedEmail = useForgotPassword((s) => s.setMaskedEmail);
  const setMaskedPhoneNumber = useForgotPassword((s) => s.setMaskedPhoneNumber);
  const setOtpInitiateTimestamp = useForgotPassword((s) => s.setOtpInitiateTimestamp);

  const form = useForm({
    defaultValues: { username: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      setIdentifier(value.username);
      const payload = { identifier: value.username };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          if (res.status === "OTP_SENT") {
            const data = res.data as { maskedEmail?: string; maskedPhoneNumber?: string } | undefined;
            if (data?.maskedEmail) setMaskedEmail(data.maskedEmail);
            if (data?.maskedPhoneNumber) setMaskedPhoneNumber(data.maskedPhoneNumber);
            setOtpInitiateTimestamp(Date.now());
            setScreen("resetOtp");
          } else {
            setApiError("Failed to send OTP. Please try again.");
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
      <AuthHeading title="Enter your username">
        Your account requires a username to reset your password.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="username"
        validators={{
          onBlur: ({ value }) => {
            const r = usernameSchema.shape.username.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              autoComplete="username"
              autoFocus
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="your_username"
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
