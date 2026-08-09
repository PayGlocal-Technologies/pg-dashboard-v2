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
}

/** A payout platform a merchant can point a PayGlocal virtual account at. */
export interface Platform {
  /** Stable key — also the selected-row identity and the tutorial's remount key. */
  id: string;
  name: string;
  /** Registry icon name for the platform's brand mark. */
  logo: IconName;
  /**
   * Virtual accounts this platform can pay out to, in the order the currency
   * selector should offer them. Ids reference MOCK_VIRTUAL_ACCOUNTS, so the
   * account details shown here are the same ones Virtual Accounts renders
   * rather than a second copy that can drift.
   */
  accountIds: string[];
  steps: PlatformStep[];
  documents: PlatformDocument[];
}
