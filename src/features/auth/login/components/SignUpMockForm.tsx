"use client";

import { useState, type ReactNode } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { AnimatePresence, motion } from "framer-motion";
import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  Field,
  FieldLabel,
  Input,
  OtpInput,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { OTP_LENGTH } from "@/features/auth/login/schemas";
import { isSignInView, useAuthView, type SignUpView } from "@/stores/useAuthView";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { SignInMockForm } from "@/features/auth/login/components/SignInMockForm";
import {
  initials,
  MAX_ACCOUNTS_PER_PHONE,
  mockAccountsForPhone,
  type MockAccount,
} from "@/features/auth/login/mockAccounts";
import {
  BackLink,
  CardHeading,
  CONTROL,
  COUNTRIES,
  FIELD,
  formatPhone,
  LABEL,
  notConnected,
  OtpActions,
  PhoneInputRow,
  PRIMARY_BUTTON,
  SsoRow,
  TextLink,
} from "@/features/auth/login/components/authMockShared";

/**
 * DESIGN MOCK: the unified sign-up / sign-in card, UI only.
 *
 * Nothing here calls the backend; every submit and SSO button just toasts.
 * The real step-by-step flow (IdentifierForm, then password / OTP, ...) is
 * untouched in `LoginFeature` and still wired to the live endpoints; swap
 * `app/(auth)/login/page.tsx` back to it to restore real sign-in. Before this
 * mock is made real, every field and endpoint must be matched against
 * pg-dashboard per CLAUDE.md's migration checklist.
 *
 * This component is sign-up; sign-in screens hand over to SignInMockForm.
 * Sign-up is three steps:
 *  1. Account: email, full name, password, phone. "Continue" sends the OTP.
 *  2. Verify: the mobile OTP (plus a note that an email link went out too).
 *     If the number already has accounts, a "linked" screen follows inside
 *     this step: sign in to one of them, or create another (blocked at the
 *     limit of 3). It sits here because this is the first point the
 *     merchant has proved they own the number, so the linked emails can be
 *     shown in full, and it comes before they invest in step 3.
 *  3. About you: registered country, then create account.
 *
 * Account rules the real sign-up must enforce (backend): an email can hold
 * only one account; a phone number can be linked to at most 3 accounts.
 */

/** Sign-up steps, in order. */
const STEPS = ["account", "verify", "about"] as const satisfies readonly SignUpView[];

const COPY: Record<Exclude<SignUpView, "linked">, { title: string; cta: string }> = {
  account: { title: "Create your account", cta: "Continue" },
  verify: { title: "Verify your phone number", cta: "Continue" },
  about: { title: "Where is your business registered?", cta: "Create account" },
};

/** "Step n of 3", then one bar segment per step. */
function StepMeter({ step }: { step: SignUpView }) {
  // "linked" is part of step 2, not a step of its own.
  const current = STEPS.indexOf(step === "linked" ? "verify" : step) + 1;
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="shrink-0 text-[11.5px] font-medium tabular-nums text-muted-foreground">
        Step {current} of {STEPS.length}
      </span>
      <div className="flex flex-1 gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < current ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * After OTP: the accounts this number is already linked to. Emails are shown
 * in full here, since the merchant has just proved they own the number.
 */
function LinkedAccounts({
  accounts,
  email,
  phoneLabel,
  onCreate,
  onSignIn,
  onEditDetails,
}: {
  accounts: MockAccount[];
  email: string;
  phoneLabel: string;
  onCreate: () => void;
  onSignIn: () => void;
  onEditDetails: () => void;
}) {
  const count = accounts.length;
  const atLimit = count >= MAX_ACCOUNTS_PER_PHONE;
  const normalizedEmail = email.trim().toLowerCase();
  // One email can hold only one account.
  const emailTaken = accounts.some((a) => a.email.toLowerCase() === normalizedEmail);
  const canCreate = !atLimit && !emailTaken;
  const noun = count === 1 ? "account" : "accounts";

  return (
    <>
      <CardHeading
        title={`This number already has ${count} ${noun}`}
        subtitle={
          <>
            <span className="whitespace-nowrap font-medium text-foreground tabular-nums">
              {phoneLabel}
            </span>{" "}
            {atLimit
              ? `has reached the limit of ${MAX_ACCOUNTS_PER_PHONE} accounts, so a new one can't be added to it.`
              : emailTaken
                ? "is linked to the accounts below, and your email already has one of them."
                : `is linked to the ${noun} below. Sign in to ${count === 1 ? "it" : "one of them"}, or create a new account with ${normalizedEmail || "your email"}.`}
          </>
        }
      />

      <Card className="gap-0 overflow-hidden p-0 shadow-none">
        {accounts.map((account, i) => (
          <div key={account.id}>
            {i > 0 && <Separator />}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-[11.5px] font-semibold text-primary">
                  {initials(account)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {account.fullName}
                </p>
                <p className="truncate text-[12px] text-muted-foreground">{account.email}</p>
              </div>
            </div>
          </div>
        ))}
      </Card>

      {canCreate && (
        <p className="mt-2.5 text-[12px] text-muted-foreground">
          A number can be linked to up to {MAX_ACCOUNTS_PER_PHONE} accounts. This will be account{" "}
          {count + 1} of {MAX_ACCOUNTS_PER_PHONE}.
        </p>
      )}

      <div className="mt-5 space-y-2.5">
        {canCreate ? (
          <>
            <Button type="button" variant="primary" onClick={onCreate} className={PRIMARY_BUTTON}>
              Create a new account
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSignIn}
              className="h-10 min-h-10 w-full bg-card text-[13px] font-medium shadow-none"
            >
              Sign in to an existing account
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="primary" onClick={onSignIn} className={PRIMARY_BUTTON}>
              Sign in to an existing account
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onEditDetails}
              className="h-10 min-h-10 w-full bg-card text-[13px] font-medium shadow-none"
            >
              {atLimit ? "Use a different number" : "Use a different email"}
            </Button>
          </>
        )}
      </div>
    </>
  );
}

