"use client";

import { ReferralHero } from "@/features/dashboard/refer-and-earn/components/ReferralHero";
import { HowItWorks } from "@/features/dashboard/refer-and-earn/components/HowItWorks";
import { ReferralEarnings } from "@/features/dashboard/refer-and-earn/components/ReferralEarnings";
import { buildReferralUrl } from "@/features/dashboard/refer-and-earn/constants";
import { MOCK_REFERRALS } from "@/features/dashboard/refer-and-earn/mock-data";

// TODO(integration): this screen still reads from mock data. Wire it up to the
// real referral program endpoints (referral code, reward balance, referral
// history) once that contract exists — see CLAUDE.md's migration checklist. The
// referral code that buildReferralUrl takes comes from the same contract.
export function ReferAndEarnFeature() {
  const referralUrl = buildReferralUrl();

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-6 overflow-x-hidden lg:space-y-8">
      <ReferralHero referralUrl={referralUrl} />
      <HowItWorks />
      <ReferralEarnings referrals={MOCK_REFERRALS} />
    </div>
  );
}
