"use client";

import { PageHeader } from "@/components/ui";
import { SettlementAccountCard } from "@/features/dashboard/settings/components/SettlementAccountCard";
import { useSettlementLastChanged } from "@/features/dashboard/settings/hooks";

export function BankingFeature() {
  // When the account last changed, from the settlement read's lastUpdatedTime.
  const { lastChangedDate, isLoading } = useSettlementLastChanged();
  return (
    <div className="space-y-5">
      <PageHeader title="Account details" subtitle="Where we send settled funds by currency." />
      <SettlementAccountCard lastChangedDate={lastChangedDate} isPolicyLoading={isLoading} />
    </div>
  );
}
