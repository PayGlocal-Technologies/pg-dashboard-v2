"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button, Field, FieldError, FieldLabel, PasswordInput } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { PasswordRules } from "@/features/auth/components/PasswordRules";
import { useEncryptPayload } from "@/features/auth/hooks";
import { useLogin } from "@/stores/useLogin";
import { changePasswordSchema } from "@/features/auth/login/schemas";
import { usePost } from "@/lib/api/hooks";
import { changePasswordApi } from "@/features/auth/login/services";
import type { LoginScreenProps } from "@/features/auth/login/types";
import type { AuthEnvelope } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

/** Step 4: change an expired password, then return to sign-in. */
export function ChangePasswordForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const { mutate, isPending } = usePost<AuthEnvelope, EncryptedPayload>(changePasswordApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const identifier = useLogin((s) => s.identifier);
  const setHasChangedPassword = useLogin((s) => s.setHasChangedPassword);

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const validation = changePasswordSchema.safeParse(value);
      if (!validation.success) return;
      const payload = {
        identifier,
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        newConfirmedPassword: value.confirmPassword,
      };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          if (res.status === "PASSWORD_CHANGE_COMPLETED" || res.status === "CHANGED") {
            setHasChangedPassword(true);
            toast.success("Password updated. Please sign in with your new password.");
            setScreen("identifier");
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
      <AuthHeading title="Update your password">
        Your password has expired. Set a new one to continue.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="currentPassword"
        validators={{
          onBlur: ({ value }) => {
            const r = changePasswordSchema.shape.currentPassword.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="Enter your current password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <form.Field
        name="newPassword"
        validators={{
          onBlur: ({ value }) => {
            const r = changePasswordSchema.shape.newPassword.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="newPassword">New password</FieldLabel>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="Create a strong password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.newPassword}>
        {(newPassword) => <PasswordRules value={newPassword} />}
      </form.Subscribe>

      <form.Field
        name="confirmPassword"
        validators={{
          onBlur: ({ value, fieldApi }) => {
            if (value !== fieldApi.form.getFieldValue("newPassword")) {
              return "The passwords do not match";
            }
            const r = changePasswordSchema.shape.confirmPassword.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="Re-enter the new password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <Button type="submit" size="lg" isLoading={isPending} className="w-full">
        Update password
      </Button>
    </form>
  );
}
