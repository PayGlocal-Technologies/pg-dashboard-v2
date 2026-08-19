"use client";

import { useState } from "react";
import { DataTable, Heading } from "@/components/ui";
import { buildReferralColumns } from "@/features/dashboard/refer-and-earn/columns";
import { REFERRAL_PAGE_SIZE } from "@/features/dashboard/refer-and-earn/constants";
import { ReferralCardList } from "@/features/dashboard/refer-and-earn/components/ReferralCardList";
import type { Referral } from "@/features/dashboard/refer-and-earn/types";

const EMPTY_TITLE = "No referrals yet";
const EMPTY_DESCRIPTION =
  "Share your referral link to get started. Referrals appear here as soon as someone signs up with it.";

interface ReferralEarningsProps {
  referrals: Referral[];
  isLoading?: boolean;
}

/**
 * "Referral earnings" heading plus the earnings surface: the full table from lg
 * up, the card list below that — the same desktop/mobile pair the Clients, SKU,
 * and Transactions tables use.
 */
export function ReferralEarnings({ referrals, isLoading = false }: ReferralEarningsProps) {
  const [page, setPage] = useState(1);
  const columns = buildReferralColumns();

  const totalCount = referrals.length;
  const pageRows = referrals.slice((page - 1) * REFERRAL_PAGE_SIZE, page * REFERRAL_PAGE_SIZE);

  return (
    <section className="flex flex-col gap-3">
      <Heading level={2} size="md">
        Referral earnings
      </Heading>

      {/* One bordered surface holding both treatments, so the section reads as a
          single card at every width. The table drops its own border and radius
          to avoid doubling this wrapper's. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Desktop (lg+): the full table. Its own empty state keeps the four
            column headers in place, so an empty result still shows the shape of
            the data rather than a blank panel. */}
        <DataTable
          className="hidden rounded-none border-0 lg:block"
          columns={columns}
          data={pageRows}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          page={page}
          onPageChange={setPage}
          totalRows={totalCount}
          pageSize={REFERRAL_PAGE_SIZE}
          density="comfortable"
          tableLayout="fixed"
          emptyTitle={EMPTY_TITLE}
          emptyDescription={EMPTY_DESCRIPTION}
          footerSummary="count"
          footerCountLabels={{ singular: "referral", plural: "referrals" }}
        />

        {/* Tablet + mobile (below lg): the same page's rows as cards. */}
        <ReferralCardList
          className="lg:hidden"
          rows={pageRows}
          isLoading={isLoading}
          page={page}
          onPageChange={setPage}
          totalRows={totalCount}
          pageSize={REFERRAL_PAGE_SIZE}
          emptyTitle={EMPTY_TITLE}
          emptyDescription={EMPTY_DESCRIPTION}
        />
      </div>
    </section>
  );
}
