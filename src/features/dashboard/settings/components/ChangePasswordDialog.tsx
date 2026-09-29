"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";
import { useAppForm } from "@/components/form/AppForm";
import { check, required, rules } from "@/components/form/rules";
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

  const form = useAppForm({
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password, then choose a new one.</DialogDescription>
        </div>

        <form.AppForm>
          <form.Form className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              {apiError && <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>}

              {/* "… is required" is named here, not in the shared login schema
                  (auth forms keep theirs); the schema then checks the rest. */}
              <form.AppField
                name="currentPassword"
                validators={{
                  onChange: rules(
                    required("Current password"),
                    check(
                      (value: string) =>
                        changePasswordSchema.shape.currentPassword.safeParse(value).error?.issues[0]
                          ?.message
                    )
                  ),
                }}
              >
                {(field) => (
                  <field.PasswordField
                    id="settings-current-password"
                    label="Current password"
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                  />
                )}
              </form.AppField>

              <form.AppField
                name="newPassword"
                validators={{
                  onChange: rules(
                    required("New password"),
                    check(
                      (value: string) =>
                        changePasswordSchema.shape.newPassword.safeParse(value).error?.issues[0]
                          ?.message
                    )
                  ),
                }}
              >
                {(field) => (
                  <field.PasswordField
                    id="settings-new-password"
                    label="New password"
                    autoComplete="new-password"
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
                  onChange: ({ value, fieldApi }) =>
                    rules(
                      required("Confirm new password"),
                      check(
                        (confirm: string) =>
                          confirm !== fieldApi.form.getFieldValue("newPassword") &&
                          "The passwords do not match"
                      ),
                      check(
                        (confirm: string) =>
                          changePasswordSchema.shape.confirmPassword.safeParse(confirm).error
                            ?.issues[0]?.message
                      )
                    )({ value }),
                }}
              >
                {(field) => (
                  <field.PasswordField
                    id="settings-confirm-password"
                    label="Confirm new password"
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter the new password"
                  />
                )}
              </form.AppField>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <form.SubmitButton size="md" isLoading={isPending}>
                Update password
              </form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
