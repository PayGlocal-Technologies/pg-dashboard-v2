"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { MidGuard } from "@/components/common/MidGuard";
import { McaTransactionTable } from "@/features/dashboard/mca-transactions/components/McaTransactionTable";
import { TransactionsAnalyticsCarousel } from "@/features/dashboard/mca-transactions/components/TransactionsAnalyticsCarousel";
import { AnalyticsTimeRangeControl } from "@/features/dashboard/mca-transactions/components/AnalyticsTimeRangeControl";
import { SEGMENT_MCA } from "@/features/dashboard/mca-transactions/constants";
import type { TimeRange } from "@/features/dashboard/mca-transactions/components/SettlementAnalyticsCard";
import { GuideTour } from "@/components/common/guide/GuideTour";
import {
  MCA_TRANSACTIONS_GUIDE_KEY,
  MCA_TRANSACTIONS_GUIDE_STEPS,
} from "@/features/dashboard/mca-transactions/guide";

// MCA (Multi-Currency Accounts) transactions, at /mca-transactions. The
// segment toggle that used to switch this page between the MCA and PA tables
// is gone: PA transactions now have their own route and feature, see
// @/features/dashboard/pa-transactions.
export function McaTransactionsFeature() {
  const merchantEnabledProducts = useApp((s) => s.merchantEnabledProducts);
  const isMCAEnabled = (merchantEnabledProducts?.pgProducts ?? []).includes(SEGMENT_MCA);
  // Owned here, not inside the Analytics section itself, so it can render as
  // the page header's action (in line with the "Transactions" title) while
  // still reaching down into TransactionsAnalyticsCarousel.
  const [timeRange, setTimeRange] = useState<TimeRange>("year");

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Transactions"
        actions={
          isMCAEnabled ? (
            <AnalyticsTimeRangeControl value={timeRange} onValueChange={setTimeRange} />
          ) : undefined
        }
      />

      {isMCAEnabled ? (
        <MidGuard productType="PACB">
          {/* The analytics summary is composed here (this is the page's
              composition root) but positioned by McaTransactionTable, since
              below md the search/Report/filter-chip controls move above it and
              only the table component owns those. It still renders above
              everything else at md and up, exactly as when it sat here
              directly. */}
          <McaTransactionTable
            analyticsSection={<TransactionsAnalyticsCarousel timeRange={timeRange} />}
          />
        </MidGuard>
      ) : (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Multi-Currency Accounts is not enabled for this account.
          </p>
        </div>
      )}

      {/* First-visit onboarding coach-marks (analytics + row Upload Invoice). */}
      {isMCAEnabled && (
        <GuideTour
          steps={MCA_TRANSACTIONS_GUIDE_STEPS}
          storageKey={MCA_TRANSACTIONS_GUIDE_KEY}
        />
      )}
    </div>
  );
}
