import { BASE_URL_V1 } from "@/api";

/**
 * Every Zoho endpoint, in one place.
 *
 * Paths are verbatim from pg-dashboard's src/features/zoho-integration/
 * service.ts — note they are v1 and live under /integrations/zoho, not
 * alongside the v3 MCA endpoints. `identifier` is always the merchant id.
 *
 * URL builders only, per the API-layer convention: components call
 * useGet/usePost/useDelete from @/lib/api/hooks with these strings.
 */
const ZOHO_BASE = (identifier: string) => `${BASE_URL_V1}/integrations/zoho/${identifier}`;

/** `{ status: "CONNECTED" | … }` — drives every other affordance in the flow. */
export const zohoStatusApi = (identifier: string) =>
  identifier ? `${ZOHO_BASE(identifier)}/status` : "";

/**
 * Returns the Zoho-hosted consent URL to send the merchant to. `redirectUri`
 * is where Zoho returns them afterwards, and must match the one replayed to
 * the callback below or Zoho rejects the exchange.
 */
export const zohoConnectApi = (identifier: string, redirectUri: string) =>
  identifier ? `${ZOHO_BASE(identifier)}/connect?redirectUri=${redirectUri}` : "";

/**
 * Exchanges the `code` Zoho hands back for a stored connection. Called with
 * the query parameters Zoho appends when it returns the merchant to
 * `redirectUri`, which is why every one of them is passed straight through.
 */
export const zohoCallbackApi = (
  identifier: string,
  code: string,
  location: string,
  accountsServer: string,
  redirectUri: string
) =>
  identifier
    ? `${ZOHO_BASE(identifier)}/callback` +
      `?code=${encodeURIComponent(code)}` +
      `&location=${encodeURIComponent(location)}` +
      `&accounts-server=${encodeURIComponent(accountsServer)}` +
      `&redirectUri=${redirectUri}`
    : "";

/** Tears down the stored connection. DELETE. */
export const zohoDisconnectApi = (identifier: string) =>
  identifier ? `${ZOHO_BASE(identifier)}/disconnect` : "";

/** Pulls clients and/or invoices across from the connected Zoho account. */
export const zohoPullSyncApi = (identifier: string) =>
  identifier ? `${ZOHO_BASE(identifier)}/pull-sync` : "";

/** Retries pushing a single invoice's payment to Zoho after a failed sync. */
export const zohoPaymentSyncApi = (identifier: string, invoiceId: string) =>
  identifier && invoiceId ? `${ZOHO_BASE(identifier)}/invoices/${invoiceId}/payment-sync` : "";
