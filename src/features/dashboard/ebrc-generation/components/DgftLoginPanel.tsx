"use client";

import { Button, Field, FieldLabel, Input, PasswordInput } from "@/components/ui";
import { EbrcWhyList } from "@/features/dashboard/ebrc/components/EbrcBanner";

/**
 * DGFT account login — rendered inline in place of EbrcBanner (same
 * bordered/rounded box footprint), not a dialog and not a full-screen
 * takeover. Left: the login form, left-aligned, CTA directly under the
 * fields. Right: a light-grey info panel explaining what a DGFT account is
 * for — reuses EbrcWhyList so the "why connect" pitch matches EbrcBanner's
 * wording exactly rather than drifting into a second copy of it.
 *
 * Credentials go straight to `validate_customer` (see DgftConnectGate) and are
 * never kept: no browser storage, no logging, and the fields are cleared the
 * moment the panel closes.
 */
export function DgftLoginPanel({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onCancel,
  onLogin,
  isPending = false,
}: {
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onLogin: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl lg:flex-row">
      <div className="flex-1 px-6 py-8 sm:px-10 sm:py-10">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          DGFT account login
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Enter your DGFT portal credentials to connect your account to PayGlocal.
        </p>

        <div className="mt-6 max-w-sm space-y-4">
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

        <div className="mt-6 flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onLogin}
            disabled={isPending || !username.trim() || !password}
            isLoading={isPending}
          >
            Login to DGFT
          </Button>
        </div>
      </div>

      <div className="w-full shrink-0 bg-muted/40 px-6 py-8 sm:px-10 sm:py-10 lg:w-96">
        <div className="space-y-2.5">
          <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
            Bring your eBRCs closer to your payments
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            Link your DGFT portal with PayGlocal to connect export transactions with eBRCs and
            simplify your compliance workflow.
          </p>
        </div>

        <EbrcWhyList className="mt-5" />
      </div>
    </div>
  );
}
