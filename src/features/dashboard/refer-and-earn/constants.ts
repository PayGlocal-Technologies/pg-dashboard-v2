import type { IconName } from "@/components/icon";

/**
 * Reward headline. A literal (not a formatCurrency call) because it is display
 * copy in a heading, not a data value — the per-referral amounts in the
 * earnings table are the ones that go through the currency formatter.
 */
export const REFERRAL_REWARD_LABEL = "$30";

export const REFERRAL_PAGE_SIZE = 10;

/**
 * Dashboard origin per environment, built the same way as the CDN URL in
 * `@/features/auth/helpers` — UAT has moved to pygcl.com, dev/test/prod stay
 * on payglocal.in. Derived from NEXT_PUBLIC_ENV rather than
 * `window.location.origin` so the server and client render the same string and
 * the link needs no effect to fill in after hydration.
 */
function dashboardOrigin(): string {
  const env = process.env.NEXT_PUBLIC_ENV;
  if (env === "prod") return "https://dashboard.payglocal.in";
  const domain = env === "uat" ? "pygcl.com" : "payglocal.in";
  return `https://${env ?? "dev"}.dashboard.${domain}`;
}

/**
 * Builds the shareable referral URL.
 *
 * TODO(integration): `code` is the merchant's own referral code, which comes
 * from the referral program endpoint. That contract does not exist yet, so the
 * screen calls this with no code and the link is the bare referrals landing
 * page. Do not substitute the MID for the code — it must not travel in a URL
 * the merchant shares with third parties.
 */
export function buildReferralUrl(code?: string): string {
  const base = `${dashboardOrigin()}/app/referrals`;
  return code ? `${base}?ref=${encodeURIComponent(code)}` : base;
}

export interface ReferralStep {
  icon: IconName;
  title: string;
  description: string;
}

export const REFERRAL_STEPS: ReferralStep[] = [
  {
    icon: "share-2",
    title: "Copy and share your referral link",
    description: "Copy your unique referral link and share it with your contacts.",
  },
  {
    icon: "user-plus",
    title: "They activate their account",
    description: "Your referral activates their PayGlocal account.",
  },
  {
    icon: "gift",
    title: "They transact. You earn!",
    description: "When they complete a transaction, you earn your referral reward.",
  },
];
