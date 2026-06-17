"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { useSearchParams } from "next/navigation";
import { getRedirectResult, type UserCredential } from "firebase/auth";
import { Button, Field, FieldError, FieldLabel, Input, Separator } from "@/components/ui";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthError } from "@/features/auth/components/AuthError";
import { useEncryptPayload } from "@/features/auth/hooks";
import { useLogin } from "@/stores/useLogin";
import { identifierSchema } from "@/features/auth/login/schemas";
import { usePost } from "@/lib/api/hooks";
import {
  unifiedLoginApi,
  singleSignOnApi,
  interactionTrackingApi,
  campaignTrackingApi,
} from "@/features/auth/login/services";
import { useGlobalTenant } from "@/features/auth/hooks";
import { handleSingleSignOn } from "@/features/auth/helpers";
import { firebaseConfigProvider } from "@/features/auth/helpers";
import { PROVIDERS } from "@/features/auth/login/single-sign-on/authProvider";
import { getTrackingData } from "@/features/auth/login/helper";
import { getCookie } from "@/lib/utils";
import type { LoginScreenProps } from "@/features/auth/login/types";
import type {
  AuthEnvelope,
  IdentifierData,
  AuthedData,
  IdentifierRequest,
  HbsptTrackingData,
} from "@/features/auth/types";
import type { EncryptedPayload } from "@/features/auth/hooks";

const FIREBASE_ENABLED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

