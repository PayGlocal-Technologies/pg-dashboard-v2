"use client";

import { PageHeader } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { MidGuard } from "@/components/common/MidGuard";
import { McaTransactionTable } from "@/features/dashboard/transactions/components/McaTransactionTable";
import { SettlementAnalyticsCard } from "@/features/dashboard/transactions/components/SettlementAnalyticsCard";
import { OutstandingAmountCard } from "@/features/dashboard/transactions/components/OutstandingAmountCard";
import { SavedAmountCard } from "@/features/dashboard/transactions/components/SavedAmountCard";
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
          {/* Two layouts over the same two children, so nothing is
              duplicated between them:

              - Below md the pair becomes a horizontally scrolling carousel of
                two snap pages, Settlement Analytics then the Outstanding +
                Saved stack. Same scrollbar-none/snap-x/snap-mandatory
                treatment as the multi-currency account carousel, and the same
                p-1 there (offset by -m-1 so the cards still line up with the
                rest of the page) so overflow-x-auto's implicit vertical clip
                doesn't shave each card's rounded corners or shadow.
              - From md up it's the existing grid: one column at md, then
                Settlement Analytics as the wider card at lg with Outstanding
                Amount and Saved Amount sharing the remaining space as a
                stacked secondary column. */}
          <div
            className="scrollbar-none -m-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth p-1
                       md:m-0 md:grid md:overflow-visible md:p-0
                       lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
          >
            {/* calc(100% - 2.5rem), not 100%: leaves a sliver of the next
                page in view as the affordance that there's a second one, so
                the carousel doesn't look like a single card that happens to
                be inset. md:w-auto hands sizing back to the grid column. */}
            <div className="w-[calc(100%-2.5rem)] shrink-0 snap-start md:w-auto">
              <SettlementAnalyticsCard />
            </div>

            {/* grow (not flex-1, whose 0 basis would force both cards to the
                same height and clip the taller one) lets the two split
                whatever height the taller Settlement Analytics page sets, so
                the stack reads as one page of equivalent weight beside it.
                Only below md: from md up these are grid items again, where
                the column already stretches and the cards should stay at
                their natural heights, exactly as before. */}
            <div className="flex w-[calc(100%-2.5rem)] shrink-0 snap-start flex-col gap-4 md:w-auto">
              <OutstandingAmountCard className="grow md:grow-0" />
              <SavedAmountCard className="grow md:grow-0" />
            </div>
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
