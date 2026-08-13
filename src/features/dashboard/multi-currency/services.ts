import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

// Endpoint URL builders only — no fetch/axios logic here. Every path below is
// copied verbatim from pg-dashboard's src/features/multi-currency-accounts/
// services.ts, which is the production source of truth for these contracts.
//
// Builders that take an id return "" when it is missing, so a disabled query
// can never construct a half-formed URL.

/** Authenticated merchant virtual accounts (FFMS). Response splits into
 *  `general` and `amazon` buckets, each keyed by currency. */
export const mcaVirtualAccountsApi = (merchantId: string) =>
  merchantId ? `${BASE_URL_V3}/merchants/${merchantId}/ffms/virtualAccounts` : "";

/** Real-time exchange rates for one currency and amount. */
export const mcaExchangeRatesApi = (merchantId: string, currency: string, amount: number) =>
  merchantId && currency ? `${BASE_URL_V3}/merchants/${merchantId}/exchange-rates/${currency}/${amount}` : "";

/**
 * Leg 1 of the proof-of-account-ownership download: asks the backend to start
 * generating the PDF and returns the descriptor to poll with. `accountId` is
 * the SHA-256 of the account number, not the account's own id — see
 * accountDocumentId in @/features/dashboard/multi-currency/utils.
 */
export const mcaAccountConfirmationApi = (merchantId: string, accountId: string) =>
  merchantId && accountId ? `${BASE_URL_V1}/merchants/${merchantId}/account-confirmation/${accountId}` : "";

/** Leg 1 of the bank settlement statement download. Same two-leg shape as
 *  mcaAccountConfirmationApi above, and the same SHA-256 accountId. */
export const mcaBankStatementApi = (merchantId: string, accountId: string) =>
  merchantId && accountId ? `${BASE_URL_V1}/merchants/${merchantId}/bank-statement/${accountId}` : "";

/** Leg 2, shared by both downloads: POST the descriptor from leg 1 until the
 *  response carries a `url`. Generation is asynchronous, so this is polled. */
export const mcaGeneratedFileApi = (merchantId: string) =>
  merchantId ? `${BASE_URL_V1}/merchants/${merchantId}/account-generated-file` : "";

/** Public virtual accounts, addressed by share token instead of a MID. Backs
 *  the unauthenticated page a shared link opens. */
export const mcaSharedVirtualAccountsApi = (token: string) =>
  token ? `${BASE_URL_V3}/merchants/${token}/virtualAccounts` : "";

/** Generates a shareable link for one currency's account details. */
export const mcaShareLinkApi = (merchantId: string) =>
  merchantId ? `${BASE_URL_V3}/merchants/${merchantId}/share-link` : "";

/** Emails one account's details to a client. */
export const mcaSendAccountEmailApi = (merchantId: string) =>
  merchantId ? `${BASE_URL_V3}/merchants/${merchantId}/send-account-email` : "";

// ── Amazon account-detail statement ─────────────────────────────────────────
// Two legs, same path, different verb — verbatim from pg-dashboard's
// src/features/platform-withdrawals/services.ts.

/** Leg 1: asks for the statement and returns the `requestTimestamp` to poll. */
export const amzAccountStatementApi = (merchantId: string) =>
  merchantId ? `${BASE_URL_V1}/reports/amz/${merchantId}/account-detail` : "";

/** Leg 2: polled until the response carries a `presignedUrl`. */
export const amzAccountStatementPollApi = (merchantId: string, requestTimestamp: string) =>
  merchantId && requestTimestamp
    ? `${BASE_URL_V1}/reports/amz/${merchantId}/account-detail?requestTimestamp=${encodeURIComponent(requestTimestamp)}`
    : "";
