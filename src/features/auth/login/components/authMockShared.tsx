"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { useCountdown } from "@/features/auth/hooks";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";

/**
 * Pieces shared by the DESIGN MOCK sign-up and sign-in cards
 * (SignUpMockForm, SignInMockForm). UI only; nothing here calls the backend.
 */

/** Supported countries, also the phone-code options. Keyed by ISO2, not
 *  dial code, since dial codes aren't unique (+1 is US and Canada). */
export const COUNTRIES = [
  { iso2: "IN", name: "India", dialCode: "+91" },
  { iso2: "SG", name: "Singapore", dialCode: "+65" },
  { iso2: "US", name: "United States", dialCode: "+1" },
] as const;

export const RESEND_WINDOW_SECONDS = 30;

export const CONTROL = "h-10 min-h-10 bg-card px-3 text-[13px] shadow-none";
export const LABEL = "text-[12.5px] font-medium";
export const FIELD = "gap-1.5";
export const PRIMARY_BUTTON = "h-10 min-h-10 w-full text-[13px] font-medium";
const SSO_BUTTON = "h-10 min-h-10 bg-card text-[13px] font-medium shadow-none";

export function notConnected(action: string) {
  toast.message(`${action} isn't connected yet`, {
    description: "This screen is a design preview. Nothing was sent.",
  });
}

export function TextLink({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-auto min-h-0 p-0 text-[length:inherit] font-medium"
    >
      {children}
    </Button>
  );
}

/** One row of a choice box (linked accounts, roles): the whole row is the button, with a
 *  chevron to say so. */
export function ChoiceRow({
  onClick,
  leading,
  title,
  subtitle,
  badge,
}: {
  onClick: () => void;
  leading: ReactNode;
  title: string;
  subtitle?: string;
  /** Beside the title, e.g. a role chip. */
  badge?: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="h-auto min-h-0 w-full justify-start rounded-none px-3 py-2.5 [&>span]:w-full"
    >
      <span className="flex w-full items-center gap-3 text-left">
        {leading}
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13px] font-medium text-foreground">{title}</span>
            {badge}
          </span>
          {subtitle && (
            <span className="block truncate text-[12px] font-normal text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
        <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </span>
    </Button>
  );
}

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
      onClick={onClick}
      className="-ml-2 mb-3 h-7 min-h-0 px-2 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
    >
      Back
    </Button>
  );
}

export function CardHeading({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <div className="mb-5 space-y-1">
      <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function SsoRow({ dividerLabel = "or continue with email" }: { dividerLabel?: string }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          variant="outline"
          leftIcon={<Icon name="google-logo" className="h-4 w-4" />}
          onClick={() => notConnected("Google sign-in")}
          className={SSO_BUTTON}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          leftIcon={<Icon name="facebook-logo" className="h-4 w-4" />}
          onClick={() => notConnected("Facebook sign-in")}
          className={SSO_BUTTON}
        >
          Facebook
        </Button>
      </div>
      <OrDivider label={dividerLabel} />
    </>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <Separator className="flex-1" />
    </div>
  );
}

/** "Resend code", locked for 30s after each send. Mount it only on the
 *  step that shows the code, so the countdown starts fresh there. */
export function OtpActions({ sentAt, onResend }: { sentAt: number; onResend: () => void }) {
  const remaining = useCountdown(sentAt, RESEND_WINDOW_SECONDS);
  return (
    <div className="text-[12px] text-muted-foreground">
      Didn&apos;t get it?{" "}
      <TextLink onClick={onResend} disabled={remaining > 0}>
        Resend code
      </TextLink>
      {remaining > 0 && (
        <span className="tabular-nums"> in 0:{String(remaining).padStart(2, "0")}</span>
      )}
    </div>
  );
}

/** Puts the caret after the last character, so a field focused mid-typing
 *  (see the sign-in identifier) carries on where the merchant was. */
export function moveCaretToEnd(input: HTMLInputElement) {
  const end = input.value.length;
  // Only text-like inputs support selection ranges.
  try {
    input.setSelectionRange(end, end);
  } catch {
    // Not supported for this input type; the default caret is fine.
  }
}

export function dialCodeFor(iso2: string) {
  return COUNTRIES.find((c) => c.iso2 === iso2)?.dialCode;
}

/** "+91 98765 43210": the number as entered, so a typo is easy to spot. */
export function formatPhone(iso2: string, phone: string) {
  const number = phone.trim();
  if (!number) return null;
  return `${dialCodeFor(iso2) ?? ""} ${number}`.trim();
}

/**
 * Dial-code picker + number, side by side. The closed picker shows flag +
 * dial code only, to stay narrow; the open list adds the country name so
 * each code is unambiguous.
 */
export function PhoneInputRow({
  id,
  code,
  onCodeChange,
  number,
  onNumberChange,
  onBlur,
  label,
  autoFocus,
  onNonNumericInput,
}: {
  id: string;
  /** Accessible name when no visible label sits above the row. */
  label?: string;
  /** Focus the number on mount, caret at the end (for a field that has just
   *  turned into this row mid-typing). */
  autoFocus?: boolean;
  /** Called instead of onNumberChange when the typed value has anything
   *  other than digits, spaces or dashes, e.g. a letter or "@" (someone
   *  typing an email that starts with digits). Without it, such characters
   *  are just stripped. */
  onNonNumericInput?: (raw: string) => void;
  code: string;
  onCodeChange: (iso2: string) => void;
  number: string;
  onNumberChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const selected = COUNTRIES.find((c) => c.iso2 === code);
  return (
    <div className="flex gap-2">
      <Select value={code} onValueChange={onCodeChange}>
        <SelectTrigger aria-label="Country code" className={`w-28 shrink-0 ${CONTROL}`}>
          <SelectValue>
            {selected && (
              <span className="flex items-center gap-2">
                <CountryFlag iso2={selected.iso2} />
                <span className="tabular-nums">{selected.dialCode}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.iso2} value={c.iso2} className="text-[13px]">
              <span className="flex items-center gap-2">
                <CountryFlag iso2={c.iso2} />
                <span className="tabular-nums">{c.dialCode}</span>
                <span className="text-muted-foreground">{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        aria-label={label}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="Enter phone number"
        value={number}
        autoFocus={autoFocus}
        onFocus={(e) => moveCaretToEnd(e.currentTarget)}
        onChange={(e) => {
          const raw = e.target.value;
          if (onNonNumericInput && /[^\d\s-]/.test(raw)) onNonNumericInput(raw);
          else onNumberChange(raw.replace(/[^\d\s-]/g, ""));
        }}
        onBlur={onBlur}
        className={`min-w-0 flex-1 ${CONTROL}`}
      />
    </div>
  );
}
