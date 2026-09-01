"use client";

import { useState } from "react";
import { DataTable, Heading } from "@/components/ui";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  buildRedemptionColumns,
  buildReferralColumns,
} from "@/features/dashboard/refer-and-earn/columns";
import {
  DEFAULT_REFERRAL_STATUS_TAB,
  REFERRAL_PAGE_SIZE,
  REFERRAL_STATUS_TABS,
  type ReferralStatusTab,
} from "@/features/dashboard/refer-and-earn/constants";
import type { ReferralSummary } from "@/features/dashboard/refer-and-earn/helpers";
import {
  RedemptionCardList,
  ReferralCardList,
} from "@/features/dashboard/refer-and-earn/components/ReferralCardList";
import { ReferralSummaryCards } from "@/features/dashboard/refer-and-earn/components/ReferralSummaryCards";
import type { Referral, ReferralRedemption } from "@/features/dashboard/refer-and-earn/types";

const EMPTY_STATE: Record<ReferralStatusTab, { title: string; description: string }> = {
  ALL: {
    title: "No referrals yet",
    description:
      "Share your referral link to get started. Referrals appear here as soon as someone signs up with it.",
  },
  REDEEMED: {
    title: "Nothing redeemed yet",
    description:
      "Once a referral reward is applied against your MDR charges, the deduction shows up here.",
  },
};

interface ReferralEarningsProps {
  referrals: Referral[];
  redemptions: ReferralRedemption[];
  /**
   * Computed once by the page and passed down rather than recomputed here, so
   * the analytics row and the Total earned card beside the hero are literally
   * the same object and cannot drift. It also lets the wallet's authoritative
   * totals reach this row, which a summary derived from these props alone could
   * not carry.
   */
  summary: ReferralSummary;
  isLoading?: boolean;
}

/**
 * "Referral earnings" heading, the analytics row, then the earnings surface: the
 * full table from lg up, the card list below that — the same desktop/mobile pair
 * the Clients, SKU, and Transactions tables use.
 *
 * The two tabs render two different tables over two different row types, because
 * that is what the transactions feed holds: referral credits, and wallet
 * redemptions against the merchant's fees.
 */
export function ReferralEarnings({
  referrals,
  redemptions,
  summary,
  isLoading = false,
}: ReferralEarningsProps) {
  const [page, setPage] = useState(1);

  // Which of the two tabs is active. Selects the row set below —
  // ReferralSummaryCards above stays summarised over the whole programme, since
  // those are totals rather than a view of this one tab.
  const [statusTab, setStatusTab] = useState<ReferralStatusTab>(DEFAULT_REFERRAL_STATUS_TAB);

  const onStatusTabChange = (value: string) => {
    setStatusTab(value as ReferralStatusTab);
    // Switching tabs changes what matches, so it returns to page 1 the same
    // way every other filter on this page does — otherwise a merchant on
    // page 2 of "Your referrals" could land on an empty page of "Redeemed".
    setPage(1);
  };

  const showRedeemed = statusTab === "REDEEMED";

  // Both row sets arrive newest-first from the mappers, so paging is a plain
  // slice on either one.
  const totalCount = showRedeemed ? redemptions.length : referrals.length;
  const start = (page - 1) * REFERRAL_PAGE_SIZE;
  const referralRows = referrals.slice(start, start + REFERRAL_PAGE_SIZE);
  const redemptionRows = redemptions.slice(start, start + REFERRAL_PAGE_SIZE);

  const empty = EMPTY_STATE[statusTab];

  // Shared by both tabs' desktop tables and both card lists, so the pager and
  // empty state behave identically whichever tab is open.
  const pagingProps = {
    isLoading,
    page,
    onPageChange: setPage,
    totalRows: totalCount,
    pageSize: REFERRAL_PAGE_SIZE,
    emptyTitle: empty.title,
    emptyDescription: empty.description,
  };

  return (
    // gap-3 heading-to-content, then a wider gap before the table so the
    // analytics row and the table read as two surfaces without a divider.
    <section className="flex flex-col gap-3">
      <Heading level={2} size="md">
        Referral earnings
      </Heading>

      <ReferralSummaryCards summary={summary} />

      {/* One shared card — tabs, desktop table and mobile card list all
          inside the same bordered/rounded surface, the same structure
          ReceiptsTable uses for its own product tabs. DataTable and the card
          lists both drop their own border/radius (rounded-none border-0, and no
          extra wrapping div) so there's a single outer edge rather than a card
          nested inside a card. */}
      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
        <div className="scrollbar-none overflow-x-auto border-b border-border px-4 pt-3">
          <UnderlineTabs
            tabs={REFERRAL_STATUS_TABS}
            value={statusTab}
            onValueChange={onStatusTabChange}
          />
        </div>

        {/* Desktop (lg+): the full table, keeping its own Flux row spacing
            and hover state — just not its own border/radius, since the card
            above already supplies those.

            The card spans the full content width, while the columns keep their
            content-based widths: that is exactly what `tableLayout="content"`
            gives — each column sizes to its own content and a greedy, empty
            trailing column absorbs the leftover width so the table still fills
            the container.

            Its own empty state keeps the column headers in place, so an empty
            result still shows the shape of the data rather than a blank panel. */}
        {showRedeemed ? (
          <DataTable
            className="hidden rounded-none border-0 lg:block"
            columns={buildRedemptionColumns()}
            data={redemptionRows}
            rowKey={(row) => row.id}
            density="comfortable"
            tableLayout="content"
            footerSummary="count"
            footerCountLabels={{ singular: "redemption", plural: "redemptions" }}
            {...pagingProps}
          />
        ) : (
          <DataTable
            className="hidden rounded-none border-0 lg:block"
            columns={buildReferralColumns()}
            data={referralRows}
            rowKey={(row) => row.id}
            density="comfortable"
            tableLayout="content"
            footerSummary="count"
            footerCountLabels={{ singular: "referral", plural: "referrals" }}
            {...pagingProps}
          />
        )}

        {/* Tablet + mobile (below lg): the same page's rows as cards. */}
        {showRedeemed ? (
          <RedemptionCardList className="lg:hidden" rows={redemptionRows} {...pagingProps} />
        ) : (
          <ReferralCardList className="lg:hidden" rows={referralRows} {...pagingProps} />
        )}
      </div>
    </section>
  );
}
