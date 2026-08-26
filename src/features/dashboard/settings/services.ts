import { BASE_URL_V3 } from "@/api";

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

/** Contact phone + email. Read-only in pg-dashboard (no update endpoint). */
export const contactDetailsApi = (onbId: string): string =>
  `${BASE_URL_V3}/merchants/profile/${onbId}/contact`;
