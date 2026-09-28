"use client";

import { StaticLinkHero } from "@/features/dashboard/static-link/components/StaticLinkHero";
import { StaticLinkTransactions } from "@/features/dashboard/static-link/components/StaticLinkTransactions";
import { useStaticLink } from "@/features/dashboard/static-link/hooks";

/**
 * Static Link, at /static-link: one permanent, memorable link for the whole
 * business (pay.payglocal.in/@handle), where the customer enters the amount.
 * The link card leads the page in place of a page header, as designed, with
 * the payments made through it underneath.
 */
export function StaticLinkFeature() {
  const { url, host } = useStaticLink();
  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <StaticLinkHero url={url} host={host} />
      <StaticLinkTransactions />
    </div>
  );
}
