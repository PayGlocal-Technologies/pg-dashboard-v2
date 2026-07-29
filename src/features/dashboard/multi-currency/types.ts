/** One identifier row on a virtual account card (e.g. "ACH Routing" → "026073150"). */
export interface AccountDetail {
  label: string;
  value: string;
}

/** A single virtual receiving account in one of the supported countries. */
export interface VirtualAccount {
  /** Stable key — also used as the clipboard/share subject id. */
  id: string;
  /** ISO 3166-1 alpha-2 country code; drives the flag asset. */
  iso2: string;
  countryName: string;
  currency: string;
  /** Display name shown on the card, e.g. "USD Account". */
  accountName: string;
  /** Region-appropriate identifiers, rendered in order. */
  details: AccountDetail[];
}
