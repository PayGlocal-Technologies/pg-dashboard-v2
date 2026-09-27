"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useStore } from "@tanstack/react-form";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
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
  SegmentedTabs,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { OTP_LENGTH } from "@/features/auth/login/schemas";
import { useAuthView, type SignInView } from "@/stores/useAuthView";
import {
  BackLink,
  CardHeading,
  CONTROL,
  FIELD,
  formatPhone,
  LABEL,
  OrDivider,
  OtpActions,
  PhoneInputRow,
  PRIMARY_BUTTON,
  SsoRow,
  TextLink,
} from "@/features/auth/login/components/authMockShared";
import {
  displayEmail,
  initials,
  mockAccountsForPhone,
  type MockAccount,
} from "@/features/auth/login/mockAccounts";

/**
 * DESIGN MOCK: sign-in, UI only. Nothing here calls the backend.
 *
 *  1. Identify, by email or phone number.
 *  2. Phone only, and only when the number is linked to more than one
 *     account (max 3): choose the account. An email maps to exactly one
 *     account, so email sign-in skips this.
 *  3. Authenticate that account: its password, or an OTP instead (to the
 *     phone when signing in by phone, to the email when by email).
 *  4. Dashboard (a toast here).
 */

type Method = "email" | "phone";

const METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone number" },
] as const;

function AccountAvatar({ account }: { account: MockAccount }) {
  return (
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarFallback className="bg-primary/10 text-[11.5px] font-semibold text-primary">
        {initials(account)}
      </AvatarFallback>
    </Avatar>
  );
}

function AccountText({ account }: { account: MockAccount }) {
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate text-[13px] font-medium text-foreground">
        {account.fullName ?? account.email}
      </span>
      {account.fullName && (
        <span className="block truncate text-[12px] font-normal text-muted-foreground">
          {displayEmail(account)}
        </span>
      )}
    </span>
  );
}

/** The account being signed in to, shown atop the password and OTP steps. */
function SelectedAccount({ account, onChange }: { account: MockAccount; onChange: () => void }) {
  return (
    <Card className="mb-4 flex-row items-center gap-3 px-3 py-2.5 shadow-none">
      <AccountAvatar account={account} />
      <AccountText account={account} />
      <span className="shrink-0 text-[12px]">
        <TextLink onClick={onChange}>Change</TextLink>
      </span>
    </Card>
  );
}

