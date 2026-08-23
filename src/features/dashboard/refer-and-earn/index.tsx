"use client";

import { ReferralHero } from "@/features/dashboard/refer-and-earn/components/ReferralHero";
import { HowItWorks } from "@/features/dashboard/refer-and-earn/components/HowItWorks";
import { ReferralLeaderboard } from "@/features/dashboard/refer-and-earn/components/ReferralLeaderboard";
import { ReferralTotalsCard } from "@/features/dashboard/refer-and-earn/components/ReferralTotalsCard";
import { ReferralEarnings } from "@/features/dashboard/refer-and-earn/components/ReferralEarnings";
import { buildReferralUrl } from "@/features/dashboard/refer-and-earn/constants";
import { summarizeReferrals } from "@/features/dashboard/refer-and-earn/helpers";
import { MOCK_LEADERBOARD, MOCK_REFERRALS } from "@/features/dashboard/refer-and-earn/mock-data";

// TODO(integration): this screen still reads from mock data. Wire it up to the
// real referral program endpoints (referral code, reward balance, referral
// history, leaderboard standings) once that contract exists — see CLAUDE.md's
// migration checklist. The referral code that buildReferralUrl takes comes from
// the same contract.
export function ReferAndEarnFeature() {
  const referralUrl = buildReferralUrl();

  // The leaderboard's "You" row is scored on the merchant's earned total, so it
  // comes from the same pure summary the analytics row derives its figures from —
  // the two can never disagree, and ReferralEarnings keeps computing its own.
  const summary = summarizeReferrals(MOCK_REFERRALS);

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-6 overflow-x-hidden lg:space-y-8">
      {/* Hero and leaderboard are two separate cards sharing one row: the
          leaderboard column is a controlled width and the hero takes the
          remainder.

          Equal heights come from the row, not from the cards. The row is an
          implicit `auto` track, so it sizes to the content of whichever card
          needs the most height — the leaderboard, since its rows are what
          actually vary — and grid's `items-stretch` is what then pulls the
          other card up to that same height. Neither card declares a height of
          its own: no pixel value and no `h-full` to resolve against, so when
          the standings return more or fewer rows the shared height follows on
          its own with nothing to update here.

          Stacked below md each card sits in its own auto row, so both keep
          their natural height and the equal-height relationship does not
          apply. */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem] md:items-stretch lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
        <ReferralHero referralUrl={referralUrl} />

        {/* Right column: the running totals above the board. Deliberately no
            `self-start` — that is `align-self: start`, which opts a grid item out
            of stretching, and it is what used to leave this column at its own
            height while the hero's banner grew with the viewport. Stretched, the
            column takes the row height, the leaderboard grows into whatever the
            totals card leaves (its own `md:grow`), and the board's scroll viewport
            takes the rest. No height is named anywhere in that chain.

            Stacked below md the row holds this column alone, so it is its natural
            height and nothing is forced to match. */}
        <div className="flex flex-col gap-4 lg:gap-6">
          <ReferralTotalsCard summary={summary} />
          <ReferralLeaderboard
            standings={MOCK_LEADERBOARD}
            currentEarned={summary.totalEarned}
            // Completed referrals are the ones that qualified, so they are what
            // the leaderboard's gap-to-#1 is measured in.
            currentReferralCount={summary.completed}
            currency={summary.earnedCurrency}
          />
        </div>
      </div>

      <HowItWorks />
      <ReferralEarnings referrals={MOCK_REFERRALS} />
    </div>
  );
}
