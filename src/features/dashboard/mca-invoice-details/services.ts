// Zoho's payment-sync endpoint now lives with the rest of the integration, in
// @/features/dashboard/zoho-integration/services, rather than being redeclared
// per consuming feature. Re-exported here so this feature's own call sites keep
// importing from their feature's services file, per the API-layer convention.
export { zohoPaymentSyncApi } from "@/features/dashboard/zoho-integration/services";
