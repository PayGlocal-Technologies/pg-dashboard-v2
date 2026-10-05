import { BASE_URL_V1 } from "@/api";

// Endpoint URL builders only, ported verbatim from pg-dashboard's KMSTable,
// which inlines them. Partners (resellers, aggregators, partner-onboarded
// merchants) are served by the partner key-mgmt routes; everyone else by the
// IAM keys routes, on v2 for API keys when the MID's API keys are VERSION_2.

/** IAM's path segment for a kind ("rsa", "apiKey"); partners use kebab-case. */
export type KeyPathSegment = "rsa" | "apiKey" | "rsa-key" | "api-key";

/** Whether API keys are on for the MID, and their version. GET. */
export const apiKeyStatusApi = (mid: string): string => `${BASE_URL_V1}/merchants/${mid}/apiKey`;

/** List, and (for API keys) generate. GET to list, POST `{}` to generate. */
export const keysApi = ({
  isPartner,
  mid,
  segment,
  apiVersion,
}: {
  isPartner: boolean;
  mid: string;
  segment: KeyPathSegment;
  apiVersion: "v1" | "v2";
}): string =>
  isPartner
    ? `/gcc/v2/partner/key-mgmt/${mid}/${segment}`
    : `/gcc/${apiVersion}/iam/merchants/${mid}/keys/${segment}`;

/** Revoke one key. POST, empty body. */
export const revokeKeyApi = (args: Parameters<typeof keysApi>[0], kid: string): string =>
  `${keysApi(args)}/${kid}/revoke`;

/** Generate an RSA key pair. POST; streams back the private key file. Always v1 for IAM. */
export const generateRsaKeyApi = (isPartner: boolean, mid: string): string =>
  isPartner
    ? `/gcc/v2/partner/key-mgmt/${mid}/rsa-key`
    : `${BASE_URL_V1}/iam/merchants/${mid}/keys/rsa`;

/** PayGlocal's public certificate for message-level encryption. GET; a file. */
export const payglocalCertificateApi = `${BASE_URL_V1}/iam/glocal/keys/rsa/pubcert`;
