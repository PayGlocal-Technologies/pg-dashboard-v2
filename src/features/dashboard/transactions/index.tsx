"use client";

import { PageHeader } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { MidGuard } from "@/components/common/MidGuard";
import { McaTransactionTable } from "@/features/dashboard/transactions/components/McaTransactionTable";
import { SettlementAnalyticsCard } from "@/features/dashboard/transactions/components/SettlementAnalyticsCard";
import { OutstandingAmountCard } from "@/features/dashboard/transactions/components/OutstandingAmountCard";
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
          {/* Settlement Analytics stays the wider card (it carries the
              account-level breakdown); Outstanding Amount takes the
              remaining space. items-stretch (grid's default) is what gives
              both the same height, so their top and bottom edges align, not
              an explicit height on either card. Stacks to one column below
              lg, Outstanding Amount second. */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            <SettlementAnalyticsCard />
            <OutstandingAmountCard />
          </div>
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