export function SignUpMockForm() {
  // Shared with the brand panel, which swaps its artwork for sign-in.
  const view = useAuthView((st) => st.view);
  if (isSignInView(view)) return <SignInMockForm />;
  return <SignUpSteps view={view} />;
}

function SignUpSteps({ view }: { view: SignUpView }) {
  const setView = useAuthView((st) => st.setView);
  const signInWithPhone = useAuthView((st) => st.signInWithPhone);
  /** When the mobile OTP was (mock) last sent; drives the resend lock. */
  const [otpSentAt, setOtpSentAt] = useState(0);

  const form = useForm({
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      phoneCode: "IN",
      phone: "",
      otp: "",
      country: "",
    },
    onSubmit: () => notConnected("Sign up"),
  });

  const email = useStore(form.store, (st) => st.values.email);
  const phoneCode = useStore(form.store, (st) => st.values.phoneCode);
  const phone = useStore(form.store, (st) => st.values.phone);
  const enteredPhone = formatPhone(phoneCode, phone);
  // Mock lookup of the accounts this number already has (after OTP, so
  // unmasked). Derived from the entered number, so it needs no state.
  const linked = mockAccountsForPhone(phone, { masked: false });

  const copy = view === "linked" ? null : COPY[view];
  const previous: SignUpView | undefined =
    view === "verify"
      ? "account"
      : view === "about"
        ? linked.length
          ? "linked"
          : "verify"
        : undefined;

  function sendOtp() {
    form.setFieldValue("otp", "");
    setOtpSentAt(Date.now());
  }

  const subtitle: ReactNode =
    view === "account" ? (
      <>
        Already have an account? <TextLink onClick={() => setView("signIn")}>Sign in</TextLink>
      </>
    ) : view === "verify" ? (
      <>
        We sent a {OTP_LENGTH}-digit code to{" "}
        <span className="whitespace-nowrap font-medium text-foreground tabular-nums">
          {enteredPhone ?? "your mobile number"}
        </span>
        . <TextLink onClick={() => setView("account")}>Change number</TextLink>
      </>
    ) : (
      "We use this to set up the right currencies, compliance checks and settlement options for you."
    );

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {previous && <BackLink onClick={() => setView(previous)} />}
        <StepMeter step={view} />

        {view === "linked" && (
          <LinkedAccounts
            accounts={linked}
            email={email}
            phoneLabel={enteredPhone ?? "This number"}
            onCreate={() => setView("about")}
            onSignIn={() => signInWithPhone({ phoneCode, phone })}
            onEditDetails={() => setView("account")}
          />
        )}

        {copy && <CardHeading title={copy.title} subtitle={subtitle} />}

        {view === "account" && <SsoRow />}

        {copy && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Steps 1 and 2 only hand off; the final step submits.
              if (view === "account") {
                sendOtp();
                setView("verify");
                return;
              }
              if (view === "verify") {
                setView(linked.length ? "linked" : "about");
                return;
              }
              void form.handleSubmit();
            }}
            className="space-y-3.5"
            noValidate
          >
            {view === "account" && (
              <>
                <form.Field name="email">
                  {(field) => (
                    <Field className={FIELD}>
                      <FieldLabel htmlFor="auth-email" className={LABEL}>
                        Work email
                      </FieldLabel>
                      <Input
                        id="auth-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className={CONTROL}
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="fullName">
                  {(field) => (
                    <Field className={FIELD}>
                      <FieldLabel htmlFor="auth-name" className={LABEL}>
                        Full name
                      </FieldLabel>
                      <Input
                        id="auth-name"
                        autoComplete="name"
                        placeholder="Enter your full name"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className={CONTROL}
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="password">
                  {(field) => (
                    <Field className={FIELD}>
                      <FieldLabel htmlFor="auth-password" className={LABEL}>
                        Password
                      </FieldLabel>
                      {/* The rule lives in the placeholder rather than a hint
                        line, to keep step 1 within one screen. */}
                      <PasswordInput
                        id="auth-password"
                        autoComplete="new-password"
                        placeholder="8+ characters, letters and numbers"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className={CONTROL}
                      />
                    </Field>
                  )}
                </form.Field>

                <Field className={FIELD}>
                  <FieldLabel htmlFor="auth-phone" className={LABEL}>
                    Phone number
                  </FieldLabel>
                  <form.Field name="phoneCode">
                    {(codeField) => (
                      <form.Field name="phone">
                        {(numberField) => (
                          <PhoneInputRow
                            id="auth-phone"
                            code={codeField.state.value}
                            onCodeChange={codeField.handleChange}
                            number={numberField.state.value}
                            onNumberChange={numberField.handleChange}
                            onBlur={numberField.handleBlur}
                          />
                        )}
                      </form.Field>
                    )}
                  </form.Field>
                </Field>
              </>
            )}

            {view === "verify" && (
              <form.Field name="otp">
                {(field) => (
                  <Field className="gap-2.5">
                    <FieldLabel className={LABEL}>OTP</FieldLabel>
                    <OtpInput
                      value={field.state.value}
                      onChange={field.handleChange}
                      length={OTP_LENGTH}
                      autoFocus
                      aria-label="OTP"
                    />
                    <OtpActions
                      sentAt={otpSentAt}
                      onResend={() => {
                        sendOtp();
                        notConnected("Resend code");
                      }}
                    />
                  </Field>
                )}
              </form.Field>
            )}

            {view === "about" && (
              <form.Field name="country">
                {(field) => (
                  <Field className={FIELD}>
                    <FieldLabel htmlFor="auth-country" className={LABEL}>
                      Country of registration
                    </FieldLabel>
                    <Select value={field.state.value} onValueChange={field.handleChange}>
                      <SelectTrigger id="auth-country" className={`w-full ${CONTROL}`}>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.iso2} value={c.iso2} className="text-[13px]">
                            <span className="flex items-center gap-2">
                              <CountryFlag iso2={c.iso2} />
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
            )}

            <div className="pt-1">
              <Button type="submit" variant="primary" className={PRIMARY_BUTTON}>
                {copy.cta}
              </Button>
            </div>
          </form>
        )}

        {/* Consent shown once, on the first step, so it covers SSO sign-ups
            too. The only place on the screen the legal links appear. */}
        {view === "account" && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
            By continuing, you agree to our{" "}
            <TextLink onClick={() => notConnected("Terms & Conditions")}>
              Terms &amp; Conditions
            </TextLink>{" "}
            and <TextLink onClick={() => notConnected("Privacy Policy")}>Privacy Policy</TextLink>.
          </p>
        )}

        {/* Email is verified by link, separately from the phone OTP, so it's
            one quiet line on the verify step rather than a second code. */}
        {view === "verify" && (
          <p className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
            <Icon name="mail" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0">
              We&apos;ve also emailed a verification link to{" "}
              <span className="break-words font-medium text-foreground">
                {email || "your work email"}
              </span>
              . You can verify it later.{" "}
              <TextLink onClick={() => notConnected("Resend email")}>Resend</TextLink>
            </span>
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
