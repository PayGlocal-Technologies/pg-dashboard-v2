import { BASE_URL_V1 } from "@/api";

// Endpoint URL builders only. Path copied from ZOHO_BASE + zohoPaymentSyncApi
// in pg-dashboard's src/features/zoho-integration/service.ts. Note it is v1 and
// sits under /integrations/zoho, not alongside the v3 mca-invoice endpoints.

/** Retries pushing a payment to Zoho after a failed sync. */
export const zohoPaymentSyncApi = (mid: string, invoiceId: string): string =>
  mid && invoiceId
    ? `${BASE_URL_V1}/integrations/zoho/${mid}/invoices/${invoiceId}/payment-sync`
    : "";
