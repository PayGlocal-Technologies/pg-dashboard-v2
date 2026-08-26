import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

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

// ── Zoho integration ─────────────────────────────────────────────────────────
// Copied verbatim from pg-dashboard's zoho-integration/service.ts. `identifier`
// is the merchant id (selectedMid || paCbMids[0]). All under BASE_URL_V1.

const zohoBase = (identifier: string): string =>
  `${BASE_URL_V1}/integrations/zoho/${identifier}`;

/** Connection status: connected / status / lastSyncedTime / isFirstSync. */
export const zohoStatusApi = (identifier: string): string => `${zohoBase(identifier)}/status`;

/** Returns the Zoho OAuth connect URL to redirect the merchant to. */
export const zohoConnectApi = (identifier: string, redirectUri: string): string =>
  `${zohoBase(identifier)}/connect?redirectUri=${redirectUri}`;

/** OAuth callback exchange — fired when Zoho redirects back with a code. */
export const zohoCallbackApi = (
  identifier: string,
  code: string,
  location: string,
  accountsServer: string,
  redirectUri: string
): string =>
  `${zohoBase(identifier)}/callback` +
  `?code=${encodeURIComponent(code)}` +
  `&location=${encodeURIComponent(location)}` +
  `&accounts-server=${encodeURIComponent(accountsServer)}` +
  `&redirectUri=${redirectUri}`;

/** Disconnect the merchant's Zoho org (DELETE, empty body). */
export const zohoDisconnectApi = (identifier: string): string =>
  `${zohoBase(identifier)}/disconnect`;

/** Manual pull-sync (POST { isClientSync, isInvoiceSync }). */
export const zohoPullSyncApi = (identifier: string): string => `${zohoBase(identifier)}/pull-sync`;
