"use client";

import { useState } from "react";
import { z } from "zod";
import { useAppForm } from "@/components/form/AppForm";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { useEncryptPayload } from "@/features/auth/hooks";
import { useLogin } from "@/stores/useLogin";
import { usePost } from "@/lib/api/hooks";
import { phoneNumberVerifyApi, namePhoneNumberCaptureApi } from "@/features/auth/login/services";
import { getRedirectionPath } from "@/features/auth/helpers";
import type { LoginScreenProps } from "@/features/auth/login/types";
import type { AuthEnvelope } from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Please enter your phone number")
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
});

/** Phone number capture screen — shown after authentication when a phone is required. */
export function PhoneNumberForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const { mutate, isPending } = usePost<AuthEnvelope, EncryptedPayload>(phoneNumberVerifyApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const identifier = useLogin((s) => s.identifier);
  const userCreationType = useLogin((s) => s.userCreationType);
  const setMaskedPhoneNumber = useLogin((s) => s.setMaskedPhoneNumber);
  const setSmsOtpInitiateTimestamp = useLogin((s) => s.setSmsOtpInitiateTimestamp);
  const setIsPhoneNumberOtpLogin = useLogin((s) => s.setIsPhoneNumberOtpLogin);

  const form = useAppForm({
    defaultValues: { phoneNumber: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const payload = { identifier, phoneNumber: value.phoneNumber };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          if (
            (res.status as string) === "OTP_SENT" ||
            (res.status as string) === "PHONE_OTP_SENT"
          ) {
            setMaskedPhoneNumber(value.phoneNumber);
            setIsPhoneNumberOtpLogin(true);
            setSmsOtpInitiateTimestamp(Date.now());
            setScreen("otp");
          } else if (res.status === "AUTHENTICATED") {
            window.location.href = getRedirectionPath(userCreationType);
          }
        },
        onError: (err) => setApiError(err.message),
      });
    },
  });

  return (
    <form.AppForm>
      <form.Form className="space-y-5">
        <AuthHeading title="Add your phone number">
          Enter your mobile number to secure your account with OTP verification.
        </AuthHeading>
        <AuthError message={apiError} />

        <form.AppField
          name="phoneNumber"
          validators={{
            onBlur: ({ value }) => {
              const r = phoneSchema.shape.phoneNumber.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <field.TextField
              id="phoneNumber"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              autoFocus
              placeholder="+91 9876543210"
            />
          )}
        </form.AppField>

        <form.SubmitButton size="lg" isLoading={isPending} className="w-full">
          Send OTP
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}

/** Name + Phone capture variant — shown during onboarding flows. */
export function NamePhoneNumberForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const { mutate, isPending } = usePost<AuthEnvelope, EncryptedPayload>(namePhoneNumberCaptureApi);
  const [apiError, setApiError] = useState<string | null>(null);

  const identifier = useLogin((s) => s.identifier);
  const userCreationType = useLogin((s) => s.userCreationType);
  const setMaskedPhoneNumber = useLogin((s) => s.setMaskedPhoneNumber);
  const setSmsOtpInitiateTimestamp = useLogin((s) => s.setSmsOtpInitiateTimestamp);
  const setIsPhoneNumberOtpLogin = useLogin((s) => s.setIsPhoneNumberOtpLogin);

  const namePhoneSchema = z.object({
    name: z.string().trim().min(1, "Please enter your name"),
    phoneNumber: z
      .string()
      .trim()
      .min(1, "Please enter your phone number")
      .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  });

  const form = useAppForm({
    defaultValues: { name: "", phoneNumber: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const payload = { identifier, name: value.name, phoneNumber: value.phoneNumber };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          if (
            (res.status as string) === "OTP_SENT" ||
            (res.status as string) === "PHONE_OTP_SENT"
          ) {
            setMaskedPhoneNumber(value.phoneNumber);
            setIsPhoneNumberOtpLogin(true);
            setSmsOtpInitiateTimestamp(Date.now());
            setScreen("otp");
          } else if (res.status === "AUTHENTICATED") {
            window.location.href = getRedirectionPath(userCreationType);
          }
        },
        onError: (err) => setApiError(err.message),
      });
    },
  });

  return (
    <form.AppForm>
      <form.Form className="space-y-5">
        <AuthHeading title="Tell us about yourself">
          Please provide your name and phone number to continue.
        </AuthHeading>
        <AuthError message={apiError} />

        <form.AppField
          name="name"
          validators={{
            onBlur: ({ value }) => {
              const r = namePhoneSchema.shape.name.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <field.TextField
              id="name"
              label="Full name"
              autoComplete="name"
              autoFocus
              placeholder="Your full name"
            />
          )}
        </form.AppField>

        <form.AppField
          name="phoneNumber"
          validators={{
            onBlur: ({ value }) => {
              const r = namePhoneSchema.shape.phoneNumber.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <field.TextField
              id="pn-nameform"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              placeholder="+91 9876543210"
            />
          )}
        </form.AppField>

        <form.SubmitButton size="lg" isLoading={isPending} className="w-full">
          Continue
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
