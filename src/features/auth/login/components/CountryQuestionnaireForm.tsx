"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Button, Field, FieldError, FieldLabel } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { useEncryptPayload } from "@/features/auth/hooks";
import { useLogin } from "@/stores/useLogin";
import { usePost } from "@/lib/api/hooks";
import { unifiedLoginApi } from "@/features/auth/login/services";
import { useGlobalTenant } from "@/features/auth/hooks";
import { getRedirectionPath } from "@/features/auth/helpers";
import type { LoginScreenProps } from "@/features/auth/login/types";
import type { AuthEnvelope, IdentifierData } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

const SUPPORTED_COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "SG", label: "Singapore" },
  { code: "IN", label: "India" },
] as const;

const countrySchema = z.object({
  countryCode: z.string().min(1, "Please select your country"),
});

/** Country questionnaire screen — shown for cross-border / global-tenant flows. */
export function CountryQuestionnaireForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const isGlobal = useGlobalTenant();
  const { mutate, isPending } = usePost<AuthEnvelope<IdentifierData>, EncryptedPayload>(
    unifiedLoginApi(isGlobal)
  );
  const [apiError, setApiError] = useState<string | null>(null);

  const identifier = useLogin((s) => s.identifier);
  const userCreationType = useLogin((s) => s.userCreationType);
  const setLoginFlowCountryCode = useLogin((s) => s.setLoginFlowCountryCode);
  const setMaskedEmail = useLogin((s) => s.setMaskedEmail);
  const setMaskedPhoneNumber = useLogin((s) => s.setMaskedPhoneNumber);
  const setHasPassword = useLogin((s) => s.setHasPassword);
  const setUserCreationType = useLogin((s) => s.setUserCreationType);
  const setIsPhoneNumberOtpLogin = useLogin((s) => s.setIsPhoneNumberOtpLogin);
  const setEmailOtpInitiateTimestamp = useLogin((s) => s.setEmailOtpInitiateTimestamp);
  const setSmsOtpInitiateTimestamp = useLogin((s) => s.setSmsOtpInitiateTimestamp);

  const form = useForm({
    defaultValues: { countryCode: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      setLoginFlowCountryCode(value.countryCode);
      const payload = { identifier, countryCode: value.countryCode };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          const data = res.data;
          if (!data) {
            window.location.href = getRedirectionPath(userCreationType);
            return;
          }
          setHasPassword(data.hasPassword);
          setUserCreationType(data.userCreationType);

          if (data.responseType === "PASSWORD_REQUIRED") {
            if (data.maskedEmail) setMaskedEmail(data.maskedEmail);
            setScreen("password");
          } else if (data.responseType === "PHONE_OTP_SCREEN") {
            if (data.maskedPhoneNumber) setMaskedPhoneNumber(data.maskedPhoneNumber);
            setIsPhoneNumberOtpLogin(true);
            setSmsOtpInitiateTimestamp(Date.now());
            setScreen("otp");
          } else {
            if (data.maskedEmail) setMaskedEmail(data.maskedEmail);
            setIsPhoneNumberOtpLogin(false);
            setEmailOtpInitiateTimestamp(Date.now());
            setScreen("otp");
          }
        },
        onError: (err) => setApiError(err.message),
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-5"
      noValidate
    >
      <AuthHeading title="Where are you based?">
        Select your country to continue with the right sign-in flow.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="countryCode"
        validators={{
          onBlur: ({ value }) => {
            const r = countrySchema.shape.countryCode.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="countryCode">Country</FieldLabel>
            <select
              id="countryCode"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            >
              <option value="">Select your country</option>
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <Button type="submit" size="lg" isLoading={isPending} className="w-full">
        Continue
      </Button>
      <Button
        variant="ghost"
        type="button"
        onClick={() => setScreen("identifier")}
        className="w-full text-xs text-muted-foreground hover:text-foreground"
      >
        Use a different account
      </Button>
    </form>
  );
}
