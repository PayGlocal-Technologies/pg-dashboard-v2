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
