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
  Separator,
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
 * Still no real DGFT integration (see DgftConnectGate) — this only changes
 * how the same mock login is presented.
 */
export function DgftLoginDialog({
  open,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onOpenChange,
  onLogin,
}: {
  open: boolean;
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
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

        <Separator className="my-5" />

        <div className="space-y-4">
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
            <Input
              id="dgft-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="shadow-none"
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" variant="primary" className="w-full" onClick={onLogin}>
            Login to DGFT
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
