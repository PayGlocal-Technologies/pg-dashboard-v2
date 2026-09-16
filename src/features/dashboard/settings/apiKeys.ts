export type ApiKeyEnv = "live" | "test";
export type ApiKeyEnvFilter = "all" | ApiKeyEnv;

export interface ApiKeyRow {
  id: string;
  env: ApiKeyEnv;
  kind: "public" | "secret";
  label: string;
  value: string;
}

// TODO(integration): no API-key-management endpoint exists yet, these are
// illustrative-only mock credentials, matching the reference design's own
// placeholder values.
export const MOCK_API_KEYS: ApiKeyRow[] = [
  {
    id: "live-public",
    env: "live",
    kind: "public",
    label: "Live public key",
    value: "pk_live_mcatest123_pub_abcde12345",
  },
  {
    id: "live-secret",
    env: "live",
    kind: "secret",
    label: "Live secret key",
    value: "sk_live_mcatest123_sec_zyxwv98765",
  },
  {
    id: "test-public",
    env: "test",
    kind: "public",
    label: "Test public key",
    value: "pk_test_mcatest123_pub_test12345",
  },
  {
    id: "test-secret",
    env: "test",
    kind: "secret",
    label: "Test secret key",
    value: "sk_test_mcatest123_sec_test98765",
  },
];

/** All/Live/Test tab filter for the API keys card. */
export function filterKeysByEnv(rows: ApiKeyRow[], env: ApiKeyEnvFilter): ApiKeyRow[] {
  if (env === "all") return rows;
  return rows.filter((row) => row.env === env);
}
