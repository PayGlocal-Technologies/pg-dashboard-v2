/**
 * DESIGN MOCK for Partners → Key Management. Key IDs, keys and salts are
 * obvious placeholders, never real credentials.
 *
 * TODO(integration): a partner account's keys come from the partner
 * key-mgmt routes (`/gcc/v2/partner/key-mgmt/<mid>/rsa-key | api-key`), as
 * the Key Management System feature on the PA branch already wires them.
 */

export type KeyKind = "certificate" | "rsa" | "apiKey";

export interface PartnerKey {
  kid: string;
  status: "ACTIVE" | "REVOKED";
  generatedOn: string | null;
  expiresOn: string | null;
  type: "RSA_PUBCERT" | "RSA" | "API_KEY";
}

export const KIND_META: Record<
  KeyKind,
  {
    label: string;
    icon: "shield-check" | "key-round" | "code";
    /** What it is for, in one line. */
    purpose: string;
    /** Longer, under the table title. */
    description: string;
    unit: [singular: string, plural: string];
  }
> = {
  certificate: {
    label: "PayGlocal certificate",
    icon: "shield-check",
    purpose: "Encrypt the requests you send to PayGlocal",
    description:
      "PayGlocal's public certificate for message-level encryption. Download it and use it to encrypt request payloads.",
    unit: ["certificate", "certificates"],
  },
  rsa: {
    label: "RSA keys",
    icon: "key-round",
    purpose: "Sign your requests so PayGlocal can verify them",
    description:
      "Key pairs you generate. You keep the private key; PayGlocal keeps the public key to verify your signatures.",
    unit: ["active key", "active keys"],
  },
  apiKey: {
    label: "API keys",
    icon: "code",
    purpose: "Authenticate your API calls with a key and salt",
    description:
      "An API key and salt authenticate each call. Both are shown once, when the key is generated.",
    unit: ["active key", "active keys"],
  },
};

export const KIND_ORDER: KeyKind[] = ["certificate", "rsa", "apiKey"];

export const MOCK_KEYS: Record<KeyKind, PartnerKey[]> = {
  certificate: [
    {
      kid: "PayGlocal key/certificate for message-level encryption",
      status: "ACTIVE",
      generatedOn: null,
      expiresOn: null,
      type: "RSA_PUBCERT",
    },
  ],
  rsa: [
    {
      kid: "kid-demo-rsa-0001",
      status: "ACTIVE",
      generatedOn: "30 Jun '26, 03:39 PM",
      expiresOn: "30 Jun '29, 09:07 AM",
      type: "RSA",
    },
    {
      kid: "kid-demo-rsa-0002",
      status: "ACTIVE",
      generatedOn: "30 Jun '26, 03:39 PM",
      expiresOn: "30 Jun '29, 09:07 AM",
      type: "RSA",
    },
  ],
  apiKey: [
    {
      kid: "kid-demo-api-0003",
      status: "ACTIVE",
      generatedOn: "8 Oct '26, 09:26 AM",
      expiresOn: "9 Apr '27, 12:26 AM",
      type: "API_KEY",
    },
    {
      kid: "kid-demo-api-0002",
      status: "ACTIVE",
      generatedOn: "24 Sep '26, 11:41 AM",
      expiresOn: "26 Mar '27, 02:41 AM",
      type: "API_KEY",
    },
    {
      kid: "kid-demo-api-0001",
      status: "REVOKED",
      generatedOn: "26 Aug '26, 07:01 PM",
      expiresOn: "25 Feb '27, 10:01 AM",
      type: "API_KEY",
    },
  ],
};