export function SignInMockForm() {
  const router = useRouter();
  const storeView = useAuthView((st) => st.view) as SignInView;
  const setView = useAuthView((st) => st.setView);

  /** Accounts the identifier resolved to; null until it's submitted. */
  const [accounts, setAccounts] = useState<MockAccount[] | null>(null);
  const [selected, setSelected] = useState<MockAccount | null>(null);
  const [otpSentAt, setOtpSentAt] = useState(0);
  /** Set when a phone number has no accounts; cleared on the next edit. */
  const [notFound, setNotFound] = useState(false);

  // Later steps need what earlier ones collected. If the store points past
  // step 1 without it (e.g. returning to /login mid-flow), start over.
  const view: SignInView =
    storeView === "signIn" || !accounts || (storeView !== "signInChoose" && !selected)
      ? "signIn"
      : storeView;

  // Sign-up's "Sign in instead" hands over the number it just verified.
  const prefill = useAuthView((st) => st.signInPrefill);

  const form = useForm({
    defaultValues: {
      method: (prefill ? "phone" : "email") as Method,
      email: "",
      phoneCode: prefill?.phoneCode ?? "IN",
      phone: prefill?.phone ?? "",
      password: "",
      otp: "",
    },
  });

  const method = useStore(form.store, (st) => st.values.method);
  const phoneCode = useStore(form.store, (st) => st.values.phoneCode);
  const phone = useStore(form.store, (st) => st.values.phone);
  const enteredPhone = formatPhone(phoneCode, phone);
  const hasChoice = method === "phone" && (accounts?.length ?? 0) > 1;

  function identify() {
    if (method === "email") {
      const email = form.getFieldValue("email").trim() || "you@company.com";
      const account: MockAccount = { id: "by-email", email, masked: false };
      setAccounts([account]);
      setSelected(account);
      setView("signInPassword");
      return;
    }
    const found = mockAccountsForPhone(form.getFieldValue("phone"), { masked: true });
    if (found.length === 0) {
      setNotFound(true);
      return;
    }
    setAccounts(found);
    if (found.length > 1) {
      setSelected(null);
      setView("signInChoose");
    } else {
      setSelected(found[0] ?? null);
      setView("signInPassword");
    }
  }

  function choose(account: MockAccount) {
    setSelected(account);
    form.setFieldValue("password", "");
    setView("signInPassword");
  }

  function sendOtp() {
    form.setFieldValue("otp", "");
    setOtpSentAt(Date.now());
  }

  function signedIn() {
    toast.success(`Signed in to ${selected ? displayEmail(selected) : "your account"}`, {
      description: "Design preview: this is where the dashboard would open.",
    });
  }

  const back: Partial<Record<SignInView, SignInView>> = {
    signInChoose: "signIn",
    signInPassword: hasChoice ? "signInChoose" : "signIn",
    signInOtp: "signInPassword",
  };
  const previous = back[view];
  const changeAccount = () => setView(hasChoice ? "signInChoose" : "signIn");

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

        {view === "signIn" && (
          <>
            <CardHeading
              title="Welcome back"
              subtitle={
                <>
                  New to PayGlocal?{" "}
                  <TextLink onClick={() => setView("account")}>Create an account</TextLink>
                </>
              }
            />
            <SsoRow dividerLabel="or" />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                identify();
              }}
              className="space-y-3.5"
              noValidate
            >
              <form.Field name="method">
                {(field) => (
                  <SegmentedTabs
                    options={METHODS}
                    value={field.state.value}
                    onValueChange={(next) => {
                      field.handleChange(next);
                      setNotFound(false);
                    }}
                    label="Sign in with"
                    collapseToSelect={false}
                  />
                )}
              </form.Field>

              {/* The tab above names the field, so no visible label. */}
              {method === "email" ? (
                <form.Field name="email">
                  {(field) => (
                    <Input
                      id="signin-email"
                      aria-label="Email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={CONTROL}
                    />
                  )}
                </form.Field>
              ) : (
                <form.Field name="phoneCode">
                  {(codeField) => (
                    <form.Field name="phone">
                      {(numberField) => (
                        <PhoneInputRow
                          id="signin-phone"
                          label="Phone number"
                          code={codeField.state.value}
                          onCodeChange={codeField.handleChange}
                          number={numberField.state.value}
                          onNumberChange={(value) => {
                            numberField.handleChange(value);
                            setNotFound(false);
                          }}
                          onBlur={numberField.handleBlur}
                        />
                      )}
                    </form.Field>
                  )}
                </form.Field>
              )}

              {method === "phone" && notFound && (
                <p className="text-[12px] text-destructive" role="alert">
                  No account uses this number.{" "}
                  <TextLink onClick={() => setView("account")}>Create an account</TextLink>
                </p>
              )}

              <div className="pt-1">
                <Button type="submit" variant="primary" className={PRIMARY_BUTTON}>
                  Continue
                </Button>
              </div>
            </form>
          </>
        )}

        {view === "signInChoose" && accounts && (
          <>
            <CardHeading
              title="Choose an account"
              subtitle={
                <>
                  <span className="whitespace-nowrap font-medium text-foreground tabular-nums">
                    {enteredPhone ?? "This number"}
                  </span>{" "}
                  is linked to {accounts.length} accounts. Choose the one you want to sign in to.
                </>
              }
            />
            <ul className="space-y-2" aria-label="Accounts linked to this number">
              {accounts.map((account) => (
                <li key={account.id}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => choose(account)}
                    className="h-auto min-h-0 w-full justify-start gap-3 bg-card px-3 py-2.5 shadow-none [&>span]:w-full"
                  >
                    {/* One row; Button's own content wrapper would stack these. */}
                    <span className="flex w-full items-center gap-3">
                      <AccountAvatar account={account} />
                      <AccountText account={account} />
                      <Icon
                        name="chevron-right"
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}

        {view === "signInPassword" && selected && (
          <>
            <CardHeading
              title="Enter your password"
              subtitle="Use the password for this account."
            />
            <SelectedAccount account={selected} onChange={changeAccount} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                signedIn();
              }}
              className="space-y-3.5"
              noValidate
            >
              <form.Field name="password">
                {(field) => (
                  <Field className={FIELD}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="signin-password" className={LABEL}>
                        Password
                      </FieldLabel>
                      <span className="text-[12px]">
                        <TextLink onClick={() => router.push("/forgot-password")}>
                          Forgot password?
                        </TextLink>
                      </span>
                    </div>
                    <PasswordInput
                      id="signin-password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      autoFocus
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={CONTROL}
                    />
                  </Field>
                )}
              </form.Field>
              <div className="pt-1">
                <Button type="submit" variant="primary" className={PRIMARY_BUTTON}>
                  Sign in
                </Button>
              </div>
            </form>
            <OrDivider label="or" />
            <Button
              type="button"
              variant="outline"
              leftIcon={
                <Icon name={method === "phone" ? "smartphone" : "mail"} className="h-4 w-4" />
              }
              onClick={() => {
                sendOtp();
                setView("signInOtp");
              }}
              className="h-10 min-h-10 w-full bg-card text-[13px] font-medium shadow-none"
            >
              Sign in with OTP instead
            </Button>
          </>
        )}

        {view === "signInOtp" && selected && (
          <>
            <CardHeading
              title="Enter the code"
              subtitle={
                <>
                  We sent a {OTP_LENGTH}-digit code to{" "}
                  <span className="whitespace-nowrap font-medium text-foreground tabular-nums">
                    {method === "phone"
                      ? (enteredPhone ?? "your mobile number")
                      : displayEmail(selected)}
                  </span>
                  .
                </>
              }
            />
            <SelectedAccount account={selected} onChange={changeAccount} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                signedIn();
              }}
              className="space-y-3.5"
              noValidate
            >
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
                        toast.message("Code resent", {
                          description: "Design preview. Nothing was sent.",
                        });
                      }}
                    />
                  </Field>
                )}
              </form.Field>
              <div className="pt-1">
                <Button type="submit" variant="primary" className={PRIMARY_BUTTON}>
                  Sign in
                </Button>
              </div>
            </form>
            <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
              <TextLink onClick={() => setView("signInPassword")}>Use password instead</TextLink>
            </p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
