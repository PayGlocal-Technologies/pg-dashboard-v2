"use client";

import { PageHeader } from "@/components/ui";
import { SettlementAccountCard } from "@/features/dashboard/settings/components/SettlementAccountCard";
import { MOCK_SETTLEMENT_LAST_CHANGED_DATE } from "@/features/dashboard/settings/settlementChangePolicy";

export function BankingFeature() {
  return (
    <div className="space-y-5">
      <PageHeader title="Account details" subtitle="Where we send settled funds by currency." />
      <SettlementAccountCard lastChangedDate={MOCK_SETTLEMENT_LAST_CHANGED_DATE} />
    </div>
  );
}
