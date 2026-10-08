"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { MidGuard } from "@/components/common/MidGuard";
import { PaTransactionTable } from "@/features/dashboard/pa-transactions/components/PaTransactionTable";
import { PA_PRODUCT_FLAGS, SEGMENT_PA } from "@/features/dashboard/pa-transactions/constants";

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

  // While one transaction's full page is open, it replaces everything below
  // the nav: the header scopes the list, not a single payment.
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      {/* No metrics section: there is no PA analytics endpoint yet, and the
          cards that were here drew static figures as if they were the
          merchant's. They come back with real data. */}
      {!detailsOpen && <PageHeader title="Transactions" />}

      {isPAEnabled ? (
        <MidGuard productType="PA">
          <PaTransactionTable onDetailsOpenChange={setDetailsOpen} />
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
