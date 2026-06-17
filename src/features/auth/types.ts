/**
 * Auth domain types — the response-type / status unions that drive the login
 * and forgot-password screen machines. Mirrors pg-dashboard's auth contract
 * (status at the top level, screen hints under `data`).
 */

export type UserCreationType = "NEW_FLOW" | "OLD_FLOW";

/** What screen the identifier step routes to next. */
export type LoginResponseType =
  | "PASSWORD_REQUIRED"
  | "EMAIL_OTP_SCREEN"
  | "USER_OTP_SCREEN"
  | "GUEST_OTP_SCREEN"
  | "PHONE_OTP_SCREEN"
  | "USERNAME_REQUIRED"
  | "COUNTRY_QUESTIONNAIRE"
  | "SSO_SCREEN";

/** Top-level status returned by the auth endpoints. */
export type AuthStatus =
  | "IDENTIFIER_RESOLVED"
  | "AUTHENTICATED"
  | "AUTHENTICATED_EMAIL_MFA_REQUIRED"
  | "AUTHENTICATED_FOR_CHANGE_PASSWORD"
  | "AUTHENTICATION_FOR_PHONE_NUMBER_CAPTURE"
  | "AUTHENTICATED_FOR_SELF_ONBOARDING"
  | "OTP_RESENT"
  | "OTP_SENT"
  | "OTP_VERIFIED"
  | "PASSWORD_CHANGE_COMPLETED"
  | "CHANGED";

/** Generic auth envelope: top-level status + optional screen-routing data. */
export interface AuthEnvelope<T = unknown> {
  status: AuthStatus;
  data?: T;
}

export interface IdentifierData {
  responseType: LoginResponseType;
  maskedEmail?: string;
  maskedPhoneNumber?: string;
  hasPassword: boolean;
  userCreationType: UserCreationType;
  isGuestUser?: boolean;
}

export interface AuthedData {
  userCreationType: UserCreationType;
  isGuestUser?: boolean;
  guestUser?: boolean;
  responseType?: LoginResponseType;
}

/** HubSpot campaign/influencer attribution data sent with the initial login call. */
export interface HbsptTrackingData {
  influencerId?: string | null;
  dateOfEngagementMilli: number | null;
  campaignName: string | null;
  campaignSource: string | null;
  campaignMedium: string | null;
  campaignId: string | null;
  referrer?: string | null;
}

// Request payloads (encrypted in transit via useEncryptPayload).
export interface IdentifierRequest {
  identifier: string;
  onboardingFlow?: boolean;
  hbsptTrackingData?: HbsptTrackingData | null;
  src?: string | null;
}
export interface VerifyPasswordRequest {
  identifier: string;
  password: string;
}
export interface VerifyOtpRequest {
  identifier: string;
  emailOtp?: string;
  phoneOtp?: string;
}
export interface ChangePasswordRequest {
  identifier: string;
  currentPassword: string;
  newPassword: string;
  newConfirmedPassword: string;
}
export interface ResetPasswordRequest {
  identifier: string;
  newPassword: string;
  newConfirmedPassword: string;
}
