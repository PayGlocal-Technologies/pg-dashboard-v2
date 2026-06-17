"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Button, Field, FieldError, FieldLabel, Input } from "@/components/ui";
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

  const form = useForm({
    defaultValues: { phoneNumber: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const payload = { identifier, phoneNumber: value.phoneNumber };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          if ((res.status as string) === "OTP_SENT" || (res.status as string) === "PHONE_OTP_SENT") {
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-5"
      noValidate
    >
      <AuthHeading title="Add your phone number">
        Enter your mobile number to secure your account with OTP verification.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="phoneNumber"
        validators={{
          onBlur: ({ value }) => {
            const r = phoneSchema.shape.phoneNumber.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="phoneNumber">Phone number</FieldLabel>
            <Input
              id="phoneNumber"
              type="tel"
              autoComplete="tel"
              autoFocus
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="+91 9876543210"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <Button type="submit" size="lg" isLoading={isPending} className="w-full">
        Send OTP
      </Button>
    </form>
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

  const form = useForm({
    defaultValues: { name: "", phoneNumber: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const payload = { identifier, name: value.name, phoneNumber: value.phoneNumber };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          if ((res.status as string) === "OTP_SENT" || (res.status as string) === "PHONE_OTP_SENT") {
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-5"
      noValidate
    >
      <AuthHeading title="Tell us about yourself">
        Please provide your name and phone number to continue.
      </AuthHeading>
      <AuthError message={apiError} />

      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => {
            const r = namePhoneSchema.shape.name.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              autoFocus
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="Your full name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <form.Field
        name="phoneNumber"
        validators={{
          onBlur: ({ value }) => {
            const r = namePhoneSchema.shape.phoneNumber.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="pn-nameform">Phone number</FieldLabel>
            <Input
              id="pn-nameform"
              type="tel"
              autoComplete="tel"
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="+91 9876543210"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <Button type="submit" size="lg" isLoading={isPending} className="w-full">
        Continue
      </Button>
    </form>
  );
}
