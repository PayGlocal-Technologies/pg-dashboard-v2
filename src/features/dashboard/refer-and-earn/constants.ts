import type { IconName } from "@/components/icon";

export const REFERRAL_PAGE_SIZE = 10;

/** Which referrals the earnings table shows: every one, or only those whose
 *  reward has been fully waived against the merchant's MDR (status
 *  "WAIVED" — see types.ts's note on the lifecycle). */
export type ReferralStatusTab = "ALL" | "WAIVED";

export const REFERRAL_STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "WAIVED", label: "Waived" },
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
