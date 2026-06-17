"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button, Field, FieldError, FieldLabel, PasswordInput } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { PasswordRules } from "@/features/auth/components/PasswordRules";
import { useForgotPassword } from "@/stores/useForgotPassword";
import { resetPasswordSchema } from "@/features/auth/login/schemas";
import { usePost } from "@/lib/api/hooks";
import { forgotPasswordUpdateApi } from "@/features/auth/forgot-password/services";
import type { AuthEnvelope } from "@/features/auth/types";

/** Step 3: set the new password, then return to sign-in. */
export function ResetPasswordForm() {
  const router = useRouter();
  const { mutate, isPending } = usePost<AuthEnvelope, { newPassword: string; newConfirmedPassword: string }>(forgotPasswordUpdateApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const reset = useForgotPassword((s) => s.reset);

  const form = useForm({
    defaultValues: { newPassword: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const validation = resetPasswordSchema.safeParse(value);
      if (!validation.success) return;
      mutate(
        { newPassword: value.newPassword, newConfirmedPassword: value.confirmPassword },
        {
          onSuccess: (res) => {
            if (res.status === "CHANGED" || res.status === "PASSWORD_CHANGE_COMPLETED") {
              reset();
              toast.success("Password updated. Please sign in with your new password.");
              router.replace("/login");
            }
          },
          onError: (err) => setApiError(err.message),
        }
      );
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
      <AuthHeading title="Set a new password">
        Choose a strong password you haven&apos;t used before.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="newPassword"
        validators={{
          onBlur: ({ value }) => {
            const r = resetPasswordSchema.shape.newPassword.safeParse(value);
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
              autoFocus
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
            const r = resetPasswordSchema.shape.confirmPassword.safeParse(value);
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
