import { BASE_URL_V1, BASE_URL_V2, BASE_URL_V3 } from "@/api";

// Endpoint URL builders only, copied verbatim from pg-dashboard's
// src/features/my-account/services.ts. Every one is scoped by the merchant's
// onboarding id (profile.onboardingId), the same value pg-dashboard passes.

/** Business trade name + purpose codes. GET reads, PUT updates the codes. */
export const businessDetailsApi = (onbId: string): string =>
  `${BASE_URL_V3}/merchants/profile/${onbId}/business`;

/** The purpose codes this merchant may pick from. GET returns
 *  `{ data: { suggestedPurposeCodes, possiblePurposeCodes } }`, where
 *  `possiblePurposeCodes` is a code -> description map. Same endpoint
 *  pg-dashboard's PurposeCodeBanner and tid-management AddProduct read (see
 *  its OnboardingBanners/services.ts purposeCodeApi); the codes are saved
 *  through businessDetailsApi above, not here. */
export const purposeCodeOptionsApi = (onbId: string): string =>
  onbId ? `${BASE_URL_V3}/merchants/banner/${onbId}/purpose-codes` : "";

/** Settlement account, masked. Account number comes back masked. */
export const settlementDetailsApi = (onbId: string): string =>
  `${BASE_URL_V3}/merchants/profile/${onbId}/settlement`;

/** Settlement account, unmasked. Same shape, full account number — pg-dashboard
 *  swaps to this endpoint when the eye toggle reveals the number. */
export const secureSettlementDetailsApi = (onbId: string): string =>
  `${BASE_URL_V3}/merchants/profile/${onbId}/settlement-details`;

/** Update the settlement bank account (account number + IFSC). Scoped by the
 *  merchant id (profile.mid), NOT the onboarding id the read endpoints use. */
export const updateAccountDetailsApi = (merchantId: string): string =>
  `${BASE_URL_V2}/merchants/${merchantId}/account-details`;

/** Contact phone + email. Read-only in pg-dashboard (no update endpoint). */
export const contactDetailsApi = (onbId: string): string =>
  `${BASE_URL_V3}/merchants/profile/${onbId}/contact`;

/** Merchant profile — carries the merchantBusinessSummary block (GST, address,
 *  website, line of business, support contact) shown on Business details.
 *  Keyed by the merchant id (profile.mid), not the onboarding id. */
export const merchantProfileApi = (merchantId: string): string =>
  merchantId ? `${BASE_URL_V1}/merchants/${merchantId}/profile` : "";

/** Upload the merchant's checkout logo — PUT multipart/form-data with a single
 *  `merchantLogo` file (JPG/PNG). Returns the stored public URL. Keyed by the
 *  merchant id (profile.mid), like merchantProfileApi above. */
export const merchantLogoUploadApi = (merchantId: string): string =>
  merchantId ? `${BASE_URL_V1}/merchants/${merchantId}/profile/logo` : "";

// ── Change email (six server-gated steps) ────────────────────────────────────
//
// Every step rides the merchant's existing session cookie, and the ones that
// need step 2 are gated on a stored fact ("this account verified its old
// email") rather than on narrowing what the session may do. So the flow never
// affects the rest of the dashboard: the merchant can navigate away between
// steps, other authenticated screens keep working, and a successful step 4
// leaves them logged in. The one thing that still ends the session is three
// wrong codes at either OTP step.
//
// Bodies below are the PLAINTEXT fields. All six go up inside the app-wide
// isEnc envelope from useEncryptPayload, same as the login screens — the fields
// are JWE-encrypted into `payload`, never sent as plain JSON.
//
// Statuses: 403 means not logged in at all. 401 means either a wrong code or a
// step called out of order — which of the two is decided by the endpoint, not
// the code.

const CHANGE_EMAIL_BASE = `${BASE_URL_V3}/iam/users/contact/change`;

/** Step 1. Emails a code to the merchant's CURRENT address. Fields: {}.
 *  Requires only a logged-in merchant. */
export const initiateEmailChangeApi = `${CHANGE_EMAIL_BASE}/initiate`;

/** Step 2. Fields: { otp }. Requires only a logged-in merchant — this endpoint
 *  is itself the check on step 1's code. Success marks the account's old email
 *  verified, which is what clears steps 3 and 6; the mark has no timer and
 *  lasts until the flow completes or the merchant logs out. */
export const verifyOldEmailApi = `${CHANGE_EMAIL_BASE}/verify-old`;

/** Step 3. Fields: { newEmail }. Emails a second code to the new address.
 *  Requires the old email verified. */
export const sendNewEmailOtpApi = `${CHANGE_EMAIL_BASE}/send-new-otp`;

/** Step 4. Fields: { otp, newEmail } — newEmail is carried forward from step 3,
 *  not retyped. Requires step 3 to have sent a code for that same address.
 *  Commits the change irreversibly and mails both addresses; the session is
 *  left intact. Success comes back with status EMAIL_CHANGE_COMPLETED. */
export const verifyNewEmailApi = `${CHANGE_EMAIL_BASE}/verify-new`;

/** Step 5. Fields: {}. Requires only a logged-in merchant — no step condition,
 *  so it is callable whether or not step 2 is outstanding. */
export const resendOldEmailOtpApi = `${CHANGE_EMAIL_BASE}/resend-old`;

/** Step 6. Fields: { newEmail }. Requires the old email verified, the same
 *  condition as step 3. */
export const resendNewEmailOtpApi = `${CHANGE_EMAIL_BASE}/resend-new`;
