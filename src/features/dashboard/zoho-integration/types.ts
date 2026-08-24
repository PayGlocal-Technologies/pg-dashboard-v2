/** Shapes returned by the Zoho endpoints, copied from pg-dashboard's
 * src/features/zoho-integration/types.ts. */

export interface ZohoStatusData {
  connected: boolean;
  /** "CONNECTED" is the only value the UI branches on. */
  status: string;
  connectedAt: string | null;
  orgId: string | null;
  lastSyncedTime: number | null;
  /** True until the first successful pull-sync, which is what separates
   * "Ready to sync" from a "Last synced …" timestamp. */
  isFirstSync: boolean;
}

export interface ZohoStatusResponse {
  status: string;
  message: string;
  data: ZohoStatusData;
}

export interface ZohoConnectResponse {
  connectUrl: string;
}

export interface ZohoPullSyncData {
  merchantId: string;
  clientsSynced: number;
  invoicesSynced: number;
  failedPushesRetried: number;
  previousBookmark: string;
  newBookmark: string;
}

/** Which record types a pull-sync should bring across. The client list asks
 * for clients only, the invoice list for invoices only, the integration card
 * for both. */
export interface ZohoPullSyncPayload {
  isClientSync: boolean;
  isInvoiceSync: boolean;
}

/** Outcome of the OAuth round trip, driving ZohoResultDialog. */
export type ZohoConnectResult = "success" | "failure";
