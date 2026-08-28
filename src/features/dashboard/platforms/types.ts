import type { IconName } from "@/components/icon";

/** One numbered instruction in a platform's connection walkthrough. */
export interface PlatformStep {
  /** The instruction itself, e.g. "Log in to your Upwork account". */
  instruction: string;
  /**
   * A caveat shown under the instruction, prefixed "Note:" — something the
   * platform may ask for that isn't part of the step itself. pg-dashboard
   * carries the same field on its own step data and renders it the same way;
   * only Upwork's last step has one.
   */
  note?: string;
  /**
   * Screenshot for this step. Left undefined until the assets are supplied —
   * the step then renders an empty surface of the same dimensions, so dropping
   * a real screenshot in later is a data change, not a layout change.
   */
  screenshotSrc?: string;
  /** Alt text for `screenshotSrc`. Required once a screenshot exists. */
  screenshotAlt?: string;
  /**
   * Whether this step carries a Quick Access panel — the account's own
   * identifiers, each with a copy action, sat between the instruction and the
   * screenshot.
   *
   * Set it on the one step that asks the merchant to type those identifiers
   * into the platform, so the values are under the instruction that needs them
   * rather than somewhere else on the page.
   */
  quickAccess?: boolean;
}

/** A document card in the sidebar's "Documents you might need" list. */
export interface PlatformDocument {
  /** Small caption above the title, e.g. "Last 3 months" or the platform name. */
  caption: string;
  title: string;
  /** Registry icon for the row's action button. */
  actionIcon: IconName;
  /** Accessible name for that button — the caption/title alone aren't enough. */
  actionLabel: string;
  /**
   * Whether the row's action opens the settlement statement form instead of
   * downloading something directly. The Platforms page opens that form in a
   * drawer; rows without it keep the placeholder toast until their endpoint
   * exists.
   */
  opensSettlementForm?: boolean;
}

/**
 * One storefront a platform runs, e.g. Amazon.com or Amazon.de.
 *
 * Deliberately not the same list as `accountCurrencies`: several storefronts
 * settle into one receiving account (Amazon.de, .fr, .it, .es and .nl all pay
 * into the euro account), so a marketplace is its own choice that *resolves* to
 * an account rather than being one. Selecting a marketplace is what scopes the
 * account details, the Quick Access values and the settlement form beneath it.
 */
export interface PlatformMarketplace {
  /**
   * The storefront's real domain, e.g. "amazon.co.uk" — the option's value in
   * code, not just its label. Verified against Amazon's published marketplace
   * list; re-check when adding entries, since Amazon does add storefronts.
   */
  domain: string;
  /**
   * The country the storefront serves, e.g. "Germany". Not displayed — the
   * selector shows the domain alone — but kept as the match key
   * `marketplaceForAccount` uses to map a legacy country selection onto its
   * storefront.
   */
  label: string;
  /** ISO 3166-1 alpha-2 for that country, which drives the flag beside it. */
  iso2: string;
  /**
   * Currency the storefront settles into, matched against the merchant's real
   * accounts the same way `accountCurrencies` is. A storefront whose currency
   * the merchant holds no account for is dropped from the selector rather than
   * offered as an option that resolves to nothing.
   */
  currency: string;
  /**
   * Group header this entry sits under, e.g. "Europe". Entries with no group
   * are offered flat at the top of the list, above every group.
   */
  group?: string;
}

/** A payout platform a merchant can point a PayGlocal virtual account at. */
export interface Platform {
  /** Stable key — also the selected-row identity and the tutorial's remount key. */
  id: string;
  name: string;
  /** Registry icon name for the platform's brand mark. */
  logo: IconName;
  /**
   * Raster brand mark under `public/assets/Platform`, 3:2.
   *
   * The icon registry is the rule for SVG brand assets (see CLAUDE.md), and
   * `logo` above is that entry. These are supplied as PNGs, which can't be a
   * `forwardRef` SVG component, so they're served from `public` through
   * `next/image` instead — the documented exception rather than a second way
   * of doing the same thing. Swap this for the registry mark if SVG versions
   * ever arrive.
   */
  logoSrc: string;
  /**
   * Currencies this platform can pay out to, in the order the currency selector
   * should offer them. Matched against the merchant's real Amazon-bucket
   * accounts (see accountsForPlatform), so the details shown here are the same
   * ones the accounts endpoint returns rather than a second copy that can drift.
   *
   * A currency the merchant holds no account for is dropped rather than
   * rendered as an empty option — which is also why currencies the accounts
   * endpoint doesn't bucket yet (AED, SGD) can safely stay listed.
   */
  accountCurrencies: string[];
  /**
   * The platform's storefronts, in the order the selector should offer them.
   *
   * Present only where payout setup genuinely differs per storefront — Amazon,
   * today. A platform without them keeps the plain currency selector, which
   * reads off `accountCurrencies` above.
   */
  marketplaces?: PlatformMarketplace[];
  /** The numbered walkthrough, in order. */
  steps: PlatformStep[];
  /**
   * Statements this platform may ask the merchant for, shown as an aside beside
   * the walkthrough. Optional, and in practice Amazon-only: pg-dashboard gates
   * the whole column on `resolvedSelectedPlatform === "amazon"` (Platforms.tsx),
   * and its second card is an Amazon account statement specifically. A platform
   * with no documents renders no column, and the walkthrough takes the full
   * width instead.
   */
  documents?: PlatformDocument[];
}

/** Body of the request-a-platform submission. One free-text field, matching
 *  pg-dashboard's own payload. */
export interface RequestPlatformRequest {
  platformRequestMessage: string;
}

export interface RequestPlatformResponse {
  message?: string;
}
