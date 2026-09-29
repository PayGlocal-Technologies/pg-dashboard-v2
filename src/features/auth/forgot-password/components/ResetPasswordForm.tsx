"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppForm } from "@/components/form/AppForm";
import { toast } from "sonner";
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
  const { mutate, isPending } = usePost<
    AuthEnvelope,
    { newPassword: string; newConfirmedPassword: string }
  >(forgotPasswordUpdateApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const reset = useForgotPassword((s) => s.reset);

  const form = useAppForm({
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
    <form.AppForm>
      <form.Form className="space-y-5">
        <AuthHeading title="Set a new password">
          Choose a strong password you haven&apos;t used before.
        </AuthHeading>
        <AuthError message={apiError} />

        <form.AppField
          name="newPassword"
          validators={{
            onBlur: ({ value }) => {
              const r = resetPasswordSchema.shape.newPassword.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <field.PasswordField
              id="newPassword"
              label="New password"
              autoComplete="new-password"
              autoFocus
              placeholder="Create a strong password"
            />
          )}
        </form.AppField>

        <form.Subscribe selector={(s) => s.values.newPassword}>
          {(newPassword) => <PasswordRules value={newPassword} />}
        </form.Subscribe>

        <form.AppField
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
            <field.PasswordField
              id="confirmPassword"
              label="Confirm new password"
              autoComplete="new-password"
              placeholder="Re-enter the new password"
            />
          )}
        </form.AppField>

        <form.SubmitButton size="lg" isLoading={isPending} className="w-full">
          Update password
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
