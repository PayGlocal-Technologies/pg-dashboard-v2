"use client";

import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";

interface PaymentMethod {
  key: string;
  icon: IconName;
  title: string;
  description: string;
  enabled: boolean;
}

/** MOCK: which rails are live on the account. Read-only here: merchants
 *  can't switch rails on or off from the dashboard. TODO(integration): read
 *  from the account's enabled payment methods. */
const PAYMENT_METHODS: PaymentMethod[] = [
  {
    key: "cards",
    icon: "credit-card",
    title: "Cards (Visa / Mastercard / Amex)",
    description: "Domestic and international card payments",
    enabled: true,
  },
  {
    key: "upi",
    icon: "smartphone",
    title: "UPI",
    description: "Real-time bank transfers via UPI",
    enabled: true,
  },
  {
    key: "netbanking",
    icon: "landmark",
    title: "Net banking",
    description: "Direct bank transfers for Indian customers",
    enabled: true,
  },
  {
    key: "international-cards",
    icon: "globe",
    title: "International cards",
    description: "Cross-border card payments in 135+ currencies",
    enabled: true,
  },
  {
    key: "global-fund-transfers",
    icon: "send",
    title: "Global fund transfers",
    description: "Wire transfers and SWIFT-based payments",
    enabled: false,
  },
];

/** The PA settings Payments page: the payment methods live on the account,
 *  as static information (no toggles, nothing to save). */
export function PaPaymentsFeature() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        subtitle="Payment methods, currencies, and refund behaviour for your customers."
      />

      <Card className="gap-0 overflow-hidden p-0">
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-base font-semibold text-foreground">Payment methods</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The rails your Indian and international buyers can pay with.
          </p>
        </div>

        <ul className="divide-y divide-border border-t border-border">
          {PAYMENT_METHODS.map((method) => (
            <li key={method.key} className="flex items-center gap-4 px-6 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                <Icon name={method.icon} size={17} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{method.title}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{method.description}</p>
              </div>
              <StatusBadge
                size="sm"
                variant={method.enabled ? "success" : "muted"}
                label={method.enabled ? "Enabled" : "Not enabled"}
                trailIcon={method.enabled ? "check" : undefined}
              />
            </li>
          ))}
        </ul>

        <p className="flex items-center gap-2 border-t border-border bg-muted/30 px-6 py-3 text-[13px] text-muted-foreground">
          <Icon name="info" size={14} aria-hidden className="shrink-0" />
          To enable or disable a payment method, contact your PayGlocal account manager.
        </p>
      </Card>
    </div>
  );
}
