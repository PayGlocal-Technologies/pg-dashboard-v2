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
// Every step is authenticated by the merchant's existing session cookie and
// gated on the previous one having just succeeded for that session: calling one
// out of order returns 403 before it reaches application logic. Two of them are
// terminal for the session — step 4 ends it on success, and three wrong codes at
// either OTP step end it too.

const CHANGE_EMAIL_BASE = `${BASE_URL_V3}/iam/users/contact/change`;

/** Step 1. Emails a code to the merchant's CURRENT address. Body: {}. */
export const initiateEmailChangeApi = `${CHANGE_EMAIL_BASE}/initiate`;

/** Step 2. Body: { otp }. */
export const verifyOldEmailApi = `${CHANGE_EMAIL_BASE}/verify-old`;

/** Step 3. Body: { newEmail }. Emails a second code to the new address. */
export const sendNewEmailOtpApi = `${CHANGE_EMAIL_BASE}/send-new-otp`;

/** Step 4. Body: { otp, newEmail } — newEmail is carried forward from step 3,
 *  not retyped. Commits the change irreversibly and ends the session. */
export const verifyNewEmailApi = `${CHANGE_EMAIL_BASE}/verify-new`;

/** Step 5. Body: {}. Only while step 2 is pending. */
export const resendOldEmailOtpApi = `${CHANGE_EMAIL_BASE}/resend-old`;

/** Step 6. Body: { newEmail }. Only while step 4 is pending. */
export const resendNewEmailOtpApi = `${CHANGE_EMAIL_BASE}/resend-new`;
