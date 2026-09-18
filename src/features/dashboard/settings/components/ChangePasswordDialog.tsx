"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  PasswordInput,
} from "@/components/ui";
import { PasswordRules } from "@/features/auth/components/PasswordRules";
import { useEncryptPayload } from "@/features/auth/hooks";
import { changePasswordSchema } from "@/features/auth/login/schemas";
import { changePasswordApi } from "@/features/auth/login/services";
import { usePost } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import type { AuthEnvelope } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Reuses the exact same changePasswordSchema/changePasswordApi/
 * useEncryptPayload the login flow's forced-password-change screen already
 * uses (see ChangePasswordForm.tsx), a real API call rather than a mocked
 * one, sourcing `identifier` from the signed-in profile instead of the
 * login-only useLogin store. */
export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const profile = useApp((s) => s.profile);
  const identifier = profile?.emailId || profile?.username || "";
  const encryptPayload = useEncryptPayload();
  const { mutate, isPending } = usePost<AuthEnvelope, EncryptedPayload>(changePasswordApi);
  const [apiError, setApiError] = useState<string | null>(null);

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
            toast.success("Password updated");
            form.reset();
            onOpenChange(false);
          }
        },
        onError: (err) => setApiError(err.message),
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Change password</DialogTitle>
        <DialogDescription>Enter your current password, then choose a new one.</DialogDescription>

        {apiError && <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
          noValidate
        >
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
                <FieldLabel htmlFor="settings-current-password">Current password</FieldLabel>
                <PasswordInput
                  id="settings-current-password"
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
                <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
                <PasswordInput
                  id="settings-new-password"
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
                <FieldLabel htmlFor="settings-confirm-password">Confirm new password</FieldLabel>
                <PasswordInput
                  id="settings-confirm-password"
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

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" isLoading={isPending}>
              Update password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
