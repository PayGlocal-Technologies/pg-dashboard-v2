import type { IconName } from "@/components/icon";

export const REFERRAL_PAGE_SIZE = 10;

/**
 * The worked example inside the "Total waived" tooltip.
 *
 * Illustrative figures, not the merchant's own — the card is explaining the
 * mechanic, so it is labelled "Example" and every number in it is part of that
 * example. Showing the real waived total there instead was what made the card
 * unreadable: a lone discount line with nothing to subtract it from, reading
 * −$0.00 for any merchant who has not been waived yet.
 *
 * `fee` is deliberately larger than `reward` so the example shows a reward
 * covering most of a fee rather than all of it, which is the case a merchant
 * actually needs explained. GST follows the same rule the settlement breakdown
 * applies: 18% of the fee *after* the discount, never before.
 */
export const MDR_WAIVER_EXAMPLE = {
  /** A transaction's MDR before any referral reward is applied. */
  fee: 40,
  /** Reward drawn from the wallet against that fee. */
  reward: 30,
  gstRate: 0.18,
} as const;

/**
 * The two halves of the influencer transactions feed, which is what the tabs
 * actually switch between — not two filters over one list.
 *
 * "ALL" is the referral CREDITs, one row per referred merchant. "REDEEMED" is
 * the DEBITs, each a slice of the reward wallet already applied against the
 * merchant's fees. The two carry different columns because they are different
 * things; pg-dashboard splits the same response the same way.
 *
 * This replaced a "Waived" tab that filtered referrals on a `WAIVED` row status.
 * No endpoint ever emits that status — a redemption cannot be attributed to the
 * referral that funded it — so that tab could only ever render empty.
 */
export type ReferralStatusTab = "ALL" | "REDEEMED";

export const REFERRAL_STATUS_TABS = [
  { value: "ALL", label: "Your referrals" },
  { value: "REDEEMED", label: "Redeemed" },
] as const satisfies readonly { value: ReferralStatusTab; label: string }[];

export const DEFAULT_REFERRAL_STATUS_TAB: ReferralStatusTab = "ALL";

/**
 * Hero banner, served from `public/assets`. A raster asset, so it cannot be an
 * icon-registry entry (that pattern is for SVG forwardRef components) and goes
 * through `next/image` instead — see CLAUDE.md's Images rule.
 *
 * `width`/`height` are the file's real pixel dimensions, handed to next/image as
 * the intrinsic size only: the rendered size comes from CSS, and these keep the
 * 1.75:1 aspect ratio correct and reserve the right space before it loads. The
 * banner is what states the $30 reward, which is why the heading beside it does
 * not repeat the figure.
 */
export const REFERRAL_HERO_BANNER = {
  src: "/assets/Refer&Earn.png",
  width: 1660,
  height: 948,
} as const;

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
