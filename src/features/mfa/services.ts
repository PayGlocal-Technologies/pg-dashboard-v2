import { BASE_URL_V1 } from "@/api";

// Ported from pg-dashboard's MfaForm and its callers (manage-mandates,
// track-transactions). Endpoint URL builders only.

/**
 * Sends a one-time code for an action. POST `{ otpEnum, resource }`, where
 * `resource` is the full URL of the call the code will authorise.
 */
export const mfaTriggerApi = (mid: string): string => `${BASE_URL_V1}/iam/users/${mid}/mfa`;

/**
 * Checks a code. POST `{ resource, otpEnum, phoneOtp | emailOtp }`; a truthy
 * `data` in the response means verified. pg-dashboard's URL carries a trailing
 * newline and indent from a template literal, which the URL parser strips, so
 * this clean form is the same request.
 */
export const mfaVerifyApi = (mid: string): string => `${BASE_URL_V1}/iam/users/${mid}/mfa/verify`;
