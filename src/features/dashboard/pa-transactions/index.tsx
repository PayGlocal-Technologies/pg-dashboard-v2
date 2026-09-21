"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { MidGuard } from "@/components/common/MidGuard";
import { TimeRangeTabs } from "@/components/common/TimeRangeTabs";
import { formatCurrency } from "@/lib/utils/format";
import { PaTransactionTable } from "@/features/dashboard/pa-transactions/components/PaTransactionTable";
import { TransactionStatCards } from "@/features/dashboard/pa-transactions/components/TransactionStatCards";
import { PA_PRODUCT_FLAGS, SEGMENT_PA } from "@/features/dashboard/pa-transactions/constants";
import {
  totalVolumeTimeframes,
  transactionsMetricsByTimeframe,
  transactionsTrendChartsByTimeframe,
  type TotalVolumeTimeframe,
} from "@/features/dashboard/pa-transactions/summary";

// PA (Payment Aggregator — Cards / UPI / NetBanking) transactions, at
// /pa-transactions. Mirrors the MCA page's shape, see
// @/features/dashboard/mca-transactions.
export function PaTransactionsFeature() {
  const merchantEnabledProducts = useApp((s) => s.merchantEnabledProducts);
  const pgProducts = merchantEnabledProducts?.pgProducts ?? [];
  // Enabled either by the PA segment key itself or by one of the individual
  // card/UPI/netbanking product flags — same check pg-dashboard makes.
  const isPAEnabled =
    pgProducts.includes(SEGMENT_PA) || PA_PRODUCT_FLAGS.some((flag) => pgProducts.includes(flag));

  // Metrics-section time range, deliberately independent of the table's own
  // filters below — same split as the MCA Transactions page's own Analytics
  // time range vs. its table's date filter.
  const [timeframe, setTimeframe] = useState<TotalVolumeTimeframe>("ytd");
  const metrics = transactionsMetricsByTimeframe[timeframe];

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Transactions"
        actions={
          <TimeRangeTabs
            options={totalVolumeTimeframes.map((t) => ({ value: t.id, label: t.label }))}
            value={timeframe}
            onValueChange={setTimeframe}
            label="Metrics time range"
          />
        }
      />

      {isPAEnabled ? (
        <MidGuard productType="PA">
          <TransactionStatCards
            timeframe={timeframe}
            totalVolumeLabel={formatCurrency(metrics.totalVolume, "INR")}
            metrics={metrics}
            trendCharts={transactionsTrendChartsByTimeframe[timeframe]}
          />
          <PaTransactionTable />
        </MidGuard>
      ) : (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No payment gateway products are enabled for this account.
          </p>
        </div>
      )}
    </div>
  );
}
