/**
 * DESIGN MOCK for the PA settings Developer page. There is no endpoint for
 * publishable/secret key pairs or webhook endpoints yet; PayGlocal's real
 * keys (API keys and RSA keys, by kid) are managed on Key Management System.
 * The values below are obviously fake placeholders, never real credentials.
 * TODO(integration): replace with the developer settings endpoints.
 */

export type KeyEnv = "live" | "test";

export interface DeveloperKey {
  kind: "publishable" | "secret";
  value: string;
  createdOn: string;
}

export const MOCK_KEYS: Record<KeyEnv, DeveloperKey[]> = {
  live: [
    { kind: "publishable", value: "pk_live_demo_0000aaaa1111bbbb2222", createdOn: "12 Mar 2026" },
    { kind: "secret", value: "sk_live_demo_3333cccc4444dddd5555", createdOn: "12 Mar 2026" },
  ],
  test: [
    { kind: "publishable", value: "pk_test_demo_6666eeee7777ffff8888", createdOn: "2 Feb 2026" },
    { kind: "secret", value: "sk_test_demo_9999gggg0000hhhh1111", createdOn: "2 Feb 2026" },
  ],
};

export interface WebhookEvent {
  name: string;
  description: string;
}

/** The events an endpoint can subscribe to. MOCK: confirm the real event
 *  names with the backend. */
export const WEBHOOK_EVENTS: WebhookEvent[] = [
  { name: "payment.success", description: "A payment was captured" },
  { name: "payment.failed", description: "A payment was declined or failed" },
  { name: "refund.processed", description: "A refund reached the customer" },
  { name: "settlement.created", description: "A settlement was initiated" },
  { name: "dispute.opened", description: "A customer raised a dispute" },
  { name: "dispute.closed", description: "A dispute was won or lost" },
];

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  /** "2 min ago · 200 OK", or undefined before the first delivery. */
  lastDelivery?: string;
}

export const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: "wh_1",
    url: "https://api.example.com/webhooks/payglocal",
    events: ["payment.success", "payment.failed", "settlement.created", "dispute.opened"],
    active: true,
    lastDelivery: "2 min ago · 200 OK",
  },
];
