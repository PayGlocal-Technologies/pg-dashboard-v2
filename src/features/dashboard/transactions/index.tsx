"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { MidGuard } from "@/components/common/MidGuard";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { PaTransactionTable } from "@/features/dashboard/transactions/components/PaTransactionTable";
import { TransactionStatCards } from "@/features/dashboard/transactions/components/TransactionStatCards";
import {
  totalVolumeTimeframes,
  transactionsMetricsByTimeframe,
  transactionsTrendChartsByTimeframe,
  type TotalVolumeTimeframe,
} from "@/features/dashboard/transactions/summary";

function formatLakh(amount: number): string {
  return `₹${(amount / 100_000).toFixed(2)}L`;
}

const TIMEFRAME_OPTIONS = totalVolumeTimeframes.map((t) => ({ value: t.id, label: t.label }));

export function TransactionsFeature() {
  // Single source of truth for the period selector, every metric card and
  // chart in TransactionStatCards reads off this same timeframe so they all
  // update together instead of drifting independently.
  const [timeframe, setTimeframe] = useState<TotalVolumeTimeframe>("ytd");
  const metrics = transactionsMetricsByTimeframe[timeframe];
  const trendCharts = transactionsTrendChartsByTimeframe[timeframe];

  return (
    // Full-bleed background matching the cards below, rather than the app
    // shell's default grey (see (dashboard)/layout.tsx), only for this page.
    <div className="-m-4 min-h-[calc(100vh-57px)] bg-card p-4 md:-m-6 md:p-6">
      <div className="max-w-350 mx-auto space-y-4 page-enter">
        <PageHeader title="Transactions" />

        <MidGuard productType="PA">
          {/* Same "section title + period control" header, then the card
           * grid beneath it, as Payment Links' own Metrics section. */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Metrics</h2>
              <SegmentedTabs
                options={TIMEFRAME_OPTIONS}
                value={timeframe}
                onChange={(v) => setTimeframe(v as TotalVolumeTimeframe)}
              />
            </div>

            <TransactionStatCards
              timeframe={timeframe}
              totalVolumeLabel={formatLakh(metrics.totalVolume)}
              metrics={metrics}
              trendCharts={trendCharts}
            />
          </div>

          <PaTransactionTable />
        </MidGuard>
      </div>
    </div>
  );
}
