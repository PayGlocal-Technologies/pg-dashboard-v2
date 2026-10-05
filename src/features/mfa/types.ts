/** How the code reaches the user: SMS to their phone, or email. */
export type MfaMethod = "OTP_AUTHN" | "EMAIL_AUTHN";

export interface MfaTriggerBody {
  otpEnum: MfaMethod;
  resource: string;
}

export type MfaVerifyBody = MfaTriggerBody & { phoneOtp?: string; emailOtp?: string };

export interface MfaResponse {
  message?: string;
  data?: unknown;
}
