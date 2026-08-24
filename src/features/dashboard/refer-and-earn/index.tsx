"use client";

import { ReferralHero } from "@/features/dashboard/refer-and-earn/components/ReferralHero";
import { HowItWorks } from "@/features/dashboard/refer-and-earn/components/HowItWorks";
// TEMPORARILY HIDDEN — Referral leaderboard.
//
// The component, its helpers (buildLeaderboardView), its types
// (LeaderboardEntry / ReferralStandings), and MOCK_LEADERBOARD all stay in the
// codebase untouched; only this page stops rendering it. To restore it, put
// these two imports back and un-comment the block in the grid below.
//
// import { ReferralLeaderboard } from "@/features/dashboard/refer-and-earn/components/ReferralLeaderboard";
import { ReferralTotalsCard } from "@/features/dashboard/refer-and-earn/components/ReferralTotalsCard";
import { ReferralEarnings } from "@/features/dashboard/refer-and-earn/components/ReferralEarnings";
import { buildReferralUrl } from "@/features/dashboard/refer-and-earn/constants";
import { summarizeReferrals } from "@/features/dashboard/refer-and-earn/helpers";
// import { MOCK_LEADERBOARD } from "@/features/dashboard/refer-and-earn/mock-data";
import { MOCK_REFERRALS } from "@/features/dashboard/refer-and-earn/mock-data";

// TODO(integration): this screen still reads from mock data. Wire it up to the
// real referral program endpoints (referral code, reward balance, referral
// history, leaderboard standings) once that contract exists — see CLAUDE.md's
// migration checklist. The referral code that buildReferralUrl takes comes from
// the same contract.
export function ReferAndEarnFeature() {
  const referralUrl = buildReferralUrl();

  // The analytics row and the totals card are both derived from this one pure
  // summary, so the two can never disagree, and ReferralEarnings keeps
  // computing its own over the same rows.
  const summary = summarizeReferrals(MOCK_REFERRALS);

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-6 overflow-x-hidden lg:space-y-8">
      {/* Hero and totals are two cards sharing one row: the totals column is a
          controlled width and the hero takes the remainder.

          The row's height is the hero's. It is the only item with content tall
          enough to size the implicit `auto` track — the totals card has no
          height of its own from md up (see its `md:aspect-auto`), so nothing
          pushes back — and `items-stretch` is what then pulls the totals card up
          to that same height. No pixel height is named on either side, so when
          the hero's banner grows with the viewport the totals card follows it.

          Stacked below md each card sits in its own auto row, so both keep their
          natural height and the stretch relationship does not apply. */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem] md:items-stretch lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
        <ReferralHero referralUrl={referralUrl} />

        {/* The totals card is the grid item itself rather than sitting inside a
            column wrapper — with the leaderboard hidden there is nothing to
            stack it against, and a wrapper would be an empty placeholder that
            takes the stretch instead of passing it down. */}
        <ReferralTotalsCard summary={summary} />

        {/* TEMPORARILY HIDDEN — Referral leaderboard. Restore by wrapping this
            card and the totals card above in a `flex flex-col gap-4 lg:gap-6`
            column, so the pair shares the stretched row height between them
            again, and by dropping the totals card's `md:h-full`.

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

      <HowItWorks />
      <ReferralEarnings referrals={MOCK_REFERRALS} />
    </div>
  );
}
