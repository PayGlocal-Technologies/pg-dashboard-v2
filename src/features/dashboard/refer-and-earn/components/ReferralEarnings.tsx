"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, Heading } from "@/components/ui";
import { buildReferralColumns } from "@/features/dashboard/refer-and-earn/columns";
import { REFERRAL_PAGE_SIZE } from "@/features/dashboard/refer-and-earn/constants";
import { summarizeReferrals } from "@/features/dashboard/refer-and-earn/helpers";
import { ReferralCardList } from "@/features/dashboard/refer-and-earn/components/ReferralCardList";
import { ReferralSummaryCards } from "@/features/dashboard/refer-and-earn/components/ReferralSummaryCards";
import type { Referral } from "@/features/dashboard/refer-and-earn/types";

const EMPTY_TITLE = "No referrals yet";
const EMPTY_DESCRIPTION =
  "Share your referral link to get started. Referrals appear here as soon as someone signs up with it.";

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

  const totalCount = referrals.length;
  const pageRows = referrals.slice((page - 1) * REFERRAL_PAGE_SIZE, page * REFERRAL_PAGE_SIZE);

  // Summarised over every referral, not just the visible page — these are
  // program totals, so they must not change as the table is paged.
  const summary = summarizeReferrals(referrals);

  return (
    // gap-3 heading-to-content, then a wider gap before the table so the
    // analytics row and the table read as two surfaces without a divider.
    <section className="flex flex-col gap-3">
      <Heading level={2} size="md">
        Referral earnings
      </Heading>

      <ReferralSummaryCards summary={summary} />

      {/* Desktop (lg+): the full table, keeping its own Flux surface, border,
          radius, header, row spacing, and hover state.

          The card spans the full content width, while the columns keep their
          content-based widths: that is exactly what `tableLayout="content"`
          gives — each column sizes to its own content and a greedy, empty
          trailing column absorbs the leftover width so the table still fills
          the container. So widening the surface changes nothing about the
          columns themselves.

          Its own empty state keeps the four column headers in place, so an empty
          result still shows the shape of the data rather than a blank panel. */}
      <DataTable
        className="mt-2 hidden lg:block"
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
        emptyTitle={EMPTY_TITLE}
        emptyDescription={EMPTY_DESCRIPTION}
        footerSummary="count"
        footerCountLabels={{ singular: "referral", plural: "referrals" }}
      />

      {/* Tablet + mobile (below lg): the same page's rows as cards. Full width
          here — hugging is a table concern, the cards are the mobile layout. */}
      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <ReferralCardList
          rows={pageRows}
          isLoading={isLoading}
          page={page}
          onPageChange={setPage}
          totalRows={totalCount}
          pageSize={REFERRAL_PAGE_SIZE}
          emptyTitle={EMPTY_TITLE}
          emptyDescription={EMPTY_DESCRIPTION}
          onRemind={handleRemind}
          remindedIds={remindedIds}
        />
      </div>
    </section>
  );
}
