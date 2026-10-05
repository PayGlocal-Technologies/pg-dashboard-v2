/** The three kinds of key the page lists, one tab each. */
export type KeyKind = "certificate" | "rsa" | "apiKey";

/** One key, as the keys endpoints return it (pg-dashboard's MerchantKey). */
export interface MerchantKey {
  mid?: string | null;
  kid?: string | null;
  keyStatus?: string | null;
  keyType?: string | null;
  /** "dd/mm/yyyy hh:mm[:ss]". */
  creationDate?: string | null;
  expiryDate?: string | null;
  strength?: string | null;
}

export interface MerchantKeysResponse {
  data?: { keys?: MerchantKey[] | null } | null;
}

/** Whether API keys are on for the MID, and which API version serves them. */
export interface ApiKeyStatusResponse {
  data?: {
    apiKeyStatus?: boolean | null;
    apiKeyVersion?: string | null;
  } | null;
}

/** A freshly generated API key: shown once, never retrievable again. */
export interface GeneratedApiKey {
  apiKey?: string | null;
  kid?: string | null;
  salt?: string | null;
}

export interface GenerateApiKeyResponse {
  data?: GeneratedApiKey | null;
}

/** A file the server streams back (private key, certificate). */
export interface KeyFile {
  blob: Blob;
  fileName: string;
}
