"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, Heading } from "@/components/ui";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { buildReferralColumns } from "@/features/dashboard/refer-and-earn/columns";
import {
  DEFAULT_REFERRAL_STATUS_TAB,
  REFERRAL_PAGE_SIZE,
  REFERRAL_STATUS_TABS,
  type ReferralStatusTab,
} from "@/features/dashboard/refer-and-earn/constants";
import { summarizeReferrals } from "@/features/dashboard/refer-and-earn/helpers";
import { ReferralCardList } from "@/features/dashboard/refer-and-earn/components/ReferralCardList";
import { ReferralSummaryCards } from "@/features/dashboard/refer-and-earn/components/ReferralSummaryCards";
import type { Referral } from "@/features/dashboard/refer-and-earn/types";

const EMPTY_STATE: Record<ReferralStatusTab, { title: string; description: string }> = {
  ALL: {
    title: "No referrals yet",
    description:
      "Share your referral link to get started. Referrals appear here as soon as someone signs up with it.",
  },
  WAIVED: {
    title: "No waived referrals yet",
    description: "Referrals appear here once their reward has been fully waived against your fees.",
  },
};

interface ReferralEarningsProps {
  referrals: Referral[];
  isLoading?: boolean;
}

/**
 * "Referral earnings" heading, the analytics row, then the earnings surface: the
 * full table from lg up, the card list below that — the same desktop/mobile pair
 * the Clients, SKU, and Transactions tables use.
 */
export function ReferralEarnings({ referrals, isLoading = false }: ReferralEarningsProps) {
  const [page, setPage] = useState(1);

  // Which of the two tabs is active. Filters the table/card list only —
  // ReferralSummaryCards above stays summarised over every referral, since
  // those are program totals rather than a view of this one tab.
  const [statusTab, setStatusTab] = useState<ReferralStatusTab>(DEFAULT_REFERRAL_STATUS_TAB);

  const onStatusTabChange = (value: string) => {
    setStatusTab(value as ReferralStatusTab);
    // Switching tabs changes what matches, so it returns to page 1 the same
    // way every other filter on this page does — otherwise a merchant on
    // page 2 of "All" could land on an empty page of "Waived".
    setPage(1);
  };

  // Which rows have been nudged. Held here rather than inside each button so it
  // survives paging and is shared by the table and the card list — the same
  // referral cannot read "Remind" in one layout and "Sent" in the other. A Set
  // of ids, so a row keeps its state wherever it lands on the page.
  const [remindedIds, setRemindedIds] = useState<ReadonlySet<string>>(() => new Set());

  function handleRemind(row: Referral) {
    // TODO(integration): call the referral reminder endpoint here once that
    // contract exists, and drive both the sent state and the toast off its
    // response instead of assuming it. The real endpoint is also where a resend
    // cooldown would come from — until then a row stays "Sent" for the session,
    // which is the conservative side to be on for an email nudge.
    setRemindedIds((prev) => new Set(prev).add(row.id));
    toast.success("Reminder sent", {
      description: `We've nudged ${row.fullName} to finish setting up their account.`,
    });
  }

  const columns = buildReferralColumns({ onRemind: handleRemind, remindedIds });

  // "Waived" narrows to referrals whose reward has been fully drawn down
  // (status "WAIVED" — see types.ts); "All" is every referral, unfiltered.
  const visibleReferrals = useMemo(
    () => (statusTab === "WAIVED" ? referrals.filter((r) => r.status === "WAIVED") : referrals),
    [referrals, statusTab]
  );

  const totalCount = visibleReferrals.length;
  const pageRows = visibleReferrals.slice(
    (page - 1) * REFERRAL_PAGE_SIZE,
    page * REFERRAL_PAGE_SIZE
  );

  // Summarised over every referral, not just the visible page — these are
  // program totals, so they must not change as the table is paged or filtered
  // by tab.
  const summary = summarizeReferrals(referrals);

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
          ReceiptsTable uses for its own product tabs. DataTable and
          ReferralCardList both drop their own border/radius (rounded-none
          border-0, and no extra wrapping div) so there's a single outer edge
          rather than a card nested inside a card. */}
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
            the container. So widening the surface changes nothing about the
            columns themselves.

            Its own empty state keeps the four column headers in place, so an empty
            result still shows the shape of the data rather than a blank panel. */}
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
          tableLayout="content"
          emptyTitle={EMPTY_STATE[statusTab].title}
          emptyDescription={EMPTY_STATE[statusTab].description}
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
          emptyTitle={EMPTY_STATE[statusTab].title}
          emptyDescription={EMPTY_STATE[statusTab].description}
          onRemind={handleRemind}
          remindedIds={remindedIds}
        />
      </div>
    </section>
  );
}
