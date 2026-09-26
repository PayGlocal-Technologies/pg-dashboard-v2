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
          controlled width and the hero takes the remainder. `md:items-stretch`
          matches the shorter side's card to the taller one's height, so
          their bottom edges align.

          Three earlier attempts at this broke the image itself: stretching
          the image box directly — via `h-full` on an `absolute`-overlaid
          image, via a `max-h-*` cap fighting `w-full`, via `grow` on the
          plain stacked layout — always risked the box's rendered ratio
          drifting from the source image's real ratio, which forces
          object-cover to crop unevenly and reads as the image visibly
          distorting. This time the image is never touched: ReferralHero's
          own trailing spacer (see its comment) is what grows to absorb the
          extra height, the same "extra space collects as blank room, not
          distortion" technique already used below for this column when
          roles are reversed. */}
      {/* Proportional columns (~62/38), not a fixed-rem sidebar: with a fixed
          sidebar the hero column grows with the viewport, so its image grows
          taller and the two sides drift apart in height. Keeping the ratio
          fixed keeps both sides scaling together, matching the design. */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.63fr)_minmax(0,1fr)] md:items-stretch lg:gap-6">
        <ReferralHero referralUrl={referralUrl} />

        {/* Two independent pieces, stacked: the Total Earned card, and the
            How-it-works heading with its own card. Each hugs only its own
            content, at a fixed, intentional `gap-6`/`gap-8` apart, and so
            does this column around them. */}
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
