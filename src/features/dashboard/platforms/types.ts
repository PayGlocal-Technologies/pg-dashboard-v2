import type { IconName } from "@/components/icon";

/** One numbered instruction in a platform's connection walkthrough. */
export interface PlatformStep {
  /** The instruction itself, e.g. "Log in to your Upwork account". */
  instruction: string;
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
   * rather than somewhere else on the page. Platforms v1 reads this; the
   * sidebar-layout Platforms page carries its own Quick Access strip above the
   * whole walkthrough and ignores it.
   */
  quickAccess?: boolean;
}

/**
 * One storefront a platform runs, e.g. Amazon.com or Amazon.co.uk.
 *
 * Deliberately not the same list as `accountIds`: several storefronts can pay
 * into one receiving account (Amazon.de, .fr, .it and .es all settle to the
 * euro account), so a marketplace is its own choice that *resolves* to an
 * account rather than being one. Selecting a marketplace is what scopes the
 * account details and the walkthrough beneath it.
 */
export interface PlatformMarketplace {
  /** Stable key — the Select's option value and the selected-row identity. */
  id: string;
  /** What the option and the trigger read, e.g. "Amazon.co.uk". */
  label: string;
  /** Which of the platform's `accountIds` this storefront settles into. */
  accountId: string;
  /**
   * ISO 3166-1 alpha-2 for the storefront's own country, which drives the flag
   * beside the option. The storefront's country, not the account's: the four
   * euro-settling Amazon marketplaces each show their own flag rather than
   * four identical EU ones.
   */
  iso2: string;
}

/** A document card in the "Documents you might need" row. */
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
   * downloading something directly. Platforms v1 opens that form in a drawer;
   * rows without it keep the placeholder toast until their endpoint exists.
   */
  opensSettlementForm?: boolean;
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
   * Virtual accounts this platform can pay out to, in the order the currency
   * selector should offer them. Ids reference MOCK_VIRTUAL_ACCOUNTS, so the
   * account details shown here are the same ones Virtual Accounts renders
   * rather than a second copy that can drift.
   */
  accountIds: string[];
  /**
   * The platform's own marketplace per receiving account, keyed by account id —
   * `{ "us-usd": "amazon.com" }`.
   *
   * Where a platform runs a separate storefront per country, naming that
   * storefront tells the merchant which payout this currency is for better than
   * the currency code alone does. Plain text, deliberately not a link: it
   * identifies the marketplace, it isn't somewhere to navigate to from a
   * dropdown.
   *
   * Accounts with no entry fall back to their currency code, which is what a
   * region with no single storefront (the EU) wants — see
   * `accountOptionLabel`.
   */
  marketplaceLabels?: Record<string, string>;
  /**
   * The platform's storefronts, in the order the selector should offer them.
   *
   * Read by the Platforms page, whose selector picks a marketplace and derives
   * the account from it. Platforms v1 keeps picking an account directly through
   * `marketplaceLabels` above, which is why both exist: one storefront per
   * account there, several per account here.
   *
   * Absent on platforms that run a single storefront — the Platforms page then
   * renders no selector at all rather than a dropdown with one answer in it,
   * and the first entry in `accountIds` is the account.
   */
  marketplaces?: PlatformMarketplace[];
  /**
   * Whether the merchant picks which of those accounts to be paid into.
   *
   * Only true where the platform genuinely lets you choose the payout currency
   * per marketplace. Everywhere else the first entry in `accountIds` is the
   * account, and Platforms v1 renders no currency control at all rather than a
   * dropdown with one real answer in it.
   */
  offersCurrencyChoice?: boolean;
  steps: PlatformStep[];
  documents: PlatformDocument[];
}
