"use client";

import { PageHeader } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { MidGuard } from "@/components/common/MidGuard";
import { McaTransactionTable } from "@/features/dashboard/transactions/components/McaTransactionTable";
import { SettlementAnalyticsCard } from "@/features/dashboard/transactions/components/SettlementAnalyticsCard";
import { SEGMENT_MCA } from "@/features/dashboard/transactions/constants";

// The Payment Gateway/Multi-Currency Accounts segment toggle (and the PA
// table it switched to) is gone: this page is now MCA-only, unconditionally.
// PaTransactionTable and the PA-related constants are left in place, just
// unused from here, rather than deleted, in case PA transactions need a home
// elsewhere later.
export function TransactionsFeature() {
  const merchantEnabledProducts = useApp((s) => s.merchantEnabledProducts);
  const isMCAEnabled = (merchantEnabledProducts?.pgProducts ?? []).includes(SEGMENT_MCA);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="Transactions" />

      {isMCAEnabled ? (
        <MidGuard productType="PACB">
          <SettlementAnalyticsCard />
          <McaTransactionTable />
        </MidGuard>
      ) : (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No transaction products are enabled for this account.</p>
        </div>
      )}
    </div>
  );
}
