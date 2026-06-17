"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Button, Field, FieldError, FieldLabel, Input } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { useEncryptPayload } from "@/features/auth/hooks";
import { useLogin } from "@/stores/useLogin";
import { usePost } from "@/lib/api/hooks";
import { unifiedLoginApi } from "@/features/auth/login/services";
import { useGlobalTenant } from "@/features/auth/hooks";
import type { LoginScreenProps } from "@/features/auth/login/types";
import type { AuthEnvelope, IdentifierData } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Please enter your username")
    .regex(/^[a-zA-Z0-9._-]{3,}$/, "Enter a valid username (letters, numbers, ., _, -)"),
});

/** Username disambiguation screen — shown when the identifier is ambiguous. */
export function UsernameForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const isGlobal = useGlobalTenant();
  const { mutate, isPending } = usePost<AuthEnvelope<IdentifierData>, EncryptedPayload>(
    unifiedLoginApi(isGlobal)
  );
  const [apiError, setApiError] = useState<string | null>(null);

  const setIdentifier = useLogin((s) => s.setIdentifier);
  const setHasPassword = useLogin((s) => s.setHasPassword);
  const setUserCreationType = useLogin((s) => s.setUserCreationType);
  const setMaskedEmail = useLogin((s) => s.setMaskedEmail);
  const setIsPhoneNumberOtpLogin = useLogin((s) => s.setIsPhoneNumberOtpLogin);
  const setEmailOtpInitiateTimestamp = useLogin((s) => s.setEmailOtpInitiateTimestamp);
  const setSmsOtpInitiateTimestamp = useLogin((s) => s.setSmsOtpInitiateTimestamp);
  const setMaskedPhoneNumber = useLogin((s) => s.setMaskedPhoneNumber);

  const form = useForm({
    defaultValues: { username: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const payload = { identifier: value.username };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          const data = res.data;
          if (!data) return;
          setIdentifier(value.username);
          setUserCreationType(data.userCreationType);
          setHasPassword(data.hasPassword);

          if (data.responseType === "PASSWORD_REQUIRED") {
            if (data.maskedEmail) setMaskedEmail(data.maskedEmail);
            setScreen("password");
          } else if (data.responseType === "PHONE_OTP_SCREEN") {
            if (data.maskedPhoneNumber) setMaskedPhoneNumber(data.maskedPhoneNumber);
            setIsPhoneNumberOtpLogin(true);
            setSmsOtpInitiateTimestamp(Date.now());
            setScreen("otp");
          } else {
            if (data.maskedEmail) setMaskedEmail(data.maskedEmail);
            setIsPhoneNumberOtpLogin(false);
            setEmailOtpInitiateTimestamp(Date.now());
            setScreen("otp");
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
        Your account requires a username to continue.
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
        Continue
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
