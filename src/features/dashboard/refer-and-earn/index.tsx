"use client";

import { useMemo } from "react";
import { Heading } from "@/components/ui";
import { ReferralHero } from "@/features/dashboard/refer-and-earn/components/ReferralHero";
// TEMPORARILY HIDDEN — Referral leaderboard.
//
// The component, its helper (buildLeaderboardView) and its types
// (LeaderboardEntry / ReferralStandings) all stay in the codebase; only this
// page stops rendering it. To restore it, put the import below back and
// un-comment the block in the grid further down.
//
// It also needs a source of standings. There is no leaderboard endpoint, and
// the placeholder standings it used to read are gone with mock-data.ts, so
// restoring it means wiring a real one — not just un-commenting.
//
// import { ReferralLeaderboard } from "@/features/dashboard/refer-and-earn/components/ReferralLeaderboard";
import { ReferralTotalsCard } from "@/features/dashboard/refer-and-earn/components/ReferralTotalsCard";
import { ReferralJourneyCard } from "@/features/dashboard/refer-and-earn/components/ReferralJourneyCard";
import { ReferralEarnings } from "@/features/dashboard/refer-and-earn/components/ReferralEarnings";
import { buildReferralUrl } from "@/features/dashboard/refer-and-earn/constants";
import {
  mapTransactionsToRedemptions,
  mapTransactionsToReferrals,
  summarizeWallet,
} from "@/features/dashboard/refer-and-earn/helpers";
import {
  useReferralLink,
  useReferralTransactions,
  useReferralWallet,
} from "@/features/dashboard/refer-and-earn/hooks";

// Wired to pg-dashboard's influencer service (see hooks.ts / services.ts). Two
// endpoints, with one job each and no overlap between them:
//
//   get-wallet    → every figure on the page. The Total earned card, the three
//                   funnel bars, the waived card.
//   transactions  → the rows of the table below, and nothing else.
//
// The split is deliberate. The feed holds one row per reward already minted, so
// it cannot answer what the analytics ask: a referral who signed up and has not
// transacted has no row in it at all, and a merchant with more history than one
// page would have their totals quietly truncated. The wallet states all of it
// outright, so nothing is derived from the rows and there is nothing to
// reconcile between the two.
//
// The leaderboard has no backend contract and stays hidden below.
export function ReferAndEarnFeature() {
  const { link } = useReferralLink();
  const { transactions, isLoading: transactionsLoading } = useReferralTransactions();
  const { wallet } = useReferralWallet();

  // Fall back to the bare referrals landing page until the merchant's link has
  // loaded, so the hero never renders an empty field.
  const referralUrl = link || buildReferralUrl();

  // The one transactions feed carries both halves of the programme: the referral
  // credits, one per referred merchant, and the debits where reward money has
  // already come off the merchant's fees. They are different shapes and get
  // their own tab, so they are mapped apart here rather than filtered later.
  const referrals = useMemo(() => mapTransactionsToReferrals(transactions), [transactions]);
  const redemptions = useMemo(() => mapTransactionsToRedemptions(transactions), [transactions]);

  // One summary for the whole page, straight off the wallet: the totals card
  // beside the hero and the analytics row above the table both read this object,
  // so the two cannot disagree.
  const summary = useMemo(() => summarizeWallet(wallet), [wallet]);

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-6 overflow-x-hidden lg:space-y-8">
      {/* Hero and the right-hand column share one row: the column is a
          controlled width and the hero takes the remainder.

          The row's height is whichever side's own content is taller — there is
          no height rule on either side beyond the stretch below, so when the
          hero's banner grows with the viewport, or the column grows because its
          two pieces together need more room, the row simply follows.

          Stacked below md each side sits in its own auto row, so both keep
          their natural height and the stretch relationship does not apply. */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem] md:items-stretch lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
        <ReferralHero referralUrl={referralUrl} />

        {/* Two independent pieces, stacked: the Total Earned card, and the
            How-it-works heading with its own card. Each hugs only its own
            content, and so does the column around them — it is not given a
            height of its own to fill, so the two cards sit at a fixed,
            intentional `gap-6`/`gap-8` apart regardless of how tall the hero
            beside them gets. The grid's `items-stretch` still stretches this
            column's own box to the row height on wider screens, the same as
            any grid item, but with nothing inside asking for that height the
            two cards simply keep their own and the rest of the row is blank —
            a shorter sidebar beside a taller hero, not a gap forced open
            between two cards that belong together. */}
        <div className="flex flex-col gap-6 lg:gap-8">
          <ReferralTotalsCard summary={summary} />

          <div className="flex flex-col gap-3">
            <Heading level={2} size="md">
              How it works
            </Heading>
            <ReferralJourneyCard />
          </div>
        </div>

        {/* TEMPORARILY HIDDEN — Referral leaderboard. Restore by adding it as a
            third piece in the column above, and giving the column back the
            `md:h-full` it had before this card split in two, so the
            leaderboard's own `md:grow` has a stretched height to grow into —
            the same arrangement that worked before the leaderboard was
            hidden.

            `standings` needs a real source — see the note beside the import.

            <ReferralLeaderboard
              standings={standings}
              currentEarned={summary.totalEarned}
              // Completed referrals are the ones that qualified, so they are
              // what the leaderboard's gap-to-#1 is measured in.
              currentReferralCount={summary.completed}
              currency={summary.earnedCurrency}
            />
        */}
      </div>

      <ReferralEarnings
        referrals={referrals}
        redemptions={redemptions}
        summary={summary}
        isLoading={transactionsLoading}
      />
    </div>
  );
}
