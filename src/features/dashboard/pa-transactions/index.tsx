"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, PageHeader } from "@/components/ui";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { EnableProductAction, FeatureBanner } from "@/components/common/FeatureBanner";
import { useHasPaTransactions } from "@/features/dashboard/pa-transactions/useHasPaTransactions";
import { StartAcceptingCards } from "@/features/dashboard/pa-transactions/components/StartAcceptingCards";
import { useApp } from "@/stores/useApp";
import { MidGuard } from "@/components/common/MidGuard";
import { PaTransactionTable } from "@/features/dashboard/pa-transactions/components/PaTransactionTable";
import { PA_PRODUCT_FLAGS, SEGMENT_PA } from "@/features/dashboard/pa-transactions/constants";

// PA (Payment Aggregator — Cards / UPI / NetBanking) transactions, at
// /pa-transactions. Mirrors the MCA page's shape, see
// @/features/dashboard/mca-transactions.
export function PaTransactionsFeature() {
  const router = useRouter();
  const merchantEnabledProducts = useApp((s) => s.merchantEnabledProducts);
  const pgProducts = merchantEnabledProducts?.pgProducts ?? [];
  // Enabled either by the PA segment key itself or by one of the individual
  // card/UPI/netbanking product flags — same check pg-dashboard makes.
  const isPAEnabled =
    pgProducts.includes(SEGMENT_PA) || PA_PRODUCT_FLAGS.some((flag) => pgProducts.includes(flag));

  // While one transaction's full page is open, it replaces everything below
  // the nav: the header scopes the list, not a single payment.
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Not enabled: the banner, whose action hands over the support address.
  // Enabled with no payment yet: the banner, pointing at Payment Links, the
  // quickest way to take a first one. Once a payment exists, just the list.
  const hasTransactions = useHasPaTransactions(isPAEnabled);
  const showBanner = !isPAEnabled || hasTransactions === false;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      {/* No metrics section: there is no PA analytics endpoint yet, and the
          cards that were here drew static figures as if they were the
          merchant's. They come back with real data. */}
      {!detailsOpen && <PageHeader title="Transactions" />}

      {!detailsOpen && showBanner && (
        <>
          <FeatureBanner
            imageSrc="/assets/banner-states/Transaction%20empty%20state.png"
            title="Track every payment in one place."
            description="View your transactions, payment status and customer details as soon as you start accepting payments."
            action={
              isPAEnabled ? (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => router.push("/payment-links")}
                  // The link variant pads itself and sets 15px; the design sets
                  // the link flush with the copy above it, at the body size.
                  className="p-0! text-[14px]! font-normal hover:bg-transparent"
                >
                  Start accepting payments
                </Button>
              ) : (
                <EnableProductAction product="payments" label="Start accepting payments" />
              )
            }
          />
          {/* The three ways to take that first payment. */}
          <StartAcceptingCards />
        </>
      )}

      {isPAEnabled ? (
        <MidGuard productType="PA">
          <PaTransactionTable onDetailsOpenChange={setDetailsOpen} />
        </MidGuard>
      ) : (
        <Card className="gap-0 p-0">
          <PlaceholderState
            variant="empty-table"
            title="No transactions yet"
            description="Payments you accept will show up here."
            className="py-16"
          />
        </Card>
      )}
    </div>
  );
}
