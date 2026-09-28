"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, DataCardList, DataTableCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { buildCommissionColumns } from "@/features/dashboard/commissions/columns";
import { CommissionCard } from "@/features/dashboard/commissions/components/CommissionCard";
import { COMMISSION_CYCLES } from "@/features/dashboard/commissions/mock-data";
import type { CommissionCycle } from "@/features/dashboard/commissions/types";

/**
 * DESIGN MOCK: the partner Commissions page (Header's Partners tab), at
 * /commission, the same path pg-dashboard serves it on. Laid out with the
 * Multi-Currency Accounts transactions page's pieces: PageHeader, one
 * DataTableCard with its toolbar (Refresh on the right), the card list below lg.
 *
 * Runs on fictional cycles (mock-data.ts); Refresh and Statement are UI only.
 * TODO(integration): swap in the partner commission and statement endpoints
 * once confirmed against pg-dashboard.
 */

const EMPTY_COPY = {
  title: "Your commissions will appear here",
  description:
    "Each month's commission cycle lands here with what your merchants processed, what you earned, and when it was paid out.",
};

export function CommissionsFeature() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rows = COMMISSION_CYCLES;

  function handleRefresh() {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Commissions updated");
    }, 600);
  }

  function handleDownloadStatement(row: CommissionCycle) {
    toast.message("Statement download isn't connected yet", {
      description: `Design preview: no statement was generated for ${row.periodStart.slice(0, 7)}.`,
    });
  }

  const columns = buildCommissionColumns({ onDownloadStatement: handleDownloadStatement });

  const refreshButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={
        <Icon name="refresh" className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
      }
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
    >
      Refresh
    </Button>
  );

  const cycleCount = (
    <p className="text-[13px] text-muted-foreground">
      {rows.length} commission {rows.length === 1 ? "cycle" : "cycles"}
    </p>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Commissions"
        subtitle="Track your commission earnings, payment cycles, and payout status."
      />

      <DataTableCard<CommissionCycle>
        className="hidden lg:block"
        toolbar={
          <div className="flex items-center gap-2">
            {cycleCount}
            <div className="ml-auto">{refreshButton}</div>
          </div>
        }
        columns={columns}
        data={rows}
        isLoading={false}
        rowKey={(row) => row.id}
        emptyTitle={EMPTY_COPY.title}
        emptyDescription={EMPTY_COPY.description}
        emptyState={
          <PlaceholderState
            variant="no-transactions"
            title={EMPTY_COPY.title}
            description={EMPTY_COPY.description}
            className="py-16"
          />
        }
        maxBodyHeight="none"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {cycleCount}
          <div className="ml-auto">{refreshButton}</div>
        </div>
        <DataCardList<CommissionCycle>
          bordered={false}
          rows={rows}
          rowKey={(row) => row.id}
          isLoading={false}
          renderCard={(row) => (
            <CommissionCard row={row} onDownloadStatement={handleDownloadStatement} />
          )}
          emptyState={
            <PlaceholderState
              variant="no-transactions"
              size="sm"
              title={EMPTY_COPY.title}
              description={EMPTY_COPY.description}
            />
          }
        />
      </div>
    </div>
  );
}
