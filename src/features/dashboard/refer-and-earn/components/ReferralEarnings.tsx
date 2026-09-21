"use client";

import { useState } from "react";
import { DataCardList, DataTableCard, Heading } from "@/components/ui";
import { PlaceholderState } from "@/components/common/PlaceholderState";
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
  RedemptionCard,
  ReferralCard,
  ReferralCardSkeleton,
} from "@/features/dashboard/refer-and-earn/components/ReferralCardList";
import { ReferralSummaryCards } from "@/features/dashboard/refer-and-earn/components/ReferralSummaryCards";
import type { Referral, ReferralRedemption } from "@/features/dashboard/refer-and-earn/types";

const EMPTY_STATE: Record<ReferralStatusTab, { title: string; description: string }> = {
  ALL: {
    title: "Refer a business and earn",
    description:
      "Share your referral link — every business that signs up with it is listed here, along with what you've earned.",
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

  const tableProps = {
    isLoading,
    emptyTitle: empty.title,
    emptyDescription: empty.description,
  };
  const tablePaging = {
    mode: "page",
    page,
    pageSize: REFERRAL_PAGE_SIZE,
    total: totalCount,
    onPageChange: setPage,
  } as const;

  // The card lists take the same pagination object as the tables, so the two
  // surfaces cannot disagree about which page they are on.
  const cardListProps = {
    ...tableProps,
    pagination: tablePaging,
    emptyState: (
      <PlaceholderState
        variant="no-data"
        size="sm"
        title={empty.title}
        description={empty.description}
      />
    ),
    renderSkeleton: () => <ReferralCardSkeleton />,
  };

  // Mounted on both surfaces; only one is visible at a time.
  const tabBar = (
    <UnderlineTabs
      tabs={REFERRAL_STATUS_TABS}
      value={statusTab}
      onValueChange={onStatusTabChange}
    />
  );

  return (
    // gap-3 heading-to-content, then a wider gap before the table so the
    // analytics row and the table read as two surfaces without a divider.
    <section className="flex flex-col gap-3">
      <Heading level={2} size="md">
        Referral earnings
      </Heading>

      <ReferralSummaryCards summary={summary} />

      {/* Tabs, desktop table and mobile card list on one bordered surface per
          breakpoint. Both are mounted and CSS shows one, so a resize across lg
          keeps the open tab and the page in hand.

          The card spans the full content width while the columns keep their
          content-based widths: that is what `tableLayout="content"` gives —
          each column sizes to its own content and a greedy, empty trailing
          column absorbs the leftover width so the table still fills the
          container. */}
      {showRedeemed ? (
        <DataTableCard<ReferralRedemption>
          className="mt-2 hidden lg:block"
          tabs={tabBar}
          columns={buildRedemptionColumns()}
          data={redemptionRows}
          rowKey={(row) => row.id}
          density="comfortable"
          pagination={{
            ...tablePaging,
            summary: "count",
            countLabels: { singular: "redemption", plural: "redemptions" },
          }}
          maxBodyHeight="none"
          {...tableProps}
        />
      ) : (
        <DataTableCard<Referral>
          className="mt-2 hidden lg:block"
          tabs={tabBar}
          columns={buildReferralColumns()}
          data={referralRows}
          rowKey={(row) => row.id}
          density="comfortable"
          pagination={{
            ...tablePaging,
            summary: "count",
            countLabels: { singular: "referral", plural: "referrals" },
          }}
          maxBodyHeight="none"
          {...tableProps}
        />
      )}

      {/* Tablet + mobile (below lg): the same page's rows as cards. */}
      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <div className="scrollbar-none overflow-x-auto border-b border-border px-4 pt-3">
          {tabBar}
        </div>
        {showRedeemed ? (
          <DataCardList<ReferralRedemption>
            bordered={false}
            rows={redemptionRows}
            rowKey={(row) => row.id}
            renderCard={(row) => <RedemptionCard row={row} />}
            {...cardListProps}
          />
        ) : (
          <DataCardList<Referral>
            bordered={false}
            rows={referralRows}
            rowKey={(row) => row.id}
            renderCard={(row) => <ReferralCard row={row} />}
            {...cardListProps}
          />
        )}
      </div>
    </section>
  );
}
