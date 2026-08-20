"use client";

import { ReferralHero } from "@/features/dashboard/refer-and-earn/components/ReferralHero";
import { HowItWorks } from "@/features/dashboard/refer-and-earn/components/HowItWorks";
import { ReferralLeaderboard } from "@/features/dashboard/refer-and-earn/components/ReferralLeaderboard";
import { ReferralEarnings } from "@/features/dashboard/refer-and-earn/components/ReferralEarnings";
import { buildReferralUrl } from "@/features/dashboard/refer-and-earn/constants";
import { summarizeReferrals } from "@/features/dashboard/refer-and-earn/helpers";
import {
  MOCK_CURRENT_LEAGUE,
  MOCK_LEAGUE_LEADERBOARDS,
  MOCK_REFERRALS,
} from "@/features/dashboard/refer-and-earn/mock-data";

// TODO(integration): this screen still reads from mock data. Wire it up to the
// real referral program endpoints (referral code, reward balance, referral
// history, league standings) once that contract exists — see CLAUDE.md's
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
      {/* Hero and leaderboard are two separate cards sharing one row. The
          leaderboard column is a controlled width and the hero takes the
          remainder; rows stretch, so the two cards match heights and align at
          the top. Stacked below md, leaderboard full width. */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
        <ReferralHero referralUrl={referralUrl} />
        <ReferralLeaderboard
          leaderboards={MOCK_LEAGUE_LEADERBOARDS}
          currentLeague={MOCK_CURRENT_LEAGUE}
          currentEarned={summary.totalEarned}
          // Completed referrals are the ones that qualified, so they are what the
          // leaderboard's gap-to-#1 is measured in.
          currentReferralCount={summary.completed}
          currency={summary.earnedCurrency}
        />
      </div>

      <HowItWorks />
      <ReferralEarnings referrals={MOCK_REFERRALS} />
    </div>
  );
}
