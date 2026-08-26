"use client";

import { Badge, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";

// TODO(integration): no banking endpoint exists yet, only bankName comes
// from the real profile (when present); account number/currency/primary
// status are illustrative-only mock data, and only a single account is
// shown (no multi-account list yet).
const MOCK_ACCOUNT = {
  accountType: "Current",
  last4: "4521",
  currency: "INR",
};

export function BankingFeature() {
  const profile = useApp((s) => s.profile);
  const bankName = profile?.bankName ?? "HDFC Bank";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Banking & currencies"
        subtitle="Where we send settled funds by currency."
      />

      <Card className="w-full max-w-sm gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon name="landmark" size={18} />
          </span>
          <Badge variant="default" size="sm">
            Primary
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-foreground">{bankName}</p>
            <p className="text-xs text-muted-foreground">
              {MOCK_ACCOUNT.accountType} · ****{MOCK_ACCOUNT.last4}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{MOCK_ACCOUNT.currency}</p>
        </div>
      </Card>
    </div>
  );
}
