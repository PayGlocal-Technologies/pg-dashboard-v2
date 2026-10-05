import type { MfaMethod } from "@/features/mfa/types";

/** pg-dashboard's OTP length for both methods (its mfaMap: 4 digits each). */
export const MFA_OTP_LENGTH = 4;

/** Seconds before Resend appears: pg-dashboard's OTP_TIME_OUT. */
export const MFA_RESEND_AFTER_SECONDS = 500;

export const MFA_METHODS: { value: MfaMethod; label: string; sentTo: string }[] = [
  { value: "OTP_AUTHN", label: "SMS", sentTo: "your phone" },
  { value: "EMAIL_AUTHN", label: "Email", sentTo: "your email" },
];

/** The body key the code travels under, per method (pg-dashboard's mfaMap). */
export const MFA_OTP_FIELD: Record<MfaMethod, "phoneOtp" | "emailOtp"> = {
  OTP_AUTHN: "phoneOtp",
  EMAIL_AUTHN: "emailOtp",
};
