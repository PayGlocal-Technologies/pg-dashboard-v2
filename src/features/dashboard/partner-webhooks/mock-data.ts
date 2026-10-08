/**
 * DESIGN MOCK for Partners → Webhooks. Endpoints and URLs are placeholders.
 *
 * TODO(integration): the partner webhook endpoints, and the real event and
 * authentication-type lists, confirmed against pg-dashboard.
 */

export type WebhookAuthType = "NONE" | "BASIC" | "BEARER";

export interface WebhookEventOption {
  value: string;
  label: string;
  description: string;
}

/** The events pg-dashboard's partner webhooks offer. */
export const WEBHOOK_EVENTS: WebhookEventOption[] = [
  {
    value: "TXN_SETTLED",
    label: "Transaction settled",
    description: "Funds settled to the merchant",
  },
  {
    value: "TXN_SENT_FOR_SETTLEMENT",
    label: "Sent for settlement",
    description: "A transaction entered the settlement cycle",
  },
  {
    value: "FIRC_RECEIVED",
    label: "FIRC received",
    description: "An inward remittance certificate arrived",
  },
  {
    value: "COMPLIANCE_ALERT",
    label: "Compliance alert",
    description: "A merchant needs a compliance action",
  },
  {
    value: "FUNDING_NOTIFICATION",
    label: "Funding notification",
    description: "Funds were credited to an account",
  },
];

export const AUTH_LABEL: Record<WebhookAuthType, string> = {
  NONE: "No authentication",
  BASIC: "Basic auth",
  BEARER: "Bearer token",
};

export interface PartnerWebhook {
  id: string;
  groupName: string;
  url: string;
  events: string[];
  authType: WebhookAuthType;
  /** Basic auth's username, shown; secrets are never shown back. */
  authUser?: string;
  notes: string;
  active: boolean;
  lastDelivery?: string;
}

export const MOCK_WEBHOOKS: PartnerWebhook[] = [
  {
    id: "wh-1",
    groupName: "Transaction webhooks",
    url: "https://hooks.example.com/payglocal/transactions",
    events: [
      "TXN_SETTLED",
      "TXN_SENT_FOR_SETTLEMENT",
      "FIRC_RECEIVED",
      "COMPLIANCE_ALERT",
      "FUNDING_NOTIFICATION",
    ],
    authType: "NONE",
    notes: "Transaction-related webhooks for the reconciliation service.",
    active: true,
    lastDelivery: "4 min ago · 200 OK",
  },
  {
    id: "wh-2",
    groupName: "Compliance alerts",
    url: "https://ops.example.com/webhooks/compliance",
    events: ["COMPLIANCE_ALERT"],
    authType: "BASIC",
    authUser: "ops-bot",
    notes: "Routes compliance alerts to the onboarding team's queue.",
    active: false,
  },
];
