"use client";

import { useMemo } from "react";
import { Heading } from "@/components/ui";
import { ReferralHero } from "@/features/dashboard/refer-and-earn/components/ReferralHero";
// TEMPORARILY HIDDEN — Referral leaderboard.
//
// The component, its helpers (buildLeaderboardView), its types
// (LeaderboardEntry / ReferralStandings), and MOCK_LEADERBOARD all stay in the
// codebase untouched; only this page stops rendering it. To restore it, put
// these two imports back and un-comment the block in the grid below.
//
// import { ReferralLeaderboard } from "@/features/dashboard/refer-and-earn/components/ReferralLeaderboard";
import { ReferralTotalsCard } from "@/features/dashboard/refer-and-earn/components/ReferralTotalsCard";
import { ReferralJourneyCard } from "@/features/dashboard/refer-and-earn/components/ReferralJourneyCard";
import { ReferralEarnings } from "@/features/dashboard/refer-and-earn/components/ReferralEarnings";
import { buildReferralUrl } from "@/features/dashboard/refer-and-earn/constants";
import {
  mapTransactionsToReferrals,
  summarizeReferrals,
} from "@/features/dashboard/refer-and-earn/helpers";
import {
  useReferralLink,
  useReferralTransactions,
  useReferralWallet,
} from "@/features/dashboard/refer-and-earn/hooks";
// import { MOCK_LEADERBOARD } from "@/features/dashboard/refer-and-earn/mock-data";

// Wired to pg-dashboard's influencer service: the referral link, the reward
// wallet and the referral history all come from the real endpoints (see
// hooks.ts / services.ts). The leaderboard has no backend contract yet and
// stays hidden below.
export function ReferAndEarnFeature() {
  const { link } = useReferralLink();
  const { transactions, isLoading: transactionsLoading } = useReferralTransactions();
  const { wallet } = useReferralWallet();

  // Fall back to the bare referrals landing page until the merchant's link has
  // loaded, so the hero never renders an empty field.
  const referralUrl = link || buildReferralUrl();

  const referrals = useMemo(() => mapTransactionsToReferrals(transactions), [transactions]);

  // The analytics row and the totals card are both derived from this one pure
  // summary, so the two can never disagree, and ReferralEarnings keeps
  // computing its own over the same rows. The waived total is the one figure the
  // per-row feed can't carry, so it's taken from the wallet's withdrawn total.
  const summary = useMemo(() => {
    const base = summarizeReferrals(referrals);
    return wallet ? { ...base, totalWaived: Number(wallet.totalWithdrawn) || base.totalWaived } : base;
  }, [referrals, wallet]);

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

            <ReferralLeaderboard
              standings={MOCK_LEADERBOARD}
              currentEarned={summary.totalEarned}
              // Completed referrals are the ones that qualified, so they are
              // what the leaderboard's gap-to-#1 is measured in.
              currentReferralCount={summary.completed}
              currency={summary.earnedCurrency}
            />
        */}
      </div>

      <ReferralEarnings referrals={referrals} isLoading={transactionsLoading} />
    </div>
  );
}