/** Step 1: collect the identifier (email / phone / username) and resolve the next screen. */
export function IdentifierForm({ setScreen }: LoginScreenProps) {
  const encryptPayload = useEncryptPayload();
  const isGlobal = useGlobalTenant();
  const searchParams = useSearchParams();
  const hasTrackedRef = useRef(false);

  const { mutate, isPending } = usePost<AuthEnvelope<IdentifierData>, EncryptedPayload>(
    unifiedLoginApi(isGlobal)
  );
  const { mutate: ssoMutate } = usePost<
    AuthEnvelope<AuthedData>,
    EncryptedPayload & { dynamicUrl?: string }
  >(singleSignOnApi);
  const { mutate: trackInteraction } = usePost<
    void,
    { hbsptTrackingData: HbsptTrackingData | null; src: string | null }
  >(interactionTrackingApi);

  const [apiError, setApiError] = useState<string | null>(null);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [influencerId] = useState<string | null>(() =>
    typeof window !== "undefined" ? (getCookie("influencerId") ?? null) : null
  );
  const [campaignDetails] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const cookie = getCookie("pgCampaignDetails");
    if (cookie) return atob(cookie);
    const qs = new URLSearchParams(window.location.search).toString();
    return qs && !qs.includes("timeout") ? qs : null;
  });

  const hasChangedPassword = useLogin((s) => s.hasChangedPassword);
  const setHasChangedPassword = useLogin((s) => s.setHasChangedPassword);
  const setIdentifier = useLogin((s) => s.setIdentifier);
  const setMaskedEmail = useLogin((s) => s.setMaskedEmail);
  const setMaskedPhoneNumber = useLogin((s) => s.setMaskedPhoneNumber);
  const setHasPassword = useLogin((s) => s.setHasPassword);
  const setUserCreationType = useLogin((s) => s.setUserCreationType);
  const setIsPhoneNumberOtpLogin = useLogin((s) => s.setIsPhoneNumberOtpLogin);
  const setEmailOtpInitiateTimestamp = useLogin((s) => s.setEmailOtpInitiateTimestamp);
  const setSmsOtpInitiateTimestamp = useLogin((s) => s.setSmsOtpInitiateTimestamp);

  // Fire campaign POST to intake service (not encrypted, uses raw fetch).
  const handleCampaignTracking = useCallback(
    async (encodedCampaignTrkData: string): Promise<void> => {
      await fetch(campaignTrackingApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignDetails: encodedCampaignTrkData, formType: "campaign" }),
        credentials: "include",
      });
    },
    []
  );

  // Fire interaction-tracking POST when UTM params are present.
  const handleInteractionTracking = useCallback((): void => {
    const qs =
      searchParams?.toString() ?? (typeof window !== "undefined" ? window.location.search : "");
    const { hbsptTrackingData, src } = getTrackingData(qs, influencerId ?? "");
    if (!hbsptTrackingData.campaignName && !hbsptTrackingData.campaignSource) return;
    trackInteraction({ hbsptTrackingData, src });
  }, [searchParams, influencerId, trackInteraction]);

  // Auto-dismiss the password-changed success banner after 5 seconds.
  useEffect(() => {
    if (!hasChangedPassword) return;
    const t = setTimeout(() => setHasChangedPassword(false), 5000);
    return () => clearTimeout(t);
  }, [hasChangedPassword, setHasChangedPassword]);

  // On mount: fire campaign/interaction tracking if UTM params are present and no cookie stash.
  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    if (!getCookie("pgCampaignDetails") && searchParams && searchParams.toString().length > 0) {
      const qs = searchParams.toString();
      if (!qs.includes("timeout")) void handleCampaignTracking(btoa(qs));
      handleInteractionTracking();
    }
  }, [searchParams, handleCampaignTracking, handleInteractionTracking]);

  const handleSsoSuccessRef = useRef<((response: UserCredential) => Promise<void>) | null>(null);

  const handleSsoSuccess = useCallback(
    async (response: UserCredential) => {
      const token = await response.user.getIdToken();
      const providerId = (response.providerId ?? "") as keyof typeof PROVIDERS;
      const provider = PROVIDERS[providerId];
      const userEmail = response.user.providerData[0]?.email;
      const { hbsptTrackingData, src } = getTrackingData(
        campaignDetails ?? (typeof window !== "undefined" ? window.location.search : ""),
        influencerId ?? ""
      );
      const payload = { emailId: userEmail, hbsptTrackingData, src };
      const encryptedPayload = await encryptPayload(payload);
      ssoMutate(
        {
          ...encryptedPayload,
          dynamicUrl: `${singleSignOnApi}?ssoToken=${token}&provider=${provider}`,
        },
        {
          onSuccess: (res) => {
            const data = res.data;
            if ((res.status as string) === "AUTHENTICATION_FOR_PHONE_NUMBER_CAPTURE") {
              setScreen("phoneNumber");
            } else if (data?.responseType === "USERNAME_REQUIRED") {
              setScreen("username");
            } else if (data?.responseType === "COUNTRY_QUESTIONNAIRE") {
              setScreen("countryQuestionnaire");
            } else {
              window.location.href = "/transactions";
            }
          },
          onError: (err) => setApiError(err.message),
        }
      );
    },
    [encryptPayload, ssoMutate, campaignDetails, influencerId, setScreen]
  );

  useEffect(() => {
    handleSsoSuccessRef.current = handleSsoSuccess;
  }, [handleSsoSuccess]);

  // Handle Firebase redirect result (mobile SSO completion).
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    const hasMobileLogin = typeof window !== "undefined" && localStorage.getItem("mLogin");
    if (!hasMobileLogin) return;
    void getRedirectResult(firebaseConfigProvider())
      .then((result) => {
        if (result && handleSsoSuccessRef.current) void handleSsoSuccessRef.current(result);
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        localStorage.removeItem("mLogin");
      });
  }, []);

  const form = useForm({
    defaultValues: { identifier: "" },
    onSubmit: async ({ value }) => {
      setApiError(null);
      const validation = identifierSchema.safeParse(value);
      if (!validation.success) return;

      const { hbsptTrackingData, src } = getTrackingData(
        campaignDetails ?? (typeof window !== "undefined" ? window.location.search : ""),
        influencerId ?? ""
      );
      const payload: IdentifierRequest = {
        identifier: value.identifier,
        onboardingFlow: false,
        hbsptTrackingData: hbsptTrackingData || null,
        src,
      };
      const encryptedPayload = await encryptPayload(payload);
      mutate(encryptedPayload, {
        onSuccess: (res) => {
          const data = res.data;
          if (!data) return;
          setIdentifier(value.identifier);
          setUserCreationType(data.userCreationType);
          setHasPassword(data.hasPassword);

          if (data.responseType === "PASSWORD_REQUIRED") {
            if (data.maskedEmail) setMaskedEmail(data.maskedEmail);
            setScreen("password");
          } else if (data.responseType === "PHONE_OTP_SCREEN") {
            if (data.maskedPhoneNumber) setMaskedPhoneNumber(data.maskedPhoneNumber);
            setIsPhoneNumberOtpLogin(true);
            setSmsOtpInitiateTimestamp(Date.now());
            setScreen("otp");
          } else if (data.responseType === "USERNAME_REQUIRED") {
            setScreen("username");
          } else if (data.responseType === "COUNTRY_QUESTIONNAIRE") {
            setScreen("countryQuestionnaire");
          } else {
            // EMAIL_OTP_SCREEN, USER_OTP_SCREEN, GUEST_OTP_SCREEN all route to email OTP
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
    <div className="space-y-5">
      <AuthHeading title="Sign in to PayGlocal">
        Enter your email, phone number, or username to continue.
      </AuthHeading>
      {hasChangedPassword && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          Your password has been updated. Please sign in with your new password.
        </div>
      )}
      <AuthError message={apiError} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="space-y-5"
        noValidate
      >
        <form.Field
          name="identifier"
          validators={{
            onBlur: ({ value }) => {
              const r = identifierSchema.shape.identifier.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="identifier">Email, phone, or username</FieldLabel>
              <Input
                id="identifier"
                autoComplete="username"
                autoFocus
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="you@company.com"
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

      {FIREBASE_ENABLED && (
        <>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>
          <div className="space-y-2">
            {(["google", "meta"] as const).map((provider) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                size="lg"
                isLoading={ssoLoading}
                className="w-full capitalize"
                onClick={() =>
                  void handleSingleSignOn(provider, handleSsoSuccess, setSsoLoading, (err) =>
                    setApiError(err instanceof Error ? err.message : "SSO failed")
                  )
                }
              >
                Continue with {provider === "google" ? "Google" : "Meta"}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
