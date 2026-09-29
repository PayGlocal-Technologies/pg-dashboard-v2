"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useAppForm } from "@/components/form/AppForm";
import { required, rules } from "@/components/form/rules";

/**
 * DGFT account login — a proper popup (Dialog), not the inline two-column
 * panel this used to be. A single vertical column: icon, title, description,
 * a divider, the two fields, then the actions — the structured layout the
 * inline version's plain "just some fields on the page" look was missing.
 *
 * EbrcBanner (the promo behind this) stays on screen underneath; this only
 * layers the login on top of it rather than replacing it.
 *
 * Credentials go straight to `validate_customer` (see DgftConnectGate) and are
 * never kept: no browser storage, no logging, and the fields are cleared the
 * moment the dialog closes.
 */
export function DgftLoginDialog({
  open,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onOpenChange,
  onLogin,
  isPending = false,
}: {
  open: boolean;
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
  /** `validate_customer` is in flight. */
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-sm flex-col gap-0 overflow-hidden p-0">
        {/* The header's border-b is the rule that used to sit between the
            title block and the fields. */}
        <div className="flex shrink-0 flex-col items-center gap-3 border-b border-border px-6 pb-5 pt-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle>DGFT account login</DialogTitle>
            <DialogDescription className="mt-1">
              Enter your DGFT portal credentials to connect your account to PayGlocal.
            </DialogDescription>
          </div>
        </div>

        {/* Mounted with the content, so each opening starts clean. */}
        <DgftLoginForm
          username={username}
          password={password}
          onUsernameChange={onUsernameChange}
          onPasswordChange={onPasswordChange}
          onLogin={onLogin}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The two credentials. The parent owns their values (its login call reads
 * them), so each change is mirrored up; the form owns validation. Login stays
 * enabled; errors follow the app-wide rule (components/form).
 */
function DgftLoginForm({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onLogin,
  onCancel,
  isPending,
}: {
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const form = useAppForm({
    defaultValues: { username, password },
    onSubmit: () => onLogin(),
  });

  return (
    <form.AppForm>
      <form.Form className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <form.AppField name="username" validators={{ onChange: rules(required("Username")) }}>
            {(field) => (
              <field.TextField
                id="dgft-username"
                label="Username"
                autoComplete="off"
                inputClassName="shadow-none"
                onValueChange={onUsernameChange}
              />
            )}
          </form.AppField>
          <form.AppField name="password" validators={{ onChange: rules(required("Password")) }}>
            {(field) => (
              <field.PasswordField
                id="dgft-password"
                label="Password"
                autoComplete="off"
                inputClassName="shadow-none"
                onValueChange={onPasswordChange}
              />
            )}
          </form.AppField>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-6 py-4">
          <form.SubmitButton size="md" className="w-full" pending={isPending} isLoading={isPending}>
            Login to DGFT
          </form.SubmitButton>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
