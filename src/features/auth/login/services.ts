import { BASE_URL_V3 } from "@/api";

export const unifiedLoginApi = (isGlobal: boolean): string =>
  isGlobal
    ? `${BASE_URL_V3}/auth/unified/global/login`
    : `${BASE_URL_V3}/auth/unified/login`;

export const singleSignOnApi = `${BASE_URL_V3}/auth/sso/verify`;

export const verifyOtpApi = (isGlobal: boolean): string =>
  isGlobal
    ? `${BASE_URL_V3}/auth/unified/global/login/verify`
    : `${BASE_URL_V3}/auth/unified/login/verify`;

export const resendOtpApi = `${BASE_URL_V3}/auth/unified/login/otp/resend`;

export const usernameOtpApi = `${BASE_URL_V3}/auth/unified/login/otp/send/username`;

export const verifyChangePasswordOtpApi = `${BASE_URL_V3}/auth/unified/login/verify/change-password`;

export const verifyPasswordApi = `${BASE_URL_V3}/auth/unified/login/verify/password`;

export const changePasswordApi = `${BASE_URL_V3}/iam/users/change-password`;

export const phoneNumberCaptureApi = `${BASE_URL_V3}/guest/onboard/phoneNumber`;

export const existingUserPhoneNumberCaptureApi = `${BASE_URL_V3}/iam/users/phone-number`;

export const namePhoneNumberCaptureApi = `${BASE_URL_V3}/auth/unified/login/phone`;

export const phoneNumberVerifyApi = `${BASE_URL_V3}/auth/unified/login/verify/phone`;

export const resendPhoneNumberOtpApi = `${BASE_URL_V3}/auth/unified/login/otp/phone/resend`;

export const interactionTrackingApi = `${BASE_URL_V3}/auth/unified/interaction-tracking`;

export const twoFaVerifyApi = `${BASE_URL_V3}/auth/unified/login/verify`;

const isDev = process.env.NODE_ENV !== "production";
export const campaignTrackingApi = `https://intake.${isDev ? "dev." : ""}payglocal.in/campaign-trk/campaign-trk`;
