"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  PasswordInput,
} from "@/components/ui";
import { Icon } from "@/components/icon";

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

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <Field>
            <FieldLabel htmlFor="dgft-username">Username</FieldLabel>
            <Input
              id="dgft-username"
              autoComplete="off"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="shadow-none"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dgft-password">Password</FieldLabel>
            <PasswordInput
              id="dgft-password"
              autoComplete="off"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="shadow-none"
            />
          </Field>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={onLogin}
            disabled={isPending || !username.trim() || !password}
            isLoading={isPending}
          >
            Login to DGFT
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
