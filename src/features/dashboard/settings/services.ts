import { BASE_URL_V1, BASE_URL_V2, BASE_URL_V3 } from "@/api";

// Endpoint URL builders only, copied verbatim from pg-dashboard's
// src/features/my-account/services.ts. Every one is scoped by the merchant's
// onboarding id (profile.onboardingId), the same value pg-dashboard passes.

/** Business trade name + purpose codes. GET reads, PUT updates the codes. */
export const businessDetailsApi = (onbId: string): string =>
  `${BASE_URL_V3}/merchants/profile/${onbId}/business`;

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
